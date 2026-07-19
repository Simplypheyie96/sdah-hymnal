import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { EditionFile, Hymn, LangCode } from './hymns'

type EditionMap = Partial<Record<LangCode, Hymn[]>>

type HymnalContextValue = {
  /** English edition is loaded — the app is ready to leave the splash. */
  ready: boolean
  error: string | null
  editions: EditionMap
  /** Kick off loading an edition (no-op if loaded or in flight). */
  ensure: (lang: LangCode) => void
  hymnsFor: (lang: LangCode) => Hymn[]
  /** Find a song in an edition, following sdahRef across languages. */
  resolve: (songId: string, lang: LangCode) => Hymn | undefined
}

const HymnalContext = createContext<HymnalContextValue | null>(null)

// Module-level so a re-mounted provider (HMR, strict mode) never double-fetches.
const inflight = new Map<LangCode, Promise<Hymn[]>>()

async function fetchEdition(lang: LangCode): Promise<Hymn[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${lang}.json`)
  if (!res.ok) throw new Error(`Failed to load ${lang} hymnal (${res.status})`)
  const file = (await res.json()) as EditionFile
  return file.hymns
    .map((h) => ({ ...h, lang }))
    .sort((a, b) => a.number - b.number)
}

export function HymnalProvider({ children }: { children: ReactNode }) {
  const [editions, setEditions] = useState<EditionMap>({})
  const [error, setError] = useState<string | null>(null)

  const ensure = useCallback((lang: LangCode) => {
    if (inflight.has(lang)) return
    const p = fetchEdition(lang)
    inflight.set(lang, p)
    p.then(
      (hymns) => setEditions((prev) => (prev[lang] ? prev : { ...prev, [lang]: hymns })),
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

    const resolve = (songId: string, lang: LangCode) => {
      const list = editions[lang]
      if (!list) return undefined
      const direct = list.find((h) => h.songId === songId)
      if (direct) return direct
      const n = sdahNumberOf(songId)
      if (n == null) return undefined
      return lang === 'en'
        ? list.find((h) => h.number === n)
        : list.find((h) => h.sdahRef === n)
    }

    return { ready: Boolean(editions.en), error, editions, ensure, hymnsFor, resolve }
  }, [editions, error, ensure])

  return <HymnalContext.Provider value={value}>{children}</HymnalContext.Provider>
}

export function useHymnal(): HymnalContextValue {
  const ctx = useContext(HymnalContext)
  if (!ctx) throw new Error('useHymnal must be used inside <HymnalProvider>')
  return ctx
}
