// Converts a scraped `sdah_hymns.json` into public/data/en.json — the shape
// the app reads. Run it after producing that file:
//
//   node scripts/import-english.mjs path/to/sdah_hymns.json
//
// Accepts entries of the form:
//   { number, title, url, verses: [...],
//     section?, category?, subcategory? }
//
// `verses` may be an array of strings (one per verse) or of
// { lines: [...] } objects — both are handled. Entries without a category
// are kept and simply listed without a filter chip.

import { readFile, writeFile } from 'node:fs/promises'

const input = process.argv[2]
if (!input) {
  console.error('Usage: node scripts/import-english.mjs <sdah_hymns.json>')
  process.exit(1)
}

const OUT = new URL('../public/data/en.json', import.meta.url)
const raw = JSON.parse(await readFile(input, 'utf8'))
const entries = Array.isArray(raw) ? raw : (raw.hymns ?? [])

// Section by number, used when the source doesn't carry one.
const sectionFor = (n) =>
  n <= 695 ? 'Hymns' : n <= 844 ? 'Scripture Readings' : 'Liturgical Responses'

// Refrains are labelled inconsistently in scraped text; catch the common forms.
const REFRAIN = /^\s*(chorus|refrain)\b[:.\s-]*/i

function toVerses(verses) {
  if (!Array.isArray(verses)) return []
  return verses
    .map((v) => {
      const text = typeof v === 'string' ? v : Array.isArray(v?.lines) ? v.lines.join('\n') : ''
      const isRefrain = REFRAIN.test(text)
      const lines = text
        .replace(REFRAIN, '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      return lines.length ? { lines, ...(isRefrain ? { isRefrain: true } : {}) } : null
    })
    .filter(Boolean)
}

const hymns = entries
  .map((e) => {
    const number = Number(e.number)
    if (!Number.isFinite(number)) return null

    const verses = toVerses(e.verses)
    if (!verses.length) return null

    const section = e.section || sectionFor(number)

    return {
      number,
      songId: `sdah-${number}`,
      title: (e.title || '').trim() || `Hymn ${number}`,
      section,
      // null/undefined category is fine — the entry still lists and searches.
      category: e.category ?? '',
      ...(e.subcategory ? { subcategory: e.subcategory } : {}),
      kind: number <= 695 ? 'hymn' : 'reading',
      verses,
    }
  })
  .filter(Boolean)
  .sort((a, b) => a.number - b.number)

const file = {
  lang: 'en',
  hymnalTitle: 'Seventh-day Adventist Hymnal',
  hymns,
}

await writeFile(OUT, JSON.stringify(file, null, 1) + '\n')

const withCategory = hymns.filter((h) => h.category).length
const bySection = hymns.reduce((acc, h) => {
  acc[h.section] = (acc[h.section] ?? 0) + 1
  return acc
}, {})

console.log(`${hymns.length} entries written to public/data/en.json`)
console.log(`  categorised: ${withCategory}`)
for (const [section, n] of Object.entries(bySection)) console.log(`  ${section}: ${n}`)
