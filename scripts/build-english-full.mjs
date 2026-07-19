// Builds public/data/en.json from the sda-hymnal dataset published by
// Joshua Petitma at github.com/joshpetit/sda-hymnal (also on npm as
// `sda-hymnal`).
//
//   node scripts/build-english-full.mjs
//
// That project declares `"license": "MIT"` in package.json — the licence npm
// shows every consumer — and its README states the dataset is "free to use in
// any capacity". Attribution renders in Settings from the edition file, the
// same way the Yorùbá edition credits its source.
//
// Covers hymns 1–695 with the hymnal's own section names. Entries outside
// that range already in en.json (the 696–920 worship aids) are preserved.
//
// Requires the sqlite3 CLI.

import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DB_URL = 'https://raw.githubusercontent.com/joshpetit/sda-hymnal/master/data/hymns.db'
const OUT = new URL('../public/data/en.json', import.meta.url)
const INDEX = new URL('../public/data/sdah-index.json', import.meta.url)

const dir = await mkdtemp(join(tmpdir(), 'sdah-'))
const dbPath = join(dir, 'hymns.db')

const res = await fetch(DB_URL)
if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
await writeFile(dbPath, Buffer.from(await res.arrayBuffer()))

const query = (sql) => JSON.parse(execFileSync('sqlite3', ['-json', dbPath, sql], { encoding: 'utf8' }) || '[]')

const sections = new Map(query('SELECT _id, Title FROM Sections;').map((s) => [s._id, s.Title]))
const rows = query(`
  SELECT number, title, refrain, refrain2,
         verse1, verse2, verse3, verse4, verse5, verse6, verse7, section
  FROM Hymns ORDER BY number;
`)

// The hymnal's own numerical index is the authority on wording.
let officialTitle = new Map()
try {
  const index = JSON.parse(await readFile(INDEX, 'utf8'))
  officialTitle = new Map(Object.entries(index.titles).map(([n, t]) => [Number(n), t]))
} catch {
  /* index optional */
}

const toVerse = (text, isRefrain = false) => {
  const lines = String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return lines.length ? { lines, ...(isRefrain ? { isRefrain: true } : {}) } : null
}

const hymns = []
for (const r of rows) {
  const verseCols = [r.verse1, r.verse2, r.verse3, r.verse4, r.verse5, r.verse6, r.verse7]
  const verses = []

  verseCols.forEach((v, i) => {
    const verse = toVerse(v)
    if (!verse) return
    verses.push(verse)
    // Refrain sits after the first verse, the way it is sung.
    if (i === 0) {
      const refrain = toVerse(r.refrain, true)
      if (refrain) verses.push(refrain)
    }
  })

  // A second, different refrain (rare) closes the hymn.
  const refrain2 = toVerse(r.refrain2, true)
  if (refrain2) verses.push(refrain2)

  if (!verses.length) continue

  hymns.push({
    number: r.number,
    songId: `sdah-${r.number}`,
    title: officialTitle.get(r.number) ?? r.title,
    section: 'Hymns',
    category: sections.get(r.section) ?? '',
    kind: 'hymn',
    verses,
  })
}

// Keep the worship aids (696–920) already present.
let existing = { lang: 'en', hymnalTitle: 'Seventh-day Adventist Hymnal', hymns: [] }
try {
  existing = JSON.parse(await readFile(OUT, 'utf8'))
} catch {
  /* first run */
}
const kept = existing.hymns.filter((h) => h.number > 695)

const all = [...hymns, ...kept].sort((a, b) => a.number - b.number)

await writeFile(
  OUT,
  JSON.stringify(
    {
      lang: 'en',
      hymnalTitle: 'Seventh-day Adventist Hymnal',
      source: {
        name: 'sda-hymnal',
        url: 'https://github.com/joshpetit/sda-hymnal',
        license: 'MIT',
        author: 'Joshua Petitma',
      },
      hymns: all,
    },
    null,
    1,
  ) + '\n',
)

const withRefrain = hymns.filter((h) => h.verses.some((v) => v.isRefrain)).length
const missing = []
for (let n = 1; n <= 695; n++) if (!all.some((h) => h.number === n)) missing.push(n)

console.log(`Hymns 1–695 imported : ${hymns.length}`)
console.log(`  with a refrain     : ${withRefrain}`)
console.log(`Worship aids kept    : ${kept.length}`)
console.log(`en.json total        : ${all.length}`)
console.log(`Categories           : ${new Set(hymns.map((h) => h.category)).size}`)
if (missing.length) console.log(`Missing in 1–695     : ${missing.length} ${missing.slice(0, 10)}`)
