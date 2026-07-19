// Builds public/data/yo.json from the Ìwé Orin Mímọ́ dataset published by
// Fisayo Afolayan at github.com/fisayoafolayan/sdahymnalyorubaweb.
//
// That repository is MIT licensed and its README asks third-party apps to
// cache locally, bundle a copy, and credit the source — which is exactly what
// this script does. Attribution is rendered in Settings › Credits.
//
//   node scripts/build-yoruba.mjs
//
// Re-run to pick up upstream corrections.

import { writeFile } from 'node:fs/promises'

const SOURCE =
  'https://raw.githubusercontent.com/fisayoafolayan/sdahymnalyorubaweb/main/hymns.json'
const OUT = new URL('../public/data/yo.json', import.meta.url)

const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
const source = await res.json()

const hymns = source
  .map((h) => {
    const verses = (h.lyrics ?? [])
      .filter((b) => Array.isArray(b.lines) && b.lines.length)
      .map((b) => ({
        lines: b.lines,
        // "chorus" is the refrain; "call_response" is antiphonal and reads
        // best with the same indented treatment.
        ...(b.type === 'verse' ? {} : { isRefrain: true }),
      }))

    if (!verses.length) return null

    const sdahRef = h.references?.SDAH

    return {
      number: h.number,
      songId: `yo-${h.number}`,
      title: h.title,
      // Yorùbá titles are the primary label; the English title rides along so
      // search finds a hymn by either name.
      altTitle: h.english_title || undefined,
      category: '',
      kind: 'hymn',
      ...(sdahRef ? { sdahRef } : {}),
      verses,
    }
  })
  .filter(Boolean)
  .sort((a, b) => a.number - b.number)

const file = {
  lang: 'yo',
  hymnalTitle: 'Ìwé Orin Mímọ́',
  source: {
    name: 'SDA Hymnal Yorùbá',
    url: 'https://github.com/fisayoafolayan/sdahymnalyorubaweb',
    license: 'MIT',
    author: 'Fisayo Afolayan',
  },
  hymns,
}

await writeFile(OUT, JSON.stringify(file, null, 1) + '\n')

const mapped = hymns.filter((h) => h.sdahRef).length
console.log(`${hymns.length} Yorùbá hymns written (${mapped} mapped to SDAH numbers)`)
