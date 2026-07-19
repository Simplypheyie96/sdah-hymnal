// Fills public/data/en.json with public-domain hymn texts.
//
//   node scripts/build-english-pd.mjs
//
// Two sources, both openly distributable:
//
//   1. Open Hymnal Project (openhymnal.org) — a freely distributable database
//      of public-domain hymns. Each entry declares its own copyright status;
//      we take only the ones marked public domain.
//
//   2. The Yorùbá edition's SDAH cross-references, which give us verified
//      "SDAH number ↔ English title" pairs. Matching on those means hymn
//      numbers come from data rather than guesswork.
//
// Existing entries in en.json are preserved; this only fills gaps. A complete
// scraped edition dropped in via import-english.mjs supersedes all of it.

import { readFile, writeFile } from 'node:fs/promises'

const OPEN_HYMNAL = 'http://openhymnal.org/openhymnal.201406.xml'
const YORUBA = new URL('../public/data/yo.json', import.meta.url)
const OUT = new URL('../public/data/en.json', import.meta.url)

/** Loose key so "O Worship the King" matches "O Worship The King!". */
const key = (t) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|a|an|o|oh|ye|thy|thou)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const decode = (s) =>
  s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

const REFRAIN = /^\s*(refrain|chorus)\b[:.\s-]*/i

function parseOpenHymnal(xml) {
  const out = []
  const blocks = xml.matchAll(/<div3\b[^>]*>([\s\S]*?)<\/div3>/g)

  for (const [, body] of blocks) {
    const title = decode(body.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] ?? '').trim()
    if (!title) continue

    // Only take hymns the project itself marks public domain.
    if (!/copyright:\s*public domain/i.test(body)) continue

    const author = decode(body.match(/Words:\s*([^<.]+)/i)?.[1] ?? '').trim()

    const verses = []
    for (const [, raw] of body.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
      // Skip the attribution paragraph and the score image.
      if (/<i>|<img/i.test(raw)) continue

      const text = decode(raw).trim()
      if (!text) continue

      const isRefrain = REFRAIN.test(text)
      const cleaned = text.replace(REFRAIN, '').replace(/^\s*\d+\.\s*/, '')

      // The source runs each verse together as one paragraph. Hymn lines end
      // on punctuation and the next begins with a capital, which recovers the
      // original lineation; fall back to the raw run if that finds nothing.
      const lines = (cleaned.includes('\n')
        ? cleaned.split('\n')
        : cleaned.split(/(?<=[,;.:!?])\s+(?=["'“‘]?[A-Z])/)
      )
        .map((l) => l.trim())
        .filter(Boolean)

      if (lines.length) verses.push({ lines, ...(isRefrain ? { isRefrain: true } : {}) })
    }

    if (verses.length) out.push({ title, author, verses })
  }
  return out
}

// ——— Load sources ———
const xml = await fetch(OPEN_HYMNAL).then((r) => {
  if (!r.ok) throw new Error(`Open Hymnal fetch failed: ${r.status}`)
  return r.text()
})
const pd = parseOpenHymnal(xml)

const yoruba = JSON.parse(await readFile(YORUBA, 'utf8'))
const existing = JSON.parse(await readFile(OUT, 'utf8'))

// SDAH number ↔ English title pairs. The hymnal's own numerical index covers
// all 695 hymns; the Yorùbá cross-references fill in alternate titles the
// index doesn't list under. Lowest number wins on ties.
const sdahByTitle = new Map()
const addTitle = (title, number) => {
  const k = key(title)
  if (!k) return
  if (!sdahByTitle.has(k) || number < sdahByTitle.get(k)) sdahByTitle.set(k, number)
}

let officialTitle = new Map()
try {
  const index = JSON.parse(await readFile(new URL('../public/data/sdah-index.json', import.meta.url), 'utf8'))
  for (const [n, title] of Object.entries(index.titles)) {
    addTitle(title, Number(n))
    officialTitle.set(Number(n), title)
  }
} catch {
  console.warn('sdah-index.json missing — run scripts/build-sdah-index.mjs for full coverage')
}

for (const h of yoruba.hymns) {
  if (h.sdahRef && h.altTitle) addTitle(h.altTitle, h.sdahRef)
}

const taken = new Set(existing.hymns.map((h) => h.number))
const sectionFor = (n) =>
  n <= 695 ? 'Hymns' : n <= 844 ? 'Scripture Readings' : 'Liturgical Responses'

const added = []
for (const h of pd) {
  const number = sdahByTitle.get(key(h.title))
  if (!number || taken.has(number)) continue
  taken.add(number)
  added.push({
    number,
    songId: `sdah-${number}`,
    // Prefer the hymnal's own wording so the app matches the printed book.
    title: officialTitle.get(number) ?? h.title,
    section: sectionFor(number),
    category: '',
    kind: number <= 695 ? 'hymn' : 'reading',
    ...(h.author ? { author: h.author } : {}),
    verses: h.verses,
  })
}

const hymns = [...existing.hymns, ...added]
  .map((h) => {
    // Imported entries (no topical category) take the hymnal's own wording,
    // including ones added by an earlier run before the index existed.
    const official = officialTitle.get(h.number)
    return !h.category && official ? { ...h, title: official } : h
  })
  .sort((a, b) => a.number - b.number)
await writeFile(OUT, JSON.stringify({ ...existing, hymns }, null, 1) + '\n')

console.log(`Open Hymnal: ${pd.length} public-domain hymns parsed`)
console.log(`Verified SDAH title map: ${sdahByTitle.size} entries`)
console.log(`Matched and added: ${added.length}`)
console.log(`en.json now holds ${hymns.length} entries`)
