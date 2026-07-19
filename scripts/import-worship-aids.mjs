// Fills the worship-aids section (696–920) from a scraped
// sdah_hymns_full.json.
//
//   node scripts/import-worship-aids.mjs /path/to/sdah_hymns_full.json
//
// Hymns 1–695 already come from the sda-hymnal dataset and are verified
// title-for-title against the hymnal's numerical index, so this only touches
// entries above 695 and leaves them alone.
//
// Reading entries look like:
//
//   Call to Worship          <- category header, sometimes present
//   845                      <- number
//   Psalm 29:1,2, NKJV       <- scripture reference
//   Give unto the Lord...    <- the text
//
// Scripture songs additionally carry an ALL-CAPS title line before the
// reference. Where there is no title we use the reference itself, which is
// how the printed hymnal identifies them.

import { readFile, writeFile } from 'node:fs/promises'

const input = process.argv[2]
if (!input) {
  console.error('Usage: node scripts/import-worship-aids.mjs <sdah_hymns_full.json>')
  process.exit(1)
}

const OUT = new URL('../public/data/en.json', import.meta.url)

// A scripture reference carries a chapter number and closes with a version
// abbreviation after a comma. Kept loose on purpose: real entries range from
// "John 15, NASB" to "Psalm 122:1; 118:24, RSV" to
// "Ecclesiastes 12, Proverbs 20, Psalm 119, Proverbs 3, and Psalm 103, NIV".
const looksLikeReference = (l) =>
  /\d/.test(l) && /,\s*[A-Za-z][A-Za-z.\s]{1,24}$/.test(l) && l.length < 120

const isAllCaps = (l) => /[A-Z]/.test(l) && l === l.toUpperCase() && !/^\d+$/.test(l)

/** The source splits emphasis brackets onto their own lines and leaves stray
 *  verse numbers in the body; neither belongs in a reading. */
function tidy(lines) {
  const out = []
  for (const raw of lines) {
    const l = raw.replace(/\t/g, ' ').trim()
    if (!l) continue
    if (/^\d{1,3}$/.test(l)) continue // stray verse number
    if (/^[[\]()]+$/.test(l)) continue // lone bracket
    // A line ending in an opening bracket continues into the next one.
    if (out.length && /[[(]$/.test(out[out.length - 1])) {
      out[out.length - 1] = `${out[out.length - 1]}${l}`
      continue
    }
    if (/^[\])]/.test(l) && out.length) {
      out[out.length - 1] = `${out[out.length - 1]}${l}`
      continue
    }
    out.push(l)
  }
  return out.map((l) => l.replace(/\s{2,}/g, ' ').trim()).filter(Boolean)
}

const titleCase = (s) =>
  s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Of|The|And|To|In|With|For|A|An|My|O)\b/g, (m, _p, i) => (i === 0 ? m : m.toLowerCase()))

function parseReading(number, lyrics, category) {
  const lines = lyrics.split('\n').map((l) => l.trim())
  let i = 0

  // Optional category header, then the number.
  if (lines[i] && !/^\d+$/.test(lines[i]) && lines[i].toLowerCase() === category.toLowerCase()) i++
  if (lines[i] === String(number)) i++
  while (lines[i] === '') i++

  let title = ''
  if (lines[i] && isAllCaps(lines[i]) && !looksLikeReference(lines[i])) {
    title = titleCase(lines[i])
    i++
  }

  let reference = ''
  if (lines[i] && looksLikeReference(lines[i])) {
    reference = lines[i]
    i++
  }

  const body = tidy(lines.slice(i))
  if (!body.length) return null


  // Without a proper title the reference names the reading, the way the
  // printed hymnal does — but then don't also repeat it underneath.
  const titledByReference = !title
  if (titledByReference) title = reference || `Reading ${number}`

  // Readings are read straight through; keep them as one block so the
  // presenter shows them whole rather than inventing stanza breaks.
  return {
    title,
    reference: titledByReference ? '' : reference,
    verses: [{ lines: body }],
  }
}

/**
 * Split a reading into leader and congregation parts.
 *
 * The printed hymnal alternates light and bold type; the source pages carry
 * that as <em> around the congregation's lines. A plain-text scrape loses it,
 * so this only runs when the entry also carries `lyrics_html`.
 *
 * To capture it, have the scraper keep the raw HTML of the lyrics block
 * alongside the text, as `lyrics_html`.
 */
function splitResponsive(html) {
  if (!html || !/<em[\s>]/i.test(html)) return null

  const parts = []
  // Alternate outside/inside <em>, preserving order.
  const chunks = html.split(/(<em[^>]*>[\s\S]*?<\/em>)/i)
  for (const chunk of chunks) {
    const isResponse = /^<em[\s>]/i.test(chunk)
    const lines = tidy(
      chunk
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&rsquo;/g, '’')
        .split('\n'),
    )
    if (lines.length) parts.push({ lines, ...(isResponse ? { isResponse: true } : {}) })
  }
  return parts.length > 1 ? parts : null
}

const rows = JSON.parse(await readFile(input, 'utf8'))
const existing = JSON.parse(await readFile(OUT, 'utf8'))

const keep = existing.hymns.filter((h) => h.number <= 695)
const added = []
const skipped = []
let responsiveCount = 0

for (const r of rows) {
  const n = Number(r.number)
  if (!Number.isFinite(n) || n <= 695) continue

  const parsed = parseReading(n, r.lyrics ?? '', r.category ?? '')
  if (!parsed) {
    skipped.push(n)
    continue
  }

  // Prefer the leader/congregation split when the source kept its markup.
  const responsive = splitResponsive(r.lyrics_html)
  if (responsive) {
    parsed.verses = responsive
    responsiveCount += 1
  }

  added.push({
    number: n,
    songId: `sdah-${n}`,
    title: parsed.title,
    section: 'Worship Aids',
    category: r.category ?? '',
    kind: 'reading',
    ...(parsed.reference ? { author: parsed.reference } : {}),
    verses: parsed.verses,
  })
}

added.sort((a, b) => a.number - b.number)
const hymns = [...keep, ...added].sort((a, b) => a.number - b.number)

await writeFile(OUT, JSON.stringify({ ...existing, hymns }, null, 1) + '\n')

const cats = added.reduce((acc, h) => ((acc[h.category] = (acc[h.category] ?? 0) + 1), acc), {})
const missing = []
for (let n = 1; n <= 920; n++) {
  if (n === 683) continue // does not exist in the hymnal
  if (!hymns.some((h) => h.number === n)) missing.push(n)
}

console.log(`Hymns 1–695 kept   : ${keep.length}`)
console.log(`Worship aids added : ${added.length}`)
for (const [c, n] of Object.entries(cats)) console.log(`    ${c}: ${n}`)
console.log(`en.json total      : ${hymns.length}`)
console.log(
  responsiveCount
    ? `Leader/response set: ${responsiveCount}`
    : 'Leader/response    : not available — add `lyrics_html` to the scrape to capture it',
)
if (skipped.length) console.log(`Skipped (no text)  : ${skipped.length} ${skipped.slice(0, 10)}`)
console.log(missing.length ? `Still missing      : ${missing.length} ${missing.slice(0, 10)}` : 'Complete: 1–920 (683 does not exist)')
