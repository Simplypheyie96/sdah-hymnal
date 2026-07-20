import { useEffect, type ReactNode } from 'react'
import { LANGS } from '../data/hymns'
import { useHymnal } from '../data/hymnal'
import { useOnline } from '../hooks/useOnline'
import { canCast } from '../lib/present'
import { InstallControls } from './Install'

export type ThemeChoice = 'light' | 'dark' | 'system'

const PORTFOLIO_URL = 'https://simplypheyie.is-a.dev/'
export type AccentChoice = 'mono' | 'sage' | 'rose' | 'sky'

const ACCENTS: { id: AccentChoice; label: string; swatch: string }[] = [
  { id: 'mono', label: 'Mono', swatch: 'linear-gradient(135deg, #f2f3f3 50%, #17191b 50%)' },
  { id: 'sage', label: 'Sage', swatch: 'linear-gradient(135deg, #dde8de 50%, #1e4632 50%)' },
  { id: 'rose', label: 'Rose', swatch: 'linear-gradient(135deg, #f5e0e4 50%, #7c2d42 50%)' },
  { id: 'sky', label: 'Sky', swatch: 'linear-gradient(135deg, #dce6f2 50%, #1f3a5f 50%)' },
]

// Install steps, one platform per row so a reader finds their own without
// wading through the others. The device you are on can usually install in a
// tap from the button above these — this is the fallback, and the reference.
const INSTALL_HELP: { title: string; body: string }[] = [
  {
    title: 'iPhone & iPad',
    // The option is not where people expect it: it sits down in the grey
    // action list, usually below the fold, and on some phones it has to be
    // switched on under "Edit Actions…" before it appears at all. Saying only
    // "tap Share, then Add to Home Screen" sends readers looking for something
    // they cannot see, and they conclude the app will not install.
    body: 'In Safari, tap the Share button, then scroll down the grey list of actions to “Add to Home Screen”. It is often below the fold, and on some phones you have to tap “Edit Actions…” at the bottom of that list to turn it on first. It has to be Safari — Chrome on an iPhone does not offer it.',
  },
  {
    title: 'Android',
    body: 'In Chrome, tap the ⋮ menu, then “Install app”.',
  },
  {
    title: 'Mac',
    body: 'Safari: File → “Add to Dock”. Chrome or Edge: the install icon at the right of the address bar.',
  },
  {
    title: 'Windows',
    body: 'In Chrome or Edge, click the install icon at the right of the address bar.',
  },
]

// Using the app — one short answer each.
const HOW_TO: { title: string; body: string }[] = [
  {
    title: 'Find a hymn',
    body: 'Type a title, a number, or a half-remembered line — “streams of mercy” finds 334. Tap No. for a keypad. The chips below the search box filter by section.',
  },
  {
    title: 'English and Yorùbá',
    body: 'Switch hymnals under the title, or from inside a hymn. Yorùbá hymns are searchable by their English names too. If a hymn is in only one hymnal, the app says so.',
  },
  {
    title: 'Save your favourites',
    body: 'Tap the heart on any hymn to keep it under Favourites. Hearted in one language, it stays hearted in the other.',
  },
  {
    title: 'Make it easier to read',
    body: 'Under Appearance: light or dark, four colour themes, and a lyrics-size slider. Larger text helps when the phone is on a music stand.',
  },
  {
    title: 'Play the music',
    body: 'Open a hymn and press play — the recording covers every verse. It downloads the first time, then works offline, so play what you need before Sabbath.',
  },
  {
    title: 'Share a verse',
    body: 'Tap share in a hymn, choose a verse and a colour, and send the picture anywhere. “Copy text” sends the plain words instead.',
  },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-6">
      <h2 className="px-1 pb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-3)]">
        {title}
      </h2>
      <div className="glass hairline overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
        {children}
      </div>
    </section>
  )
}

// A single accordion row. `group` gives the browser an exclusive set — opening
// one closes any other row sharing the same group, so only one stands open.
function Disclosure({ group, title, body }: { group: string; title: string; body: string }) {
  return (
    <details name={group} className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-[14.5px] font-medium">{title}</span>
        <span
          aria-hidden
          className="text-[var(--ink-3)] transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <p className="px-5 pb-5 text-[13.5px] leading-relaxed text-[var(--ink-2)]">{body}</p>
    </details>
  )
}

export function Settings({
  theme,
  onTheme,
  accent,
  onAccent,
  fontScale,
  onFontScale,
}: {
  theme: ThemeChoice
  onTheme: (t: ThemeChoice) => void
  accent: AccentChoice
  onAccent: (a: AccentChoice) => void
  fontScale: number
  onFontScale: (n: number) => void
}) {
  // Credit every edition whose data came from an outside source. Editions
  // load lazily, so make sure they are all present — otherwise a source goes
  // uncredited simply because the reader never opened that language.
  const { sources, ensure } = useHymnal()
  const online = useOnline()
  // Safari implements no part of the Presentation API, so the guidance has
  // to differ by device rather than describing a button that isn't there.
  const canCastHere = canCast()

  useEffect(() => {
    LANGS.filter((l) => l.available).forEach((l) => ensure(l.code))
  }, [ensure])
  const editionCredits = LANGS.flatMap((l) => {
    const source = sources[l.code]
    return source ? [{ ...source, hymnalTitle: l.hymnalTitle }] : []
  })

  return (
    <div className="space-y-9 pb-36">
      <header className="px-6 pt-[max(env(safe-area-inset-top),28px)]">
        <p className="rise-in pt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-3)]">
          Make it yours
        </p>
        <h1 className="rise-in font-lyrics mt-1.5 text-[44px] font-[350] leading-none tracking-[-0.02em]" style={{ animationDelay: '60ms' }}>
          Settings
        </h1>
      </header>

      <div className="rise-in" style={{ animationDelay: '120ms' }}>
        <Section title="Appearance">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[15px] font-medium">Theme</span>
            <div className="hairline flex rounded-full p-1">
              {(['light', 'system', 'dark'] as ThemeChoice[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onTheme(t)}
                  className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition-all duration-250 ${
                    theme === t ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'text-[var(--ink-3)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-[var(--line)] px-5 py-4">
            <span id="app-theme-label" className="text-[15px] font-medium">
              App theme
            </span>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
              Tints the paper and colours hymn numbers, titles, and verse marks.
            </p>
            {/* Grid (not flex-1) so the four options keep equal width and the
                selected ring is never clipped on narrow phones. */}
            <div
              role="radiogroup"
              aria-labelledby="app-theme-label"
              className="mt-3.5 grid grid-cols-4 gap-2"
            >
              {ACCENTS.map((a) => {
                const isActive = accent === a.id
                return (
                  <button
                    key={a.id}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => onAccent(a.id)}
                    className={`flex flex-col items-center gap-2 rounded-2xl px-1 py-3 transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--paper-raised)] shadow-[var(--shadow-soft)] ring-2 ring-[var(--accent)]'
                        : 'hairline hover:bg-[var(--paper-raised)]'
                    }`}
                  >
                    <span
                      aria-hidden
                      className="hairline h-7 w-7 rounded-full"
                      style={{ background: a.swatch }}
                    />
                    <span
                      className={`text-[11.5px] font-semibold ${
                        isActive ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'
                      }`}
                    >
                      {a.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="border-t border-[var(--line)] px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium">Lyrics size</span>
              <span className="text-[13px] tabular-nums text-[var(--ink-3)]">
                {Math.round(fontScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.6}
              step={0.05}
              value={fontScale}
              onChange={(e) => onFontScale(parseFloat(e.target.value))}
              aria-label="Lyrics size"
              className="mt-4 w-full accent-[var(--accent)]"
            />
            <div className="mt-4">
              <div className="eyebrow text-[var(--accent-ink)] opacity-70">Verse 1</div>
              <p
                className="font-lyrics mt-1.5 text-[var(--ink)]"
                style={{ fontSize: `${19 * fontScale}px` }}
              >
                Amazing grace! how sweet the sound…
              </p>
            </div>
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '160ms' }}>
        <Section title="Install the app">
          <InstallControls />
          <div className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {INSTALL_HELP.map((item) => (
              <Disclosure key={item.title} group="install-help" title={item.title} body={item.body} />
            ))}
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '200ms' }}>
        <Section title="How to use it">
          <div className="divide-y divide-[var(--line)]">
            {HOW_TO.map((item) => (
              <Disclosure key={item.title} group="howto" title={item.title} body={item.body} />
            ))}
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '240ms' }}>
        <Section title="Projecting & TV">
          <div className="divide-y divide-[var(--line)]">
            <div className="px-5 py-5">
              <p className="text-[14.5px] leading-relaxed text-[var(--ink-2)]">
                Open any hymn or reading and tap the screen icon — it fills the display verse by
                verse, made for church projectors. Arrow keys or a presentation clicker advance
                the lines.
              </p>
            </div>
            <div className="px-5 py-5">
              <p className="text-[13px] leading-relaxed text-[var(--ink-3)]">
                Sending it to a television depends on the device — both are below, since people
                pass phones around.
              </p>
              <div className="mt-4 space-y-3">
                <div className="hairline rounded-2xl px-4 py-3">
                  <p className="text-[12.5px] font-semibold text-[var(--accent-ink)]">
                    Android, Chrome, Edge {canCastHere && '· this device'}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">
                    Tap <span className="font-semibold">Cast</span> in the presenter and pick your
                    Chromecast or smart TV. The phone stays the remote.
                  </p>
                </div>
                <div className="hairline rounded-2xl px-4 py-3">
                  <p className="text-[12.5px] font-semibold text-[var(--accent-ink)]">
                    iPhone, iPad {!canCastHere && '· this device'}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">
                    Apple allows casting only from its own apps, so there is no Cast button here.
                    Use <span className="font-semibold">Control Centre → Screen Mirroring</span>,
                    pick your Apple TV, then open the hymn and tap the screen icon. AirPlay carries
                    the music across too.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '270ms' }}>
        <Section title="Offline">
          <div className="px-5 py-5">
            <p className="text-[14.5px] leading-relaxed text-[var(--ink-2)]">
              <span
                className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${
                  online ? 'bg-[var(--accent)]' : 'bg-[var(--ink-3)]'
                }`}
                aria-hidden
              />
              {online ? 'Connected' : 'No connection'} — all 920 hymns and readings work either
              way. Words, search, favourites, and projection need no signal once the app has been
              opened once.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink-3)]">
              Recordings are the exception: each downloads the first time you play it, then stays
              available offline. Play the hymns you need before Sabbath.
            </p>
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '300ms' }}>
        <Section title="About">
          <div className="px-5 py-5">
            <p className="text-[14.5px] leading-relaxed text-[var(--ink-2)]">
              The Seventh-day Adventist Hymnal — the 695 hymns <em>and</em> the calls to worship,
              invocations, scripture readings, and benedictions through No. 920 that most hymnal
              apps leave out — in English and Yorùbá.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink-3)]">
              Built with love by an Adventist, for Adventists.{' '}
              <a href="mailto:ajayifey@gmail.com" className="underline decoration-[var(--line-strong)] underline-offset-2 text-[var(--ink-2)]">
                Contact me
              </a>
              {' · '}
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-[var(--line-strong)] underline-offset-2 text-[var(--ink-2)]"
              >
                Portfolio ↗
              </a>
            </p>
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '330ms' }}>
        <Section title="Credits">
          <div className="divide-y divide-[var(--line)]">
            {editionCredits.map((c) => (
              <div key={c.url} className="px-5 py-4">
                <p className="text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                  {c.hymnalTitle} text from{' '}
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-[var(--line-strong)] underline-offset-2 text-[var(--ink)]"
                  >
                    {c.name}
                  </a>
                  {c.author ? ` by ${c.author}` : ''} — used under the {c.license} licence with
                  thanks.
                </p>
              </div>
            ))}
            <div className="px-5 py-4">
              <p className="text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                The responsive readings quote several Bible translations, as the printed hymnal
                does — NIV, NKJV, NASB, RSV, NEB, TEV, the Jerusalem Bible, the New Jewish Version,
                and the King James Version. Each reading names its source; all rights belong to
                their publishers.
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                Hymn recordings are provided for worship use and remain the property of their
                performers and publishers.
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                <span className="font-semibold text-[var(--ink)]">Help add a language.</span> Igbo
                and Hausa are not here yet. If you hold either Adventist hymnal — or your conference
                does — please get in touch and it will be added and credited.
              </p>
            </div>
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '360ms' }}>
        <Section title="Disclaimer">
          <div className="px-5 py-5">
            <p className="text-[13.5px] leading-relaxed text-[var(--ink-2)]">
              An independent, unofficial app. It is not published by, affiliated with, or endorsed
              by the General Conference of Seventh-day Adventists or its publishing houses.
            </p>
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '390ms' }}>
        <Section title="Copyright & privacy">
          <div className="divide-y divide-[var(--line)]">
            <div className="px-5 py-4">
              <p className="eyebrow text-[var(--ink-3)]">Copyright</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                Hymn and reading texts remain the property of their copyright holders, including the
                Review &amp; Herald Publishing Association. This app is a free worship aid for people
                who own the printed hymnal. Rights holders can reach me at the address above with any
                concern and I will respond promptly.
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="eyebrow text-[var(--ink-3)]">Privacy</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                This app collects nothing — no accounts, no analytics, no tracking. Your favourites
                and settings stay on your own device, and nothing you do here is sent anywhere.
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
