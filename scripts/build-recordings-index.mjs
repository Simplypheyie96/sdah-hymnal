// Writes the manifest of which hymns actually have a recording.
//
//   node scripts/build-recordings-index.mjs
//
// The app used to answer "does this hymn have music?" with a HEAD request per
// hymn. That is a network round trip for every hymn opened, and — worse — it
// cannot tell a hymn that was never recorded apart from a hymn whose file is
// missing from the deployment. Both came back 404, so both were reported to
// the reader as "no recording for this hymn yet", which is how 691 missing
// files stayed invisible.
//
// With a manifest the two cases separate cleanly: not in the list means never
// recorded, in the list but unreachable means something is wrong with the
// hosting. See check-audio.mjs, which refuses to let the second case ship.

import { readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const AUDIO_DIR = fileURLToPath(new URL('../media/audio/', import.meta.url))
const OUT = fileURLToPath(new URL('../public/data/recordings.json', import.meta.url))

const files = await readdir(AUDIO_DIR)
const numbers = files
  .filter((f) => f.endsWith('.mp3'))
  .map((f) => Number(f.replace(/\.mp3$/, '')))
  .filter((n) => Number.isInteger(n) && n > 0)
  .sort((a, b) => a - b)

await writeFile(OUT, JSON.stringify(numbers))

console.log(`${numbers.length} recordings → public/data/recordings.json`)
