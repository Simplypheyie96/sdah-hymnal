import { useMemo, useState } from 'react'
import { CATEGORIES, LANGS, type Hymn, type LangCode } from '../data/hymns'
import { useHymnal } from '../data/hymnal'
import { SearchIcon } from './icons'

function HymnRow({
  hymn,
  onOpen,
  index,
  active,
}: {
  hymn: Hymn
  onOpen: (songId: string) => void
  index: number
  active?: boolean
}) {
  return (
    <button
      onClick={() => onOpen(hymn.songId)}
      className={`rise-in group flex w-full items-baseline gap-5 px-6 py-[18px] text-left transition-colors duration-200 hover:bg-[var(--paper-raised)] ${
        active ? 'bg-[var(--paper-raised)]' : ''
      }`}
      style={{ animationDelay: `${Math.min(index * 45, 400)}ms` }}
    >
      <span
        className={`font-lyrics w-12 shrink-0 text-right text-[22px] font-[250] tabular-nums transition-colors duration-200 group-hover:text-[var(--ink)] ${
          active ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'
        }`}
      >
        {hymn.number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium tracking-[-0.01em] text-[var(--ink)]">
          {hymn.title}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-[var(--ink-3)]">
          {hymn.kind === 'reading' ? 'Reading · ' : ''}
          {hymn.category}
        </span>
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
  const [category, setCategory] = useState<string | null>(null)

  const { hymnsFor } = useHymnal()
  const hymns = hymnsFor(lang)
  const activeHymnal = LANGS.find((l) => l.code === lang)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return hymns.filter((h) => {
      if (category && h.category !== category) return false
      if (!q) return true
      return h.number.toString().startsWith(q) || h.title.toLowerCase().includes(q)
    })
  }, [hymns, query, category])

  return (
    <div className="pb-36">
      {/* Masthead */}
      <header className="px-6 pt-[max(env(safe-area-inset-top),28px)]">
        <p className="rise-in pt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-3)]">
          Seventh-day Adventist
        </p>
        <h1 className="rise-in font-lyrics mt-1.5 text-[44px] font-[350] leading-none tracking-[-0.02em]" style={{ animationDelay: '60ms' }}>
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

      {/* Search */}
      <div className="rise-in sticky top-0 z-30 -mx-0 px-6 pt-6 pb-4" style={{ animationDelay: '120ms' }}>
        <label className="glass hairline flex items-center gap-3 rounded-2xl px-4.5 py-3.5 shadow-[var(--shadow-soft)] transition-shadow focus-within:shadow-[var(--shadow-float)]">
          <SearchIcon className="shrink-0 text-[var(--ink-3)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            inputMode="search"
            placeholder="Search by number or title"
            className="w-full bg-transparent text-[15.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[13px] font-medium text-[var(--ink-2)]"
            >
              Clear
            </button>
          )}
        </label>
      </div>

      {/* Categories */}
      <div className="rise-in flex gap-2 overflow-x-auto px-6 pb-2 pt-1 [scrollbar-width:none]" style={{ animationDelay: '180ms' }}>
        {[null, ...CATEGORIES].map((c) => {
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
              The {activeHymnal?.label} texts arrive as soon as their licensing is settled.
              Meanwhile every hymn is available in English — switch back above, or open any
              hymn and it will show the English words.
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
              <HymnRow key={h.songId} hymn={h} onOpen={onOpen} index={i} active={selected === h.songId} />
            ))}
          </div>
        )}
        {hymns.length > 0 && (
          <p className="px-6 pt-8 text-center text-[12px] leading-relaxed text-[var(--ink-3)]">
            {hymns.length} {activeHymnal?.label} entries · public-domain texts while licensing is
            in progress.
          </p>
        )}
      </div>
    </div>
  )
}
