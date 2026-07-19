// Merges the pipeline outputs into the files the app serves:
//   out/en.json (hymns 1-695, PD-triaged)  +  out/en-readings.json (696-920, KJV)
//     -> public/data/en.json
//   out/yo.json (when licensed data lands) -> public/data/yo.json
//   out/ig.json / out/ha.json              -> public/data/{ig,ha}.json
// Run: node data-pipeline/merge.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = (f) => join(root, 'data-pipeline/out', f)
const pub = (f) => join(root, 'public/data', f)
const read = (p) => JSON.parse(readFileSync(p, 'utf8'))

function validate(hymns, label, expected) {
  const numbers = new Set(hymns.map((h) => h.number))
  const gaps = []
  for (let n = expected.from; n <= expected.to; n++) if (!numbers.has(n)) gaps.push(n)
  const empty = hymns.filter((h) => h.rights !== 'restricted' && !h.verses?.some((v) => v.lines?.some((l) => l?.trim())))
  console.log(
    `${label}: ${hymns.length} entries, ${gaps.length} gaps${gaps.length ? ` (${gaps.slice(0, 10).join(',')}…)` : ''}, ` +
      `${empty.length} unexpectedly empty${empty.length ? ` (${empty.slice(0, 5).map((h) => h.number).join(',')}…)` : ''}`,
  )
}

// English: hymns + readings
if (existsSync(out('en.json'))) {
  const en = read(out('en.json'))
  const readings = existsSync(out('en-readings.json')) ? read(out('en-readings.json')).hymns : []
  const hymns = [...en.hymns.filter((h) => h.number <= 695), ...readings].sort((a, b) => a.number - b.number)
  validate(hymns.filter((h) => h.number <= 695), 'en hymns', { from: 1, to: 695 })
  if (readings.length) validate(readings, 'en readings', { from: 696, to: 920 })
  writeFileSync(pub('en.json'), JSON.stringify({ lang: 'en', hymnalTitle: en.hymnalTitle, hymns }))
  const pd = hymns.filter((h) => h.rights === 'pd').length
  console.log(`public/data/en.json written: ${hymns.length} entries (${pd} public-domain, ${hymns.length - pd} other)`)
} else {
  console.log('skip en: data-pipeline/out/en.json not present')
}

// Other editions pass straight through when their cleared data exists.
for (const lang of ['yo', 'ig', 'ha']) {
  if (!existsSync(out(`${lang}.json`))) continue
  const ed = read(out(`${lang}.json`))
  ed.hymns.sort((a, b) => a.number - b.number)
  writeFileSync(pub(`${lang}.json`), JSON.stringify(ed))
  console.log(`public/data/${lang}.json written: ${ed.hymns.length} entries`)
}
