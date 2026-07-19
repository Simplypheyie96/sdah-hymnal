// Builds data-pipeline/out/en-readings.json for SDAH readings 696-920.
//
// COPYRIGHT-SAFE APPROACH: the 1985 SDA Hymnal's readings 696-920 cannot be
// reproduced verbatim (the compilation, and the many copyrighted Bible
// translations it draws from, are not public domain). We captured only
// FACTUAL METADATA from the source site (reading number, title, and the
// scripture reference such as "Psalm 46:1-3") into
// raw/readings-meta/readings-meta.json — never the reading body text.
//
// This script parses those scripture references and independently pulls the
// cited verses from the public-domain King James Version
// (raw/kjv/*.json, from github.com/aruljohn/Bible-kjv). The output is our
// own KJV-based rendering of each reading's passages, not a copy of the
// hymnal's typeset readings.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const META_PATH = path.join(__dirname, 'raw/readings-meta/readings-meta.json')
const KJV_DIR = path.join(__dirname, 'raw/kjv')
const OUT_PATH = path.join(__dirname, 'out/en-readings.json')

const START = 696
const END = 920

// ---------------------------------------------------------------------------
// KJV data
// ---------------------------------------------------------------------------
const BOOKS = JSON.parse(fs.readFileSync(path.join(KJV_DIR, 'Books.json'), 'utf8'))

const bibleData = new Map() // book -> Map(chapterNum -> Map(verseNum -> text))
for (const book of BOOKS) {
  const j = JSON.parse(fs.readFileSync(path.join(KJV_DIR, `${book}.json`), 'utf8'))
  const chapMap = new Map()
  for (const ch of j.chapters) {
    const verseMap = new Map()
    for (const v of ch.verses) verseMap.set(Number(v.verse), v.text)
    chapMap.set(Number(ch.chapter), verseMap)
  }
  bibleData.set(book, chapMap)
}

// ---------------------------------------------------------------------------
// Scripture-reference parsing
// ---------------------------------------------------------------------------
const ALIASES = new Map()
for (const b of BOOKS) ALIASES.set(b.toLowerCase(), b)
ALIASES.set('psalm', 'Psalms')
ALIASES.set('song of songs', 'Song of Solomon')
ALIASES.set('canticles', 'Song of Solomon')
ALIASES.set('revelations', 'Revelation')

// longest-first for greedy, non-overlapping matching
const BOOK_NAMES = [...ALIASES.keys()].sort((a, b) => b.length - a.length)

const SINGLE_CHAPTER_BOOKS = new Set(['Obadiah', 'Philemon', '2 John', '3 John', 'Jude'])

const VERSION_WORDS =
  '(?:NIV|RSV|KJV|NASB|NKJV|NEB|NJV|TEV|NLT|NIrV|NlV|N1V|Jerusalem|adapted)'

function stripVersionAndNotes(ref) {
  let body = ref.replace(/\([^)]*\)/g, ' ') // parentheticals, e.g. "(De Profundis)"
  body = body.trim().replace(/\.$/, '')
  const trailingVersion = new RegExp(`,?\\s*${VERSION_WORDS}\\.?\\s*$`, 'i')
  let prev
  do {
    prev = body
    body = body.replace(trailingVersion, '')
  } while (body !== prev)
  body = body.trim().replace(/,\s*$/, '').trim()
  body = body.replace(/\.$/, '').trim() // trailing period left after version strip
  return body
}

function fixOcrDigits(s) {
  // tokens made only of digits/letter-O (site OCR artifact, e.g. "1OO" -> "100")
  return s.replace(/\b[0-9O]+\b/g, (tok) => {
    if (/[0-9]/.test(tok) && /O/.test(tok)) return tok.replace(/O/g, '0')
    return tok
  })
}

function normalizeRomanNumeralBooks(s) {
  return s
    .replace(/\bIII\s+(John)\b/gi, '3 $1')
    .replace(/\bII\s+(Samuel|Kings|Chronicles|Corinthians|Thessalonians|Timothy|Peter|John)\b/gi, '2 $1')
    .replace(/\bI\s+(Samuel|Kings|Chronicles|Corinthians|Thessalonians|Timothy|Peter|John)\b/gi, '1 $1')
}

function preprocess(ref) {
  let body = stripVersionAndNotes(ref)
  body = normalizeRomanNumeralBooks(body)
  body = fixOcrDigits(body)
  return body
}

function findBookMatches(str) {
  const lower = str.toLowerCase()
  const matches = []
  let i = 0
  while (i < str.length) {
    if (i > 0 && /[a-z0-9]/i.test(str[i - 1])) {
      i++
      continue
    }
    let matched = false
    for (const name of BOOK_NAMES) {
      if (lower.startsWith(name, i)) {
        const end = i + name.length
        if (end < str.length && /[a-z]/i.test(str[end])) continue // partial word match
        matches.push({ start: i, end, canonical: ALIASES.get(name) })
        i = end // skip past the match, don't rescan inside it
        matched = true
        break
      }
    }
    if (!matched) i++
  }
  return matches
}

function parseNumberList(text) {
  // "5-7, 9" / "5 through 7 and 9" -> [{start:5,end:7},{start:9,end:9}]
  const cleaned = text.replace(/\band\b/gi, ',').replace(/\bthrough\b/gi, '-')
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean)
  const out = []
  for (const p of parts) {
    const range = p.match(/^(\d+)\s*-\s*(\d+)$/)
    if (range) {
      out.push({ start: Number(range[1]), end: Number(range[2]) })
      continue
    }
    const single = p.match(/^(\d+)$/)
    if (single) {
      out.push({ start: Number(single[1]), end: Number(single[1]) })
      continue
    }
    return null // unparseable token
  }
  return out.length ? out : null
}

// Parses the text following a book match, up to the next book match (or end
// of its semicolon-group). Returns a list of citations:
// { book, chapter, verses: null | [{start,end}, ...] }
// verses === null means "whole chapter".
function parseChunk(book, text) {
  const trimmed = text.trim().replace(/^,\s*/, '')

  if (SINGLE_CHAPTER_BOOKS.has(book)) {
    // e.g. "Jude 24, 25" / "3 John" -> verse numbers of the book's only chapter
    if (!trimmed) return [{ book, chapter: 1, verses: null }]
    const verseGroups = parseNumberList(trimmed)
    if (!verseGroups) return null
    return [{ book, chapter: 1, verses: verseGroups }]
  }
  if (!trimmed) return [{ book, chapter: 1, verses: null }] // book cited alone, no chapter given

  const colonIdx = text.indexOf(':')
  if (colonIdx === -1) {
    // chapter-only mode: every number here is a whole-chapter reference
    const groups = parseNumberList(text)
    if (!groups) return null
    const citations = []
    for (const g of groups) {
      for (let c = g.start; c <= g.end; c++) citations.push({ book, chapter: c, verses: null })
    }
    return citations
  }

  const before = text.slice(0, colonIdx).trim()
  const after = text.slice(colonIdx + 1).trim()
  const chapMatch = before.match(/(\d+)\s*$/)
  if (!chapMatch) return null
  const chapter = Number(chapMatch[1])
  const verseGroups = parseNumberList(after)
  if (!verseGroups) return null
  return [{ book, chapter, verses: verseGroups }]
}

function parseRef(rawRef) {
  const body = preprocess(rawRef)
  if (!body) return { ok: false, reason: 'empty-after-strip', body }

  const semiGroups = body.split(';').map((s) => s.trim()).filter(Boolean)
  if (!semiGroups.length) return { ok: false, reason: 'empty-semi-groups', body }

  let currentBook = null
  const citations = []
  for (const group of semiGroups) {
    const matches = findBookMatches(group)
    if (matches.length === 0) {
      if (!currentBook) return { ok: false, reason: 'no-book-found', body }
      const res = parseChunk(currentBook, group)
      if (!res) return { ok: false, reason: 'chunk-parse-failed', body }
      citations.push(...res)
      continue
    }
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i]
      const chunkEnd = i + 1 < matches.length ? matches[i + 1].start : group.length
      const chunkText = group.slice(m.end, chunkEnd)
      currentBook = m.canonical
      const res = parseChunk(currentBook, chunkText)
      if (!res) return { ok: false, reason: 'chunk-parse-failed', body }
      citations.push(...res)
    }
  }
  return { ok: true, citations, body }
}

// ---------------------------------------------------------------------------
// Resolve citations against the KJV text
// ---------------------------------------------------------------------------
function resolveCitation(cit) {
  const chapMap = bibleData.get(cit.book)
  if (!chapMap) return { ok: false, reason: `unknown book "${cit.book}"` }
  const verseMap = chapMap.get(cit.chapter)
  if (!verseMap) return { ok: false, reason: `${cit.book} has no chapter ${cit.chapter}` }

  const lines = []
  if (cit.verses === null) {
    for (let v = 1; v <= verseMap.size; v++) {
      if (!verseMap.has(v)) return { ok: false, reason: `${cit.book} ${cit.chapter}:${v} missing` }
      lines.push(verseMap.get(v))
    }
  } else {
    for (const g of cit.verses) {
      for (let v = g.start; v <= g.end; v++) {
        if (!verseMap.has(v)) return { ok: false, reason: `${cit.book} ${cit.chapter}:${v} missing` }
        lines.push(verseMap.get(v))
      }
    }
  }
  return { ok: true, lines }
}

function formatCitation(cit) {
  if (cit.verses === null) return `${cit.book} ${cit.chapter}`
  const spec = cit.verses
    .map((g) => (g.start === g.end ? `${g.start}` : `${g.start}-${g.end}`))
    .join(',')
  return `${cit.book} ${cit.chapter}:${spec}`
}

// ---------------------------------------------------------------------------
// Titles & categories
// ---------------------------------------------------------------------------
const SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on',
  'or', 'the', 'to', 'unto', 'with', 'thee', 'thy',
])

function titleCase(raw) {
  const words = raw.toLowerCase().split(/\s+/).filter(Boolean)
  return words
    .map((w, i) => {
      if (i !== 0 && i !== words.length - 1 && SMALL_WORDS.has(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

function categoryFor(number) {
  if (number >= 845 && number <= 880) return 'Call to Worship'
  if (number >= 881 && number <= 893) return 'Words of Assurance'
  if (number >= 894 && number <= 906) return 'Offertory Sentences'
  if (number >= 907 && number <= 920) return 'Benedictions'
  return 'Scripture Readings'
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'))
const metaByNumber = new Map(meta.results.map((r) => [r.number, r]))

const hymns = []
const unresolved = []

for (let number = START; number <= END; number++) {
  const entry = metaByNumber.get(number)
  const category = categoryFor(number)
  const songId = `sdah-${number}`

  if (!entry) {
    unresolved.push({ number, title: '', ref: '' })
    hymns.push({
      number, songId, title: '', kind: 'reading', category,
      author: '', rights: 'pd', verses: [],
    })
    continue
  }

  const rawTitle = (entry.title || '').trim()
  const parsed = parseRef(entry.ref || '')

  let resolvedVerses = []
  let resolutionFailed = !parsed.ok
  let failReason = parsed.ok ? null : parsed.reason

  if (parsed.ok) {
    for (const cit of parsed.citations) {
      const resolved = resolveCitation(cit)
      if (!resolved.ok) {
        resolutionFailed = true
        failReason = resolved.reason
        break
      }
      resolvedVerses.push({ lines: resolved.lines })
    }
  }

  const displayTitle = rawTitle ? titleCase(rawTitle) : ''
  const citationLabel = parsed.ok
    ? parsed.citations.map(formatCitation).join('; ')
    : (entry.ref || '').trim()

  if (resolutionFailed) {
    unresolved.push({ number, title: displayTitle || rawTitle, ref: entry.ref || '' })
    hymns.push({
      number, songId, title: displayTitle || `${category} — ${entry.ref || ''}`.trim(),
      kind: 'reading', category, author: '', rights: 'pd', verses: [],
    })
    continue
  }

  const title = displayTitle || `${category} — ${citationLabel}`
  const author = `${citationLabel} (KJV)`

  hymns.push({
    number,
    songId,
    title,
    kind: 'reading',
    category,
    author,
    rights: 'pd',
    verses: resolvedVerses,
  })
}

// ---------------------------------------------------------------------------
// Validate & write
// ---------------------------------------------------------------------------
if (hymns.length !== END - START + 1) {
  throw new Error(`expected ${END - START + 1} entries, got ${hymns.length}`)
}
const numbers = hymns.map((h) => h.number)
for (let i = 0; i < numbers.length; i++) {
  if (numbers[i] !== START + i) throw new Error(`gap/out-of-order at index ${i}: ${numbers[i]}`)
}

const output = { lang: 'en', hymns }
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2))

const resolvedCount = hymns.filter((h) => h.verses.length > 0).length
console.log(`Total entries: ${hymns.length} (696-920, no gaps)`)
console.log(`Resolved with full KJV text: ${resolvedCount}`)
console.log(`Unresolved (metadata only): ${unresolved.length}`)
if (unresolved.length) console.log(JSON.stringify(unresolved, null, 2))

for (const n of [696, 800, 920]) {
  const h = hymns.find((x) => x.number === n)
  console.log(`\n#${n}: ${h.title}`)
  console.log(`  author: ${h.author}`)
  const firstTwo = (h.verses[0]?.lines || []).slice(0, 2)
  for (const line of firstTwo) console.log(`  ${line}`)
}
