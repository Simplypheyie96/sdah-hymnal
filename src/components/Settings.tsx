import { useEffect, type ReactNode } from 'react'
import { LANGS } from '../data/hymns'
import { useHymnal } from '../data/hymnal'
import { useOnline } from '../hooks/useOnline'
import { canCast } from '../lib/present'

export type ThemeChoice = 'light' | 'dark' | 'system'

// ⚠️ Fill these in: your Buy Me a Coffee page and portfolio URL.
const PORTFOLIO_URL = 'https://simplypheyie.is-a.dev/'
export type AccentChoice = 'mono' | 'sage' | 'rose' | 'sky'

const ACCENTS: { id: AccentChoice; label: string; swatch: string }[] = [
  { id: 'mono', label: 'Mono', swatch: 'linear-gradient(135deg, #f2f3f3 50%, #17191b 50%)' },
  { id: 'sage', label: 'Sage', swatch: 'linear-gradient(135deg, #dde8de 50%, #1e4632 50%)' },
  { id: 'rose', label: 'Rose', swatch: 'linear-gradient(135deg, #f5e0e4 50%, #7c2d42 50%)' },
  { id: 'sky', label: 'Sky', swatch: 'linear-gradient(135deg, #dce6f2 50%, #1f3a5f 50%)' },
]

// Kept here rather than in a separate help screen: people look for this once,
// in Settings, and never again.
const HOW_TO: { title: string; body: string }[] = [
  {
    title: 'Keep it on your phone',
    body:
      'iPhone or iPad: open the app in Safari, tap the Share button, then “Add to Home Screen”. Android: open it in Chrome, tap the ⋮ menu, then “Install app”. It then opens full screen with its own icon, like any other app, and works without a signal.',
  },
  {
    title: 'Find a hymn',
    body:
      'Type a title, a number, or a line you half remember — “streams of mercy” finds 334. Tap No. for a keypad if you already know the number. The chips below the search box filter by section: Worship, Jesus Christ, Call to Worship, Benedictions and the rest.',
  },
  {
    title: 'English and Yorùbá',
    body:
      'Switch hymnals from the buttons under the title, or inside a hymn to see the same song in the other language. Yorùbá hymns are searchable by their English names too. If a hymn is not in one hymnal, the app says so rather than showing the wrong words.',
  },
  {
    title: 'Save the ones you sing often',
    body:
      'Tap the heart on any hymn and it appears under Favourites. A hymn hearted in one language stays hearted in the other.',
  },
  {
    title: 'Make it easier to read',
    body:
      'Above: Light, System or Dark, four colour themes, and a lyrics size slider. Larger text helps when the phone is on a music stand.',
  },
  {
    title: 'Play the music',
    body:
      'Open a hymn and press play. The recording covers every verse. It downloads the first time you play it and then works offline, so play the hymns you need before Sabbath. A ring around the button shows how far through it is.',
  },
  {
    title: 'Share a verse',
    body:
      'Tap the share icon in a hymn, choose which verse and one of four colours, then send the picture to WhatsApp, Instagram or anywhere else. “Copy text” sends the words as plain text instead.',
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

      <div className="rise-in" style={{ animationDelay: '200ms' }}>
        <Section title="How to use it">
          <div className="divide-y divide-[var(--line)]">
            {HOW_TO.map((item) => (
              <details key={item.title} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="text-[14.5px] font-medium">{item.title}</span>
                  <span
                    aria-hidden
                    className="text-[var(--ink-3)] transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                  {item.body}
                </p>
              </details>
            ))}
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '240ms' }}>
        <Section title="For churches & home worship">
          <div className="divide-y divide-[var(--line)]">
            <div className="px-5 py-5">
              <p className="text-[14.5px] leading-relaxed text-[var(--ink-2)]">
                Projecting for your congregation? Open any hymn or call to worship and tap
                the screen icon — it fills the display verse by verse, made for church
                projectors. Arrow keys or a presentation clicker advance the lines.
              </p>
            </div>
            <div className="px-5 py-5">
              <p className="text-[14.5px] leading-relaxed text-[var(--ink-2)]">
                <span className="font-semibold text-[var(--ink)]">Putting it on a TV.</span>{' '}
                Open a hymn and tap the screen icon. How it reaches the television
                depends on the device — both routes are below, since people share
                phones and read this on whichever is to hand.
              </p>

              <div className="mt-4 space-y-3">
                <div className="hairline rounded-2xl px-4 py-3">
                  <p className="text-[12.5px] font-semibold text-[var(--accent-ink)]">
                    Android, Chrome, Edge {canCastHere && '· this device'}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">
                    Tap <span className="font-semibold">Cast</span> in the presenter and
                    pick your Chromecast or smart TV. The television shows the words and
                    the phone stays the remote.
                  </p>
                </div>

                <div className="hairline rounded-2xl px-4 py-3">
                  <p className="text-[12.5px] font-semibold text-[var(--accent-ink)]">
                    iPhone, iPad {!canCastHere && '· this device'}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">
                    There is no Cast button here, and no app can add one — Apple allows
                    casting only from its own apps, so no website can offer it on iPhone
                    or iPad. Use{' '}
                    <span className="font-semibold">Control Centre → Screen Mirroring</span>,
                    pick your Apple TV or AirPlay screen, then open the hymn and tap the
                    screen icon. AirPlay carries the music across with the words.
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
              {online ? 'Connected' : 'No connection'} — all 920 hymns and readings work
              either way. The words, search, favourites, and projection need no signal
              once the app has been opened once.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink-3)]">
              Recordings are the exception: each one downloads the first time you play it,
              and then stays available offline. Play the hymns you need before Sabbath and
              they will be there without a signal.
            </p>
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '320ms' }}>
        <Section title="About">
          <div className="divide-y divide-[var(--line)]">
            <div className="px-5 py-5">
              <p className="text-[14.5px] leading-relaxed text-[var(--ink-2)]">
                The Seventh-day Adventist Hymnal — the 695 hymns <em>and</em> the calls to
                worship, invocations, scripture readings, and benedictions through No. 920
                that most hymnal apps leave out — in English and Yorùbá.
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
            <div className="px-5 py-5">
              <p className="eyebrow text-[var(--ink-3)]">Credits &amp; notices</p>
              <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                <li>
                  An independent, unofficial app. Not published by, affiliated with, or
                  endorsed by the General Conference of Seventh-day Adventists or its
                  publishing houses.
                </li>
                <li>
                  Hymn and reading texts remain the property of their respective copyright
                  holders, including the Review &amp; Herald Publishing Association for the
                  Seventh-day Adventist Hymnal. Provided here free of charge as a worship
                  aid for people who own the printed hymnal. Rights holders may reach me at
                  the address above with any concern and I will respond promptly.
                </li>
                <li>
                  The responsive readings quote several Bible translations, as the
                  printed hymnal does — NIV, NKJV, NASB, RSV, NEB, TEV, the Jerusalem
                  Bible, the New Jewish Version, and the King James Version. Each
                  reading names its own source, and all rights in those translations
                  belong to their publishers.
                </li>
                <li>
                  Hymn recordings are provided for worship use and remain the property
                  of their performers and publishers.
                </li>
                <li>
                  This app collects nothing. No accounts, no analytics, no tracking.
                  Your favourites and settings are stored only on your own device, and
                  nothing you do here is sent anywhere.
                </li>
                <li>
                  Igbo and Hausa are not yet included. Abụ Ọtụtọ, the Igbo
                  Adventist hymnal, exists only inside a closed Android app; no
                  Hausa Adventist hymnal appears to have been digitised at all.
                  If you hold either text — or your conference does — please get
                  in touch and it will be added and credited.
                </li>
                {editionCredits.map((c) => (
                  <li key={c.url}>
                    {c.hymnalTitle} text from{' '}
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-[var(--line-strong)] underline-offset-2 text-[var(--ink-2)]"
                    >
                      {c.name}
                    </a>
                    {c.author ? ` by ${c.author}` : ''} — used under the {c.license} licence
                    with thanks.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
