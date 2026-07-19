import type { ReactNode } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

// ⚠️ Fill these in: your Buy Me a Coffee page and portfolio URL.
const COFFEE_URL = 'https://buymeacoffee.com/YOUR-USERNAME'
const PORTFOLIO_URL = 'https://YOUR-PORTFOLIO-LINK'
export type AccentChoice = 'mono' | 'sage' | 'rose' | 'sky'

const ACCENTS: { id: AccentChoice; label: string; swatch: string }[] = [
  { id: 'mono', label: 'Mono', swatch: 'linear-gradient(135deg, #f2f3f3 50%, #17191b 50%)' },
  { id: 'sage', label: 'Sage', swatch: 'linear-gradient(135deg, #dde8de 50%, #1e4632 50%)' },
  { id: 'rose', label: 'Rose', swatch: 'linear-gradient(135deg, #f5e0e4 50%, #7c2d42 50%)' },
  { id: 'sky', label: 'Sky', swatch: 'linear-gradient(135deg, #dce6f2 50%, #1f3a5f 50%)' },
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
            <span className="text-[15px] font-medium">App theme</span>
            <div className="mt-3.5 flex gap-2.5">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onAccent(a.id)}
                  className={`hairline flex flex-1 flex-col items-center gap-2 rounded-2xl px-2 py-3 transition-all duration-200 ${
                    accent === a.id ? 'bg-[var(--paper-raised)] shadow-[var(--shadow-soft)]' : ''
                  }`}
                >
                  <span
                    className={`h-7 w-7 rounded-full ${
                      accent === a.id
                        ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--paper)]'
                        : 'hairline'
                    }`}
                    style={{ background: a.swatch }}
                  />
                  <span
                    className={`text-[12px] font-semibold ${
                      accent === a.id ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'
                    }`}
                  >
                    {a.label}
                  </span>
                </button>
              ))}
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
              className="mt-4 w-full accent-[var(--ink)]"
            />
            <p
              className="font-lyrics mt-4 text-[var(--ink-2)]"
              style={{ fontSize: `${19 * fontScale}px` }}
            >
              Amazing grace! how sweet the sound…
            </p>
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '180ms' }}>
        <Section title="Support this project">
          <div className="px-5 py-5">
            <p className="text-[14.5px] leading-relaxed text-[var(--ink-2)]">
              This hymnal is free and always will be. If it blesses your worship, you can
              buy me a coffee.
            </p>
            <a
              href={COFFEE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block w-full rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-center text-[14.5px] font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90"
            >
              ☕ Buy me a coffee
            </a>
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
                For family devotions, mirror your phone to the TV — AirPlay on Apple TV,
                Cast on Android, or an HDMI cable — then present a hymn and press play. The
                words fill the screen and the accompaniment plays through the TV, so
                everyone can sing along.
              </p>
            </div>
          </div>
        </Section>
      </div>

      <div className="rise-in" style={{ animationDelay: '300ms' }}>
        <Section title="About">
          <div className="divide-y divide-[var(--line)]">
            <div className="px-5 py-5">
              <p className="text-[14.5px] leading-relaxed text-[var(--ink-2)]">
                The Seventh-day Adventist Hymnal — the 695 hymns <em>and</em> the calls to
                worship, invocations, scripture readings, and benedictions through No. 920
                that most hymnal apps leave out — in English and Yorùbá, with Igbo and
                Hausa to come.
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">
                Licensing &amp; credits
              </p>
              <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                <li>
                  The Seventh-day Adventist Hymnal (1985) © Review &amp; Herald Publishing
                  Association. Ìwé Orin Mímọ́ © its respective church publishers. This is
                  an unofficial app, not endorsed by the General Conference.
                </li>
                <li>
                  A licensing agreement is being actively sought from the rights holders
                  (Pacific Press / Review &amp; Herald). Until granted, the app carries
                  public-domain hymn texts and scripture readings only.
                </li>
                <li>
                  Scripture quotations from the King James Version (public domain). Hymn
                  texts by their original authors, in the public domain.
                </li>
              </ul>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
