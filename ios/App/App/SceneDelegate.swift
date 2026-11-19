import UIKit
import WebKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = SafeSidesViewController(MainViewController())
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// In landscape, holds the app inside the side safe areas (the notch). In portrait the app
/// stays full-bleed; a status column down one edge (iPhone Duo) reaches the web as
/// env(safe-area-inset-right), and the web keeps only its top row clear of it.
/// The strips beside the app take the page's own background.
final class SafeSidesViewController: UIViewController {
    private let bridge: CAPBridgeViewController
    private var background: NSKeyValueObservation?
    private var full: [NSLayoutConstraint] = []
    private var safe: [NSLayoutConstraint] = []

    init(_ bridge: CAPBridgeViewController) {
        self.bridge = bridge
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    override func viewDidLoad() {
        super.viewDidLoad()
        addChild(bridge)
        let app: UIView = bridge.view
        app.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(app)
        NSLayoutConstraint.activate([
            app.topAnchor.constraint(equalTo: view.topAnchor),
            app.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        full = [app.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                app.trailingAnchor.constraint(equalTo: view.trailingAnchor)]
        safe = [app.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
                app.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor)]
        NSLayoutConstraint.activate(full)
        bridge.didMove(toParent: self)
        background = bridge.webView?.observe(\.underPageBackgroundColor, options: [.initial, .new]) { [weak self] webView, _ in
            self?.view.backgroundColor = webView.underPageBackgroundColor
        }
    }

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        let landscape = view.bounds.width > view.bounds.height
        if landscape != safe.first!.isActive {
            NSLayoutConstraint.deactivate(landscape ? full : safe)
            NSLayoutConstraint.activate(landscape ? safe : full)
        }
    }

    override var childForStatusBarStyle: UIViewController? { bridge }
    override var childForStatusBarHidden: UIViewController? { bridge }
    override var childForHomeIndicatorAutoHidden: UIViewController? { bridge }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { bridge.supportedInterfaceOrientations }
}

// MARK: - The app's own TV screen
//
// When the phone is connected to a TV, projector or monitor (AirPlay mirroring or
// a cable), iOS offers the app a scene on that screen. Instead of mirroring the
// phone, the app shows a landscape slide there: the bundled web app at ?tv
// (src/components/TvSlide.tsx). The presenter on the phone pushes each verse
// through the TvScreen plugin (src/lib/tv.ts), so the phone is the remote.

/// Registers the app's own plugins with the bridge.
final class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(TvScreenPlugin())
    }
}

/// Holds the TV screen, if one is connected, and the slide it should show.
final class TvHub {
    static let shared = TvHub()
    private(set) weak var screen: TvViewController?
    private(set) var slideJSON = "null"
    var onChange: ((Bool) -> Void)?
    var connected: Bool { screen != nil }

    func attach(_ s: TvViewController) { screen = s; onChange?(true) }
    func detach() { screen = nil; onChange?(false) }
    func show(_ json: String) { slideJSON = json; screen?.push(json) }
}

final class TvSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let tv = TvViewController()
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = tv
        window?.isHidden = false
        TvHub.shared.attach(tv)
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        TvHub.shared.detach()
        window = nil
    }
}

final class TvViewController: UIViewController, WKNavigationDelegate {
    private var web: WKWebView!

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: "capacitor")
        web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.backgroundColor = .black
        web.scrollView.isScrollEnabled = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.navigationDelegate = self
        view = web
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        web.load(URLRequest(url: URL(string: "capacitor://localhost/?tv")!))
    }

    func push(_ json: String) {
        web.evaluateJavaScript("window.__tvSlide=\(json);window.dispatchEvent(new Event('tvslide'))")
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        push(TvHub.shared.slideJSON)
    }
}

/// Serves the bundled web app (App/public) to the TV's web view.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root = Bundle.main.bundleURL.appendingPathComponent("public")
    private let types = ["html": "text/html; charset=utf-8", "js": "text/javascript; charset=utf-8",
                         "mjs": "text/javascript; charset=utf-8", "css": "text/css; charset=utf-8",
                         "json": "application/json", "svg": "image/svg+xml", "png": "image/png",
                         "woff2": "font/woff2", "woff": "font/woff", "txt": "text/plain; charset=utf-8"]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        let path = url.path.isEmpty || url.path == "/" ? "/index.html" : url.path
        var file = root.appendingPathComponent(path)
        if !FileManager.default.fileExists(atPath: file.path) { file = root.appendingPathComponent("index.html") }
        let data = (try? Data(contentsOf: file)) ?? Data()
        let type = types[file.pathExtension.lowercased()] ?? "application/octet-stream"
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                       headerFields: ["Content-Type": type, "Content-Length": "\(data.count)"])!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

@objc(TvScreenPlugin)
public class TvScreenPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TvScreenPlugin"
    public let jsName = "TvScreen"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
    ]

    public override func load() {
        TvHub.shared.onChange = { [weak self] on in
            self?.notifyListeners("change", data: ["connected": on])
        }
    }

    @objc func getState(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(["connected": TvHub.shared.connected]) }
    }

    @objc func show(_ call: CAPPluginCall) {
        var json = "null"
        if let slide = call.getObject("slide"),
           let data = try? JSONSerialization.data(withJSONObject: slide),
           let text = String(data: data, encoding: .utf8) { json = text }
        DispatchQueue.main.async {
            TvHub.shared.show(json)
            call.resolve()
        }
    }
}
