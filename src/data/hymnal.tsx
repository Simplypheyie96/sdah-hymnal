import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { EditionFile, EditionSource, Hymn, LangCode } from './hymns'

type EditionMap = Partial<Record<LangCode, Hymn[]>>
type SourceMap = Partial<Record<LangCode, EditionSource>>

type HymnalContextValue = {
  /** English edition is loaded — the app is ready to leave the splash. */
  ready: boolean
  error: string | null
  editions: EditionMap
  /** Attribution for each loaded edition, rendered in Settings › Credits. */
  sources: SourceMap
  /** Kick off loading an edition (no-op if loaded or in flight). */
  ensure: (lang: LangCode) => void
  hymnsFor: (lang: LangCode) => Hymn[]
  /** Find a song in an edition, following sdahRef across languages. */
  resolve: (songId: string, lang: LangCode) => Hymn | undefined
}

const HymnalContext = createContext<HymnalContextValue | null>(null)

// Module-level so a re-mounted provider (HMR, strict mode) never double-fetches.
const inflight = new Map<LangCode, Promise<LoadedEdition>>()

/** Loose title key for cross-edition matching: case, accents, punctuation and
 *  leading articles all vary between hymnals for the same song. */
function normaliseTitle(title: string) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining marks: Yorùbá tones, dots below
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\b(the|a|an|o|oh)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

type LoadedEdition = { hymns: Hymn[]; source?: EditionSource }

async function fetchEdition(lang: LangCode): Promise<LoadedEdition> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${lang}.json`)
  if (!res.ok) throw new Error(`Failed to load ${lang} hymnal (${res.status})`)
  const file = (await res.json()) as EditionFile
  return {
    source: file.source,
    hymns: file.hymns
      .map((h) => ({ ...h, lang }))
      .sort((a, b) => a.number - b.number),
  }
}

export function HymnalProvider({ children }: { children: ReactNode }) {
  const [editions, setEditions] = useState<EditionMap>({})
  const [sources, setSources] = useState<SourceMap>({})
  const [error, setError] = useState<string | null>(null)

  const ensure = useCallback((lang: LangCode) => {
    if (inflight.has(lang)) return
    const p = fetchEdition(lang)
    inflight.set(lang, p)
    p.then(
      ({ hymns, source }) => {
        setEditions((prev) => (prev[lang] ? prev : { ...prev, [lang]: hymns }))
        if (source) setSources((prev) => (prev[lang] ? prev : { ...prev, [lang]: source }))
      },
      (e: unknown) => {
        inflight.delete(lang) // allow retry on next ensure()
        setError(e instanceof Error ? e.message : String(e))
      },
    )
  }, [])

  useEffect(() => ensure('en'), [ensure])

  const value = useMemo<HymnalContextValue>(() => {
    const hymnsFor = (lang: LangCode) => editions[lang] ?? []

    // A songId names the same song in every edition: English ones are
    // "sdah-<n>"; other editions are "<lang>-<n>" and carry sdahRef.
    const sdahNumberOf = (songId: string): number | undefined => {
      const en = songId.match(/^sdah-(\d+)$/)
      if (en) return Number(en[1])
      const local = songId.match(/^([a-z]{2})-\d+$/)
      if (local) {
        return editions[local[1] as LangCode]?.find((h) => h.songId === songId)?.sdahRef
      }
      return undefined
    }

    // Find the source entry for a songId in whichever edition holds it.
    const entryOf = (songId: string) => {
      const lang = songId.match(/^([a-z]{2})-\d+$/)?.[1] as LangCode | undefined
      const list = lang ? editions[lang] : editions.en
      return list?.find((h) => h.songId === songId)
    }

    const resolve = (songId: string, lang: LangCode) => {
      const list = editions[lang]
      if (!list) return undefined

      const direct = list.find((h) => h.songId === songId)
      if (direct) return direct

      // Explicit cross-reference is the reliable path.
      const n = sdahNumberOf(songId)
      if (n != null) {
        const byNumber =
          lang === 'en'
            ? list.find((h) => h.number === n)
            : list.find((h) => h.sdahRef === n)
        if (byNumber) return byNumber
      }

      // Fallback for translations that ship an English title but no number
      // reference — match on the title itself. Roughly half the Yorùbá
      // hymnal reaches its English counterpart this way.
      const entry = entryOf(songId)
      const englishName = entry?.altTitle ?? (entry?.lang === 'en' ? entry.title : undefined)
      if (englishName) {
        const key = normaliseTitle(englishName)
        const byTitle = list.find(
          (h) =>
            normaliseTitle(h.title) === key ||
            (h.altTitle ? normaliseTitle(h.altTitle) === key : false),
        )
        if (byTitle) return byTitle
      }

      return undefined
    }

    return { ready: Boolean(editions.en), error, editions, sources, ensure, hymnsFor, resolve }
  }, [editions, sources, error, ensure])

  return <HymnalContext.Provider value={value}>{children}</HymnalContext.Provider>
}

export function useHymnal(): HymnalContextValue {
  const ctx = useContext(HymnalContext)
  if (!ctx) throw new Error('useHymnal must be used inside <HymnalProvider>')
  return ctx
}
