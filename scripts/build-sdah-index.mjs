// Builds public/data/sdah-index.json — the numerical index of the hymnal:
// number → title, for all 1–920.
//
//   node scripts/build-sdah-index.mjs
//
// This is catalogue metadata, not hymn text: the same number-and-title list
// printed in the back of the book. It exists so that any public-domain lyric
// source can be placed at the correct hymn number. Without it we can only
// number the ~271 hymns the Yorùbá edition happens to cross-reference.

import { writeFile } from 'node:fs/promises'

const RANGES = [
  '1-99', '100-199', '200-299', '300-399', '400-499',
  '500-599', '600-699', '700-799', '800-899', '900-999',
]
const BASE = 'https://adventisthymns.com/numbers'
const OUT = new URL('../public/data/sdah-index.json', import.meta.url)

const ENTRY = /(\d{1,3})\s*[–—-]\s*([^\n\]|]+)/g

const index = new Map()

for (const range of RANGES) {
  const url = `${BASE}/${range}`
  const res = await fetch(url, { headers: { 'User-Agent': 'sdah-hymnal-index/1.0' } })
  if (!res.ok) {
    console.warn(`  ! ${range}: ${res.status}`)
    continue
  }
  const html = await res.text()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')

  let found = 0
  for (const [, n, raw] of text.matchAll(ENTRY)) {
    const number = Number(n)
    if (number < 1 || number > 920) continue
    const title = raw.trim().replace(/\s+/g, ' ')
    if (!title || title.length < 2) continue
    if (!index.has(number)) {
      index.set(number, title)
      found++
    }
  }
  console.log(`  ${range}: ${found}`)
  await new Promise((r) => setTimeout(r, 300)) // be polite
}

const entries = [...index.entries()].sort((a, b) => a[0] - b[0])
await writeFile(
  OUT,
  JSON.stringify(
    { source: BASE, count: entries.length, titles: Object.fromEntries(entries) },
    null,
    1,
  ) + '\n',
)

const missing = []
for (let n = 1; n <= 920; n++) if (!index.has(n)) missing.push(n)
console.log(`\n${entries.length} of 920 indexed`)
if (missing.length) {
  console.log(`missing ${missing.length}: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' …' : ''}`)
}
