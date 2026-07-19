// Converts hymns written as markdown into an edition file the app reads.
//
//   node scripts/import-markdown.mjs <path> [--lang en] [--out en.json]
//
// <path> may be a single .md file holding many hymns, or a folder of .md
// files (one hymn each, or many — both work).
//
// The parser is deliberately forgiving, because hand-made and scraped
// markdown vary. It recognises:
//
//   Titles     # 1 - Praise to the Lord        ## 1. Praise to the Lord
//              # Hymn 1 — Praise to the Lord   # 1 Praise to the Lord
//
//   Verses     a lone number on its own line, or a line starting "1." / "1)"
//              or blank-line-separated blocks when no numbers are present
//
//   Refrains   a line beginning Refrain / Chorus / R: (case-insensitive)
//
// Anything it cannot place is reported rather than silently dropped, so you
// can see exactly what needs a second look.

import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const args = process.argv.slice(2)
const input = args.find((a) => !a.startsWith('--'))
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

if (!input) {
  console.error('Usage: node scripts/import-markdown.mjs <file-or-folder> [--lang en]')
  process.exit(1)
}

const lang = argOf('lang', 'en')
const outName = argOf('out', `${lang}.json`)
const OUT = new URL(`../public/data/${outName}`, import.meta.url)

const HYMNAL_TITLES = {
  en: 'Seventh-day Adventist Hymnal',
  yo: 'Ìwé Orin Mímọ́',
}

// ——— Read input ———
async function readAll(path) {
  const info = await stat(path)
  if (info.isFile()) return [await readFile(path, 'utf8')]
  const names = (await readdir(path)).filter((n) => ['.md', '.markdown', '.txt'].includes(extname(n)))
  names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return Promise.all(names.map((n) => readFile(join(path, n), 'utf8')))
}

const TITLE = /^\s{0,3}#{1,6}\s*(?:hymn\s*)?(\d{1,3})\s*(?:[-–—.:)]\s*|\s+)(.+?)\s*#*\s*$/i
// Only a standalone marker line ("Refrain", "Chorus:") or a marker with text
// after a colon. Matching bare "R" or any line merely starting with these
// words would swallow ordinary lyrics.
const REFRAIN_ONLY = /^\s*(refrain|chorus)\s*[:.]?\s*$/i
const REFRAIN_INLINE = /^\s*(refrain|chorus)\s*[:.]\s+(.+)$/i
const VERSE_NUM = /^\s*(\d{1,2})\s*[.)]?\s*$/
const VERSE_INLINE = /^\s*(\d{1,2})\s*[.)]\s+(.*)$/

function splitHymns(text) {
  const lines = text.split(/\r?\n/)
  const chunks = []
  let current = null
  for (const line of lines) {
    const m = line.match(TITLE)
    if (m) {
      if (current) chunks.push(current)
      current = { number: Number(m[1]), title: m[2].trim(), body: [] }
    } else if (current) {
      current.body.push(line)
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function parseVerses(body) {
  const verses = []
  let buf = []
  let refrain = false

  const flush = () => {
    const lines = buf.map((l) => l.trim()).filter(Boolean)
    if (lines.length) verses.push({ lines, ...(refrain ? { isRefrain: true } : {}) })
    buf = []
    refrain = false
  }

  let sawMarker = false
  for (const raw of body) {
    const line = raw.replace(/^\s*[>*-]\s?/, '') // strip quote/list decoration

    if (VERSE_NUM.test(line)) {
      flush()
      sawMarker = true
      continue
    }
    const inline = line.match(VERSE_INLINE)
    if (inline) {
      flush()
      sawMarker = true
      buf.push(inline[2])
      continue
    }
    const refrainInline = line.match(REFRAIN_INLINE)
    if (REFRAIN_ONLY.test(line) || refrainInline) {
      flush()
      sawMarker = true
      refrain = true
      if (refrainInline) buf.push(refrainInline[2].trim())
      continue
    }
    // Without explicit markers, a blank line separates verses.
    if (!line.trim()) {
      if (!sawMarker) flush()
      continue
    }
    buf.push(line)
  }
  flush()
  return verses
}

const sectionFor = (n) =>
  n <= 695 ? 'Hymns' : n <= 844 ? 'Scripture Readings' : 'Liturgical Responses'

// ——— Build ———
const texts = await readAll(input)
const chunks = texts.flatMap(splitHymns)

const byNumber = new Map()
const skipped = []

for (const c of chunks) {
  const verses = parseVerses(c.body)
  if (!verses.length) {
    skipped.push(`${c.number} ${c.title} — no verses found`)
    continue
  }
  if (byNumber.has(c.number)) {
    skipped.push(`${c.number} ${c.title} — duplicate number, kept the first`)
    continue
  }
  byNumber.set(c.number, {
    number: c.number,
    songId: lang === 'en' ? `sdah-${c.number}` : `${lang}-${c.number}`,
    title: c.title,
    section: sectionFor(c.number),
    category: '',
    kind: c.number <= 695 ? 'hymn' : 'reading',
    verses,
  })
}

// Keep anything already present that the markdown doesn't cover.
let existing = { lang, hymnalTitle: HYMNAL_TITLES[lang] ?? 'Hymnal', hymns: [] }
try {
  existing = JSON.parse(await readFile(OUT, 'utf8'))
} catch {
  /* first run for this edition */
}

const kept = existing.hymns.filter((h) => !byNumber.has(h.number))
const hymns = [...kept, ...byNumber.values()].sort((a, b) => a.number - b.number)

await writeFile(OUT, JSON.stringify({ ...existing, hymns }, null, 1) + '\n')

// ——— Report ———
const nums = [...byNumber.keys()].sort((a, b) => a - b)
const missing = []
for (let n = 1; n <= 920; n++) if (!hymns.some((h) => h.number === n)) missing.push(n)

console.log(`Parsed ${chunks.length} hymn blocks from ${texts.length} file(s)`)
console.log(`Imported ${byNumber.size} (${nums[0]}–${nums[nums.length - 1]})`)
console.log(`Kept ${kept.length} existing entries not covered by the markdown`)
console.log(`${outName} now holds ${hymns.length} entries`)
if (skipped.length) {
  console.log(`\nNeeds a look (${skipped.length}):`)
  for (const s of skipped.slice(0, 20)) console.log(`  ${s}`)
}
if (missing.length) {
  const preview = missing.slice(0, 15).join(', ')
  console.log(`\nStill missing ${missing.length} of 1–920: ${preview}${missing.length > 15 ? ' …' : ''}`)
}
