// Types and constants for the hymnal. The hymn data itself lives in
// /public/data/{lang}.json, fetched lazily — see hymnal.tsx for loading and
// cross-language resolution. Whatever an edition file contains is rendered in
// full; adding an edition is purely a matter of dropping in its JSON.
//
// Cross-language model: each hymnal edition (English SDAH, Yorùbá Ìwé Orin
// Mímọ́, Igbo Abụ Ọtụtọ, Hausa…) numbers its hymns differently. English
// songIds are "sdah-<number>"; other editions use "<lang>-<number>" plus an
// optional sdahRef pointing at the English number. Switching language follows
// that mapping, never the local number.

export type Verse = {
  lines: string[]
  isRefrain?: boolean
}

export type LangCode = 'en' | 'yo' | 'ig' | 'ha'

export const LANGS: {
  code: LangCode
  label: string
  hymnalTitle: string
  available: boolean
}[] = [
  { code: 'en', label: 'English', hymnalTitle: 'Seventh-day Adventist Hymnal', available: true },
  { code: 'yo', label: 'Yorùbá', hymnalTitle: 'Ìwé Orin Mímọ́', available: true },
  { code: 'ig', label: 'Igbo', hymnalTitle: 'Abụ Ọtụtọ', available: false },
  { code: 'ha', label: 'Hausa', hymnalTitle: 'Hausa Hymnal', available: false },
]

export type Hymn = {
  number: number
  lang: LangCode
  songId: string
  title: string
  category: string
  kind: 'hymn' | 'reading'
  verses: Verse[]
  author?: string
  year?: number
  /** English SDAH number this song corresponds to, for non-English editions. */
  sdahRef?: number
}

/** Shape of /public/data/{lang}.json */
export type EditionFile = {
  lang: LangCode
  hymnalTitle: string
  hymns: Omit<Hymn, 'lang'>[]
}

export const CATEGORIES = [
  'Worship',
  'Trinity',
  'God the Father',
  'Jesus Christ',
  'Holy Spirit',
  'Holy Scriptures',
  'Gospel',
  'Christian Church',
  'Doctrines',
  'Early Advent',
  'Christian Life',
  'Christian Home',
  'Special Occasions',
  'Aids to Worship',
  'Scripture Readings',
] as const

/** True when this entry carries text to render. */
export const canShowText = (h: Hymn) => h.verses.length > 0
