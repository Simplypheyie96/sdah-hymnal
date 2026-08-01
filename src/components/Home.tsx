import { useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { LANGS, type Hymn, type LangCode } from '../data/hymns'
import { useHymnal } from '../data/hymnal'
import { KeypadIcon, SearchIcon } from './icons'
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
        className={`numeral numeral-list w-12 shrink-0 text-right text-[23px] transition-colors duration-200 ${
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
      {/* Masthead */}
      <header className="px-6 pt-[max(env(safe-area-inset-top),28px)]">
        <p className="rise-in eyebrow pt-8 text-[var(--accent-ink)] opacity-75">
          Seventh-day Adventist
        </p>
        <h1
          className="rise-in display-title mt-1.5 text-[44px] leading-none tracking-[-0.02em] text-[var(--accent-ink)]"
          style={{ animationDelay: '60ms' }}
        >
          {lang === 'en' ? 'Hymnal' : activeHymnal?.hymnalTitle}
        </h1>
        <div className="rise-in mt-4 flex gap-2" style={{ animationDelay: '90ms' }}>
          {LANGS.filter((l) => l.available).map((l) => (
            <button
              key={l.code}
              onClick={() => onLang(l.code)}
              title={l.hymnalTitle}
              className={`hairline rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-all duration-250 ${
                lang === l.code
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                  : 'glass text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      {/* Search: free text, plus a dedicated number field that jumps straight
          to a hymn. Both are always available. */}
      <div className="rise-in sticky top-0 z-30 px-6 pt-6 pb-4" style={{ animationDelay: '120ms' }}>
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
              className={`hairline shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-250 ${
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
