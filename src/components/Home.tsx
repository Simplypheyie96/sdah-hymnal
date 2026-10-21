import { useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { LANGS, type Hymn, type LangCode } from '../data/hymns'
import { useHymnal } from '../data/hymnal'
import { ArrowRightIcon, KeypadIcon, MusicIcon, SearchIcon, ShuffleIcon } from './icons'
import { PrototypeSwitcher, useVariant } from './prototype/PrototypeSwitcher'
import { NumberPad } from './NumberPad'

/** Strip case and diacritics so a phone keyboard without Yorùbá tone marks
 *  still finds Mímọ́ by typing "mimo". */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

function HymnRow({
  hymn,
  onOpen,
  index,
  active,
  query,
}: {
  hymn: Hymn
  onOpen: (songId: string) => void
  index: number
  active?: boolean
  query?: string
}) {
  // When a hymn matched on its words rather than its title, show the line
  // that matched — otherwise the result looks like it has nothing to do with
  // what was typed.
  const q = fold(query ?? '')
  const titleHit =
    !!q && (fold(hymn.title).includes(q) || (hymn.altTitle ? fold(hymn.altTitle).includes(q) : false))
  const lyricHit =
    q.length >= 3 && !titleHit
      ? hymn.verses.flatMap((v) => v.lines).find((l) => fold(l).includes(q))
      : undefined

  const subtitle =
    lyricHit || hymn.altTitle || hymn.subcategory || hymn.category || hymn.section || ''

  return (
    <button
      onClick={() => onOpen(hymn.songId)}
      className={`rise-in group flex w-full items-baseline gap-5 px-6 py-[18px] text-left transition-colors duration-200 hover:bg-[var(--paper-raised)] ${
        active ? 'bg-[var(--paper-raised)]' : ''
      }`}
      style={{ animationDelay: `${Math.min(index * 45, 400)}ms` }}
    >
      <span
        className={`numeral-list w-11 shrink-0 text-right text-[17px] transition-colors duration-200 ${
          active ? 'text-[var(--accent-ink)]' : 'text-[var(--ink-2)] group-hover:text-[var(--accent-ink)]'
        }`}
      >
        {hymn.number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium tracking-[-0.01em] text-[var(--ink)]">
          {hymn.title}
        </span>
        {subtitle && (
          <span
            className={`mt-0.5 block truncate text-[12.5px] ${
              lyricHit ? 'font-lyrics italic text-[var(--accent-ink)]' : 'text-[var(--ink-3)]'
            }`}
          >
            {lyricHit ? `“${subtitle}”` : subtitle}
          </span>
        )}
      </span>
    </button>
  )
}

// PROTOTYPE — three mastheads, ?variant=a|b|c.
const MASTHEADS = [
  { key: 'a', name: 'A · Hymn of the day' },
  { key: 'b', name: 'B · Title page' },
  { key: 'c', name: 'C · Greeting' },
]

function LangSwitch({ lang, onLang, segmented }: { lang: LangCode; onLang: (l: LangCode) => void; segmented?: boolean }) {
  return (
    <div className={segmented ? 'glass hairline inline-flex rounded-full p-1' : 'flex gap-2'}>
      {LANGS.filter((l) => l.available).map((l) => (
        <button
          key={l.code}
          onClick={() => onLang(l.code)}
          title={l.hymnalTitle}
          className={`tap-pad rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-all duration-250 ${segmented ? '' : 'hairline'} ${
            lang === l.code
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
              : `${segmented ? '' : 'glass'} text-[var(--ink-2)] hover:text-[var(--ink)]`
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

function greeting(d: Date) {
  const day = d.getDay(), h = d.getHours()
  if ((day === 5 && h >= 18) || (day === 6 && h < 18)) return 'Happy Sabbath'
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function Masthead({
  variant,
  hymns,
  lang,
  onLang,
  onOpen,
}: {
  variant: string
  hymns: Hymn[]
  lang: LangCode
  onLang: (l: LangCode) => void
  onOpen: (songId: string) => void
}) {
  const now = new Date()
  const title = lang === 'en' ? 'Hymnal' : LANGS.find((l) => l.code === lang)?.hymnalTitle
  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 864e5)
  const songs = hymns.filter((h) => h.kind === 'hymn')
  const today = songs.length ? songs[dayOfYear % songs.length] : undefined
  const pad = 'px-6 pt-[max(env(safe-area-inset-top),28px)]'

  if (variant === 'b')
    return (
      <header className={`${pad} flex flex-col items-center text-center`}>
        <span className="rise-in mt-8 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)]/12 text-[var(--accent-ink)]">
          <MusicIcon size={20} />
        </span>
        <p className="rise-in eyebrow mt-5 text-[var(--accent-ink)] opacity-75" style={{ animationDelay: '40ms' }}>
          Seventh-day Adventist
        </p>
        <h1
          className="rise-in display-title mt-2 text-balance text-[clamp(44px,16vw,64px)] leading-[0.95] tracking-[-0.02em] text-[var(--accent-ink)]"
          style={{ animationDelay: '60ms' }}
        >
          {title}
        </h1>
        <p className="rise-in font-lyrics mt-3 text-[15px] italic text-[var(--ink-2)]" style={{ animationDelay: '80ms' }}>
          {songs.length} hymns · {date}
        </p>
        <div className="rise-in mt-6" style={{ animationDelay: '90ms' }}>
          <LangSwitch lang={lang} onLang={onLang} segmented />
        </div>
      </header>
    )

  if (variant === 'c')
    return (
      <header className={pad}>
        <div className="rise-in flex items-center justify-between gap-4 pt-4">
          <span className="display-title truncate text-[22px] leading-none text-[var(--accent-ink)]">{title}</span>
          <LangSwitch lang={lang} onLang={onLang} segmented />
        </div>
        <p className="rise-in eyebrow mt-10 text-[var(--ink-2)]" style={{ animationDelay: '40ms' }}>
          {date}
        </p>
        <h1
          className="rise-in display-title mt-2 text-[40px] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]"
          style={{ animationDelay: '60ms' }}
        >
          {greeting(now)},
          <br />
          <em className="text-[var(--accent-ink)]">what shall we sing?</em>
        </h1>
        {today && (
          <button
            onClick={() => onOpen(songs[Math.floor(Math.random() * songs.length)].songId)}
            className="rise-in glass hairline mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-[var(--ink-2)] transition-colors hover:text-[var(--ink)]"
            style={{ animationDelay: '90ms' }}
          >
            <ShuffleIcon size={16} className="text-[var(--accent-ink)]" />
            Surprise me
          </button>
        )}
      </header>
    )

  return (
    <header className={pad}>
      <p className="rise-in eyebrow pt-8 text-[var(--accent-ink)] opacity-75">Seventh-day Adventist</p>
      <h1
        className="rise-in display-title mt-1.5 text-[44px] leading-none tracking-[-0.02em] text-[var(--accent-ink)]"
        style={{ animationDelay: '60ms' }}
      >
        {title}
      </h1>
      <div className="rise-in mt-4" style={{ animationDelay: '90ms' }}>
        <LangSwitch lang={lang} onLang={onLang} />
      </div>
      {today && (
        <button
          onClick={() => onOpen(today.songId)}
          className="rise-in glass hairline group mt-6 flex w-full items-center gap-5 rounded-3xl px-5 py-4 text-left shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-float)]"
          style={{ animationDelay: '110ms' }}
        >
          <span className="numeral w-14 shrink-0 text-center text-[48px] leading-none text-[var(--accent-ink)]">{today.number}</span>
          <span className="min-w-0 flex-1">
            <span className="eyebrow block text-[var(--ink-2)]">Hymn of the day</span>
            <span className="font-lyrics mt-1 block truncate text-[19px] text-[var(--ink)]">{today.title}</span>
          </span>
          <ArrowRightIcon className="shrink-0 text-[var(--accent-ink)] transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </header>
  )
}

export function Home({
  onOpen,
  selected,
  lang,
  onLang,
}: {
  onOpen: (songId: string) => void
  selected?: string | null
  lang: LangCode
  onLang: (l: LangCode) => void
}) {
  const [masthead, setMasthead] = useVariant(MASTHEADS.map((m) => m.key))
  const [query, setQuery] = useState('')
  const [padOpen, setPadOpen] = useState(false)
  const [category, setCategory] = useState<string | null>(null)

  const { hymnsFor } = useHymnal()
  const hymns = hymnsFor(lang)
  const activeHymnal = LANGS.find((l) => l.code === lang)

  // Filter chips come from the data, not a fixed list — an edition that ships
  // without a topical index simply shows none, and its hymns all still list.
  // Sections (Scripture Readings, Liturgical Responses) act as chips too, so
  // uncategorised entries stay reachable.
  const chips = useMemo(() => {
    const seen = new Map<string, number>()
    hymns.forEach((h, i) => {
      const key = h.category || h.section
      if (key && !seen.has(key)) seen.set(key, i)
    })
    return [...seen.keys()].sort((a, b) => seen.get(a)! - seen.get(b)!)
  }, [hymns])

  // Folded lyrics per hymn, built once per edition rather than per keystroke —
  // 920 hymns is far too much text to re-fold on every character.
  const lyricsIndex = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of hymns) {
      map.set(h.songId, fold(h.verses.flatMap((v) => v.lines).join(' ')))
    }
    return map
  }, [hymns])

  const results = useMemo(() => {
    const q = fold(query)
    return hymns.filter((h) => {
      if (category && h.category !== category && h.section !== category) return false
      if (!q) return true
      return (
        h.number.toString().startsWith(q) ||
        fold(h.title).includes(q) ||
        // Yorùbá hymns carry their English name, so either finds the song:
        // "mimo" and "holy" both reach Mímọ́, Mímọ́, Mímọ́.
        (h.altTitle ? fold(h.altTitle).includes(q) : false) ||
        // Half-remembered lines are how people actually look for a hymn.
        (q.length >= 3 && (lyricsIndex.get(h.songId)?.includes(q) ?? false))
      )
    })
  }, [hymns, query, category, lyricsIndex])


  return (
    <div className="pb-36">
      <PrototypeSwitcher variants={MASTHEADS} current={masthead} onChange={setMasthead} />
      <Masthead variant={masthead} hymns={hymns} lang={lang} onLang={onLang} onOpen={onOpen} />

      {/* Search: free text, plus a dedicated number field that jumps straight
          to a hymn. Both are always available. */}
      <div className="rise-in sticky top-[env(safe-area-inset-top)] z-30 px-6 pt-6 pb-4" style={{ animationDelay: '120ms' }}>
        <div aria-hidden className="top-scrim" />
        <div className="flex items-stretch gap-2.5">
          <label className="glass hairline group flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-3.5 shadow-[var(--shadow-soft)] transition-all duration-200 focus-within:shadow-[var(--shadow-float)] focus-within:ring-2 focus-within:ring-[var(--accent)]/30">
            <SearchIcon className="shrink-0 text-[var(--ink-3)] transition-colors group-focus-within:text-[var(--accent-ink)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              enterKeyHint="search"
              aria-label={`Search ${activeHymnal?.hymnalTitle ?? 'the hymnal'} by title, number, or words in the hymn`}
              placeholder="Search titles or words"
              className="w-full min-w-0 bg-transparent text-[15.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)] [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="shrink-0 rounded-full px-2 py-1 text-[13px] font-medium text-[var(--ink-2)] transition-colors hover:text-[var(--ink)]"
              >
                Clear
              </button>
            )}
          </label>

          <button
            onClick={() => setPadOpen(true)}
            aria-label="Open number keypad"
            className="glass hairline flex shrink-0 items-center gap-2 rounded-2xl px-4 shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--accent)]/8 active:scale-[0.97]"
          >
            <KeypadIcon className="text-[var(--accent-ink)]" />
            <span className="eyebrow text-[var(--ink-2)]">No.</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="rise-in flex gap-2 overflow-x-auto px-6 pb-2 pt-1 [scrollbar-width:none]" style={{ animationDelay: '180ms' }}>
        {[null, ...chips].map((c) => {
          const active = category === c
          return (
            <button
              key={c ?? 'all'}
              onClick={() => setCategory(active ? null : c)}
              className={`tap-pad hairline shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-250 ${
                active || (c === null && category === null)
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-soft)]'
                  : 'glass text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
            >
              {c ?? 'All'}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div className="mt-4">
        {hymns.length === 0 && !query && !category ? (
          <div className="px-8 py-20 text-center">
            <p className="font-lyrics text-[20px] leading-relaxed text-[var(--ink-2)]">
              {activeHymnal?.hymnalTitle} is on its way
            </p>
            <p className="mx-auto mt-3 max-w-[300px] text-[13.5px] leading-relaxed text-[var(--ink-3)]">
              This edition isn’t loaded yet. Every hymn is available in English — switch
              back above to keep singing.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <p className="font-lyrics text-[20px] text-[var(--ink-2)]">Nothing found</p>
            <p className="mt-2 text-[13.5px] text-[var(--ink-3)]">
              Try a hymn number (1–920) or part of a title.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {results.map((h, i) => (
              <HymnRow
                key={h.songId}
                hymn={h}
                onOpen={onOpen}
                index={i}
                active={selected === h.songId}
                query={query}
              />
            ))}
          </div>
        )}
        {hymns.length > 0 && (
          <p className="px-6 pt-8 text-center text-[12px] leading-relaxed text-[var(--ink-3)]">
            {hymns.length} entries · {activeHymnal?.hymnalTitle}
          </p>
        )}
      </div>

      <AnimatePresence>
        {padOpen && (
          <NumberPad
            hymns={hymns}
            hymnalTitle={activeHymnal?.hymnalTitle ?? 'Hymnal'}
            onOpen={onOpen}
            onDismiss={() => setPadOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
