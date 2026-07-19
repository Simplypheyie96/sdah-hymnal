// One-off: export the in-repo sample HYMNS to per-language JSON so the app
// can switch to fetch()-based editions before the full datasets land.
import { createJiti } from 'jiti'
import { writeFileSync, mkdirSync } from 'node:fs'

const jiti = createJiti(import.meta.url)
const { HYMNS, LANGS } = await jiti.import('../src/data/hymns.ts')
mkdirSync('public/data', { recursive: true })
for (const { code, hymnalTitle } of LANGS) {
  const hymns = HYMNS.filter((h) => h.lang === code)
    .sort((a, b) => a.number - b.number)
    .map(({ lang, ...h }) => h)
  if (!hymns.length) continue
  writeFileSync(`public/data/${code}.json`, JSON.stringify({ lang: code, hymnalTitle, hymns }, null, 1))
  console.log(code, hymns.length, 'entries')
}
