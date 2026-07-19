// Second public-domain pass, from hymnstogod.org.
//
//   FIRECRAWL_API_KEY=... node scripts/build-english-pd2.mjs
//
// Open Hymnal leans classical/Lutheran and misses the American gospel hymns
// the SDAH is full of — Crosby, Bliss, Hoffman, Sankey, Lowry. hymnstogod.org
// publishes those, each page stating its own copyright status.
//
// Only pages marked "Public Domain" are taken, and only where the title
// matches a known SDAH number, so every import lands at the right place.
// Existing entries are never overwritten.

import { readFile, writeFile } from 'node:fs/promises'

const KEY = process.env.FIRECRAWL_API_KEY
if (!KEY) {
  console.error('Set FIRECRAWL_API_KEY')
  process.exit(1)
}

const LIST = new URL('../.firecrawl/htg-list.md', import.meta.url)
const INDEX = new URL('../public/data/sdah-index.json', import.meta.url)
const YORUBA = new URL('../public/data/yo.json', import.meta.url)
const OUT = new URL('../public/data/en.json', import.meta.url)

const key = (t) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|a|an|o|oh|ye|thy|thou)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

async function scrape(url) {
  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['rawHtml'] }),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const json = await res.json()
  return json?.data?.rawHtml ?? ''
}

const strip = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;/g, '’')
    .replace(/&mdash;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

/** Verses live in <div id="Lyrics"> as one <p> each, lines split by <br>.
 *  The first two <p> are the title and byline. */
function parseLyrics(html, title) {
  if (!/Public Domain/i.test(html)) return null

  const block = html.match(/<div[^>]*id="Lyrics"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
  if (!block) return null

  const paras = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1])
  if (paras.length < 3) return null

  const author = strip(paras[1]).replace(/^by\s+/i, '').replace(/\s*\(.*\)\s*$/, '')

  const verses = []
  // A lone "Refrain" / "Chorus" paragraph labels the paragraph that follows.
  let nextIsRefrain = false

  for (const p of paras.slice(2)) {
    const lines = p
      .split(/<br\s*\/?>/i)
      .map(strip)
      .filter(Boolean)
    if (!lines.length) continue

    if (lines.length === 1 && /^(refrain|chorus)\b[:.]?$/i.test(lines[0])) {
      nextIsRefrain = true
      continue
    }

    // Or the marker may sit inline as the paragraph's first line.
    const inlineMarker = /^(refrain|chorus)\b[:.]?$/i.test(lines[0])
    const isRefrain = nextIsRefrain || inlineMarker
    nextIsRefrain = false

    verses.push({
      lines: inlineMarker ? lines.slice(1) : lines,
      ...(isRefrain ? { isRefrain: true } : {}),
    })
  }

  const kept = verses.filter((v) => v.lines.length >= 2)
  if (!kept.length) return null
  return { title, author, verses: kept }
}

// ——— Build the target list ———
const listMd = await readFile(LIST, 'utf8')
const links = [...listMd.matchAll(/\[([^\]]{2,80})\]\((https:\/\/hymnstogod\.org\/Hymns-PD\/[^)]+\.html)\)/g)]

const pdByKey = new Map()
for (const [, title, url] of links) {
  const k = key(title)
  if (k && !pdByKey.has(k)) pdByKey.set(k, { title, url })
}

const index = JSON.parse(await readFile(INDEX, 'utf8'))
const yoruba = JSON.parse(await readFile(YORUBA, 'utf8'))
const existing = JSON.parse(await readFile(OUT, 'utf8'))

const sdah = new Map()
for (const [n, t] of Object.entries(index.titles)) {
  const k = key(t)
  if (!sdah.has(k)) sdah.set(k, Number(n))
}
for (const h of yoruba.hymns) {
  if (!h.sdahRef || !h.altTitle) continue
  const k = key(h.altTitle)
  if (!sdah.has(k)) sdah.set(k, h.sdahRef)
}

const have = new Set(existing.hymns.map((h) => h.number))
const targets = []
for (const [k, entry] of pdByKey) {
  const number = sdah.get(k)
  if (number && !have.has(number)) targets.push({ number, ...entry })
}
targets.sort((a, b) => a.number - b.number)

console.log(`${targets.length} candidates to fetch\n`)

// ——— Fetch ———
const added = []
const failed = []
for (const t of targets) {
  try {
    const md = await scrape(t.url)
    const parsed = parseLyrics(md, index.titles[String(t.number)] ?? t.title)
    if (!parsed) {
      failed.push(`${t.number} ${t.title} — not public domain or unparseable`)
    } else {
      added.push({
        number: t.number,
        songId: `sdah-${t.number}`,
        title: parsed.title,
        section: 'Hymns',
        category: '',
        kind: 'hymn',
        ...(parsed.author ? { author: parsed.author } : {}),
        verses: parsed.verses,
      })
      console.log(`  ok ${t.number} ${parsed.title} (${parsed.verses.length} verses)`)
    }
  } catch (e) {
    failed.push(`${t.number} ${t.title} — ${e.message}`)
  }
  await new Promise((r) => setTimeout(r, 400))
}

const hymns = [...existing.hymns, ...added].sort((a, b) => a.number - b.number)
await writeFile(OUT, JSON.stringify({ ...existing, hymns }, null, 1) + '\n')

console.log(`\nAdded ${added.length}; en.json now holds ${hymns.length}`)
if (failed.length) {
  console.log(`\nSkipped ${failed.length}:`)
  for (const f of failed.slice(0, 15)) console.log(`  ${f}`)
}
