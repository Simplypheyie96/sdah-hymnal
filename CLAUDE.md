# SDAH Hymnal

## Now
Task · Store apps (App Store + Google Play), branch claude/store-ab50bc. Not pushed. Rule: the web must stay pixel-identical to main; native-only changes go behind storeApp.
Done · Capacitor 8 shell, id com.feyidesigns.sdahymnal, name Hymnal. Native gates in src/lib/native.ts (storeApp): no SW, no analytics, no install UI, store tip jar (tip1/2/3 consumables $0.99/2.99/4.99). Safe areas: web CSS untouched; Android uses SystemBars insetsHandling 'native'. Web vs main pixelmatch: 0 px on every screen at 390 and 1440. iOS runs in the Simulator; Android assembleDebug builds.
Next · Blockers in docs/store/launch.md §0: hymn text + recording rights (Review and Herald), store name (SDA trademark), R2 CORS add capacitor://localhost + https://localhost. Then App Store Connect / Play Console steps in the same doc.
Files · capacitor.config.ts, src/lib/native.ts, src/components/TipJar.tsx, src/components/Settings.tsx, scripts/native-*.mjs, docs/store/launch.md
Open · Not checked: Cache API on iOS capacitor://, a real phone, tip purchase sheet, Android insets on a device. Build needs VITE_AUDIO_BASE exported (set -a; source .env.local). Android needs JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home and ANDROID_HOME=/opt/homebrew/share/android-commandlinetools.

## Decisions log
- 2026-10-24 · Web must be identical to live: all shared component/CSS edits from the store commit reverted (--st/--sr/--sb/--sl gone); Settings install section and privacy copy, tip jar, update prompt branch on storeApp. Android safe areas via SystemBars insetsHandling native. Verified 0 px pixelmatch vs main.
- 2026-10-24 · Store apps: tips are store consumables with no receipt check (no server; a tip unlocks nothing). Paystack, analytics, service worker and install prompt are web-only, gated on Capacitor.isNativePlatform(). Store name kept off "Seventh-day Adventist" pending a trademark check.
- 2026-10-22 · iPhone status bar showed a pale band with a blurred seam over tinted skies: theme-color was a fixed near-white. Now each look has --look-top (looks.css) and App.tsx syncStatusBar() copies it into theme-color as hex on theme/accent change. Yorùbá has no topical index, so its lone "All" chip row is hidden.
- 2026-10-22 · Search Console: property https://sdahymnal.vercel.app/ verified by HTML tag; sitemap submitted (first fetch "Couldn't fetch"); Request indexing rejected with Robots.txt unreachable on Googlebot only. Nothing changed on the site for it; retry after a day.
- 2026-10-22 · One link: sdah-hymnal.vercel.app kept attached as a 308 domain redirect, not removed (removing would 404 old links). Per-hymn prerendered pages + /hymn/N URLs added for search; static markup lives in #root and React replaces it on mount.
- 2026-10-22 · SEO: canonical domain is sdahymnal.vercel.app. Added <link rel=canonical>, public/robots.txt, public/sitemap.xml, and a permanent host redirect sdah-hymnal.vercel.app → sdahymnal.vercel.app in vercel.json. prototype/home-directions merged to main.
- 2026-10-22 · "For cover, let's do arc" meant the Arch variant (B) as the header, not an arched Cover edge; Cover removed, Arch in.
- 2026-10-22 · Header picked: Cover, with an arched lower edge (border-radius 50%/88px) instead of rounded corners; Arch, Book cover and the variant switcher removed. Surfaces behind text made near-opaque for readability: --glass .92 light / .9 dark, --paper-raised .92 light.
- 2026-10-22 · Header: Wordmark (too huge) and Lockup (not premium) rejected, and the header must read as its own region. New set: Cover, Arch, Book cover, all panels set apart from the list; .cover flips ink/accent tokens so the language switch inverts by itself.
- 2026-10-22 · Header: no added content (greeting, hymn of the day rejected); design only. Title page kept; Wordmark and Lockup replace the other two.
- 2026-10-22 · Looks picked: Mono Folded paper, Sage Olive branch, Rose Petals, Sky Cloud bank by day / Aurora by night. Top scrim was a paper slab visible at rest (read as a stray frame on tinted skies); now look-bg fixed + scroll-driven fade-in.
- 2026-10-22 · Looks legibility: secondary text darkened (light ink-2 32%/ink-3 38%, dark 87%/81%) and the darkest motifs softened (mono-1, sage-2, rose-3, sky-2 light); worst-case contrast over every motif peak now ≥4.89 on all 24 looks.
- 2026-10-22 · Looks: "same designs in different colors" rejected; each theme now gets its own three motifs, not shared recipes.
- 2026-10-21 · Icons: hand-drawn strokes ran to the 24px box edge and clipped; replaced with Remix (`KeypadIcon` = hashtag, `MusicOffIcon` = volume-mute, `PresentIcon` = slideshow-3).
