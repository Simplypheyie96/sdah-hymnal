// PROTOTYPE — throwaway. Three directions for Home's lead section (masthead,
// search, categories), switchable via ?variant= on the existing Home route.
// Lives only on the prototype/home-directions branch.
import { useMemo, useState } from 'react'
import { LANGS, type Hymn, type LangCode } from '../../data/hymns'
import { ChevronRightIcon, KeypadIcon, SearchIcon } from '../icons'

export type LeadProps = {
  hymns: Hymn[]
  chips: string[]
  category: string | null
  setCategory: (c: string | null) => void
  query: string
  setQuery: (q: string) => void
  openPad: () => void
  onOpen: (songId: string) => void
  lang: LangCode
  onLang: (l: LangCode) => void
  title: string
}

// Deterministic per calendar day, so everyone sees the same hymn today.
function useHymnOfDay(hymns: Hymn[]) {
  return useMemo(() => {
    const songs = hymns.filter((h) => h.kind === 'hymn')
    if (!songs.length) return undefined
    const d = new Date()
    const day = Math.floor((+d - +new Date(d.getFullYear(), 0, 0)) / 864e5)
    return songs[(day * 37) % songs.length]
  }, [hymns])
}

function useCounts(hymns: Hymn[]) {
  return useMemo(() => {
    const m = new Map<string, number>()
    for (const h of hymns) {
      const k = h.category || h.section
      if (k) m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [hymns])
}

function LangToggle({ lang, onLang, className = '' }: Pick<LeadProps, 'lang' | 'onLang'> & { className?: string }) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {LANGS.filter((l) => l.available).map((l) => (
        <button
          key={l.code}
          onClick={() => onLang(l.code)}
          className={`tap-pad hairline rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${
            lang === l.code ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'glass text-[var(--ink-2)]'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

function SearchField({ query, setQuery, className = '' }: Pick<LeadProps, 'query' | 'setQuery'> & { className?: string }) {
  return (
    <label className={`flex min-w-0 flex-1 items-center gap-3 ${className}`}>
      <SearchIcon className="shrink-0 text-[var(--ink-3)]" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        placeholder="Search titles or words"
        className="w-full min-w-0 bg-transparent text-[15.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)] [&::-webkit-search-cancel-button]:appearance-none"
      />
    </label>
  )
}

/* ——— A · Hymn board: number first ———
   The lead is a hymn-board plate: today's number set huge, with the number
   field built into the plate. Search and topics step back below it. */
export function LeadBoard(p: LeadProps) {
  const today = useHymnOfDay(p.hymns)
  return (
    <>
      <header className="px-6 pt-[max(env(safe-area-inset-top),28px)]">
        <div className="flex items-center justify-between pt-8">
          <p className="eyebrow text-[var(--accent-ink)] opacity-75">{p.lang === 'en' ? 'SDA Hymnal' : p.title}</p>
          <LangToggle lang={p.lang} onLang={p.onLang} />
        </div>

        {today && (
          <div className="hairline mt-5 rounded-[28px] bg-[var(--paper-raised)] p-2 shadow-[var(--shadow-soft)]">
            <button
              onClick={() => p.onOpen(today.songId)}
              className="flex w-full flex-col items-center rounded-[22px] px-6 pb-6 pt-5 text-center"
            >
              <span className="eyebrow text-[var(--ink-3)]">Hymn of the day</span>
              <span className="numeral mt-1 text-[96px] leading-none text-[var(--accent-ink)]">{today.number}</span>
              <span className="display-title mt-2 text-[22px] leading-tight text-[var(--ink)]">{today.title}</span>
              <span className="mt-1 text-[12.5px] text-[var(--ink-3)]">{today.category || today.section}</span>
            </button>
            <button
              onClick={p.openPad}
              className="flex w-full items-center justify-center gap-2.5 rounded-[22px] bg-[var(--accent)] py-4 text-[15px] font-semibold text-[var(--accent-contrast)]"
            >
              <KeypadIcon size={18} />
              Go to a hymn number
            </button>
          </div>
        )}
      </header>

      <div className="sticky top-[env(safe-area-inset-top)] z-30 px-6 pb-3 pt-5">
        <div aria-hidden className="top-scrim" />
        <div className="hairline glass flex items-center rounded-2xl px-4 py-3">
          <SearchField query={p.query} setQuery={p.setQuery} />
        </div>
      </div>

      <div className="flex gap-5 overflow-x-auto px-6 pb-1 pt-1 [scrollbar-width:none]">
        {[null, ...p.chips].map((c) => {
          const active = p.category === c
          return (
            <button
              key={c ?? 'all'}
              onClick={() => p.setCategory(active ? null : c)}
              className={`tap-pad shrink-0 py-2 text-[14px] ${
                active ? 'font-semibold text-[var(--accent-ink)]' : 'font-medium text-[var(--ink-3)]'
              }`}
            >
              {c ?? 'All'}
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ——— B · Contents page: book first ———
   A title page, then the topics laid out as a contents grid with counts.
   Search reads like an index line rather than an app field. */
export function LeadContents(p: LeadProps) {
  const counts = useCounts(p.hymns)
  const [allTopics, setAllTopics] = useState(false)
  const shown = allTopics ? p.chips : p.chips.slice(0, 6)
  return (
    <>
      <header className="px-6 pt-[max(env(safe-area-inset-top),28px)] text-center">
        <p className="eyebrow pt-10 text-[var(--ink-3)]">Seventh-day Adventist</p>
        <h1 className="display-title mt-3 text-[52px] leading-none tracking-[-0.02em] text-[var(--accent-ink)]">
          {p.lang === 'en' ? 'Hymnal' : p.title}
        </h1>
        <div className="mx-auto mt-5 flex items-center justify-center gap-3 text-[var(--ink-3)]">
          <span className="h-px w-10 bg-[var(--line-strong)]" />
          <span className="font-lyrics text-[15px] italic">{p.hymns.length} hymns &amp; readings</span>
          <span className="h-px w-10 bg-[var(--line-strong)]" />
        </div>
        <LangToggle lang={p.lang} onLang={p.onLang} className="mt-5 justify-center" />
      </header>

      <div className="sticky top-[env(safe-area-inset-top)] z-30 px-6 pb-2 pt-6">
        <div aria-hidden className="top-scrim" />
        <div className="flex items-center gap-3 border-b border-[var(--line-strong)] pb-3">
          <SearchField query={p.query} setQuery={p.setQuery} />
          <button onClick={p.openPad} className="numeral shrink-0 text-[17px] text-[var(--accent-ink)]">
            No. #
          </button>
        </div>
      </div>

      {p.chips.length > 0 && (
        <section className="px-6 pt-5">
          <p className="eyebrow text-[var(--ink-3)]">Contents</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {shown.map((c) => {
              const active = p.category === c
              return (
                <button
                  key={c}
                  onClick={() => p.setCategory(active ? null : c)}
                  className={`hairline flex min-h-[64px] flex-col justify-between rounded-2xl px-3.5 py-3 text-left ${
                    active ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-[var(--paper-raised)] text-[var(--ink)]'
                  }`}
                >
                  <span className="display-title text-[16px] leading-tight">{c}</span>
                  <span className={`numeral-list text-[12px] ${active ? 'opacity-80' : 'text-[var(--ink-3)]'}`}>
                    {counts.get(c)} hymns
                  </span>
                </button>
              )
            })}
          </div>
          {p.chips.length > 6 && (
            <button
              onClick={() => setAllTopics(!allTopics)}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-1 text-[13px] font-medium text-[var(--ink-2)]"
            >
              {allTopics ? 'Fewer topics' : `All ${p.chips.length} topics`}
            </button>
          )}
        </section>
      )}
    </>
  )
}

/* ——— C · Shelves: browse first ———
   Search is the hero; below it, horizontal shelves of accent-filled cards
   invite browsing before the full index. */
export function LeadShelves(p: LeadProps) {
  const today = useHymnOfDay(p.hymns)
  const shelves = useMemo(
    () =>
      p.chips.slice(0, 3).map((c) => ({
        name: c,
        items: p.hymns.filter((h) => h.category === c || h.section === c).slice(0, 8),
      })),
    [p.chips, p.hymns],
  )
  return (
    <>
      <header className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),28px)]">
        <h1 className="display-title pt-8 text-[34px] leading-none text-[var(--accent-ink)]">
          {p.lang === 'en' ? 'Hymnal' : p.title}
        </h1>
        <LangToggle lang={p.lang} onLang={p.onLang} className="pt-8" />
      </header>
      <div className="sticky top-[env(safe-area-inset-top)] z-30 px-6 pb-4 pt-5">
        <div aria-hidden className="top-scrim" />
        <div className="flex items-center gap-2.5 rounded-[20px] bg-[var(--accent)] p-1.5 pl-4 text-[var(--accent-contrast)] shadow-[var(--shadow-float)]">
          <SearchIcon className="shrink-0 opacity-70" />
          <input
            value={p.query}
            onChange={(e) => p.setQuery(e.target.value)}
            type="search"
            placeholder="Find a hymn by name or line"
            className="w-full min-w-0 bg-transparent py-3 text-[16px] outline-none placeholder:text-[var(--accent-contrast)] placeholder:opacity-60 [&::-webkit-search-cancel-button]:appearance-none"
          />
          <button
            onClick={p.openPad}
            aria-label="Open number keypad"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--accent-contrast)] text-[var(--accent-ink)]"
          >
            <KeypadIcon size={18} />
          </button>
        </div>
      </div>

      {!p.query && (
        <div className="space-y-7 pt-3">
          {today && (
            <button
              onClick={() => p.onOpen(today.songId)}
              className="hairline mx-6 flex w-[calc(100%-48px)] items-center gap-4 rounded-3xl bg-[var(--paper-raised)] p-4 text-left"
            >
              <span className="numeral flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[28px] text-[var(--accent-contrast)]">
                {today.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="eyebrow block text-[var(--ink-3)]">Today</span>
                <span className="display-title mt-1 block truncate text-[19px] text-[var(--ink)]">{today.title}</span>
              </span>
              <ChevronRightIcon className="shrink-0 text-[var(--ink-3)]" size={20} />
            </button>
          )}
          {shelves.map((s) => (
            <section key={s.name}>
              <div className="flex items-baseline justify-between px-6">
                <h2 className="display-title text-[20px] text-[var(--ink)]">{s.name}</h2>
                <button onClick={() => p.setCategory(s.name)} className="tap-pad text-[13px] font-medium text-[var(--ink-2)]">
                  See all
                </button>
              </div>
              <div className="mt-3 flex gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none]">
                {s.items.map((h) => (
                  <button
                    key={h.songId}
                    onClick={() => p.onOpen(h.songId)}
                    className="hairline flex h-[132px] w-[124px] shrink-0 flex-col justify-between rounded-[20px] bg-[var(--paper-raised)] p-3.5 text-left"
                  >
                    <span className="numeral text-[30px] leading-none text-[var(--accent-ink)]">{h.number}</span>
                    <span className="line-clamp-3 text-[13.5px] font-medium leading-snug text-[var(--ink)]">{h.title}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          <p className="eyebrow px-6 pt-2 text-[var(--ink-3)]">{p.category ?? 'Every hymn'}</p>
        </div>
      )}
    </>
  )
}
