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

export type LangCode = 'en' | 'yo'

export const LANGS: {
  code: LangCode
  label: string
  hymnalTitle: string
  available: boolean
}[] = [
  { code: 'en', label: 'English', hymnalTitle: 'Seventh-day Adventist Hymnal', available: true },
  { code: 'yo', label: 'Yorùbá', hymnalTitle: 'Ìwé Orin Mímọ́', available: true },
]

export type Hymn = {
  number: number
  lang: LangCode
  songId: string
  title: string
  /** Title in another language (e.g. the English name of a Yorùbá hymn). */
  altTitle?: string
  /** Broad grouping: "Hymns", "Scripture Readings", "Liturgical Responses". */
  section?: string
  /** Major theme from the topical index. Empty for uncategorised entries —
      they still list and search normally, just without a filter chip. */
  category: string
  /** Finer group within the category, e.g. "Adoration and Praise". */
  subcategory?: string
  kind: 'hymn' | 'reading'
  verses: Verse[]
  author?: string
  year?: number
  /** English SDAH number this song corresponds to, for non-English editions. */
  sdahRef?: number
}

/** Where an edition's text came from, credited in Settings. */
export type EditionSource = {
  name: string
  url: string
  license: string
  author?: string
}

/** Shape of /public/data/{lang}.json */
export type EditionFile = {
  lang: LangCode
  hymnalTitle: string
  source?: EditionSource
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
