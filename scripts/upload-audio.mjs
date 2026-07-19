// Uploads the hymn recordings to Vercel Blob.
//
//   node scripts/upload-audio.mjs
//
// The mp3s are gitignored (~1 GB), so a build from a fresh clone — which is
// what Vercel does — has none of them. They live in Blob instead, and the app
// reaches them through VITE_AUDIO_BASE.
//
// Safe to re-run: anything already in the store at the right size is skipped,
// so an interrupted upload resumes rather than starting over.

import { list, put } from '@vercel/blob'
import { readFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const AUDIO_DIR = fileURLToPath(new URL('../public/audio/', import.meta.url))
const ENV = fileURLToPath(new URL('../.env.local', import.meta.url))
const PREFIX = 'audio/'
const CONCURRENCY = 8

// The token lives in .env.local, pulled from the linked project. Plain Node
// does not load that file, so read it here.
const token =
  process.env.BLOB_READ_WRITE_TOKEN ??
  (await readFile(ENV, 'utf8'))
    .split('\n')
    .find((l) => l.startsWith('BLOB_READ_WRITE_TOKEN='))
    ?.slice('BLOB_READ_WRITE_TOKEN='.length)
    .replace(/^"|"$/g, '')

if (!token) {
  console.error('No BLOB_READ_WRITE_TOKEN. Run: vercel env pull .env.local --yes')
  process.exit(1)
}

// What is already up there, so a re-run resumes.
const existing = new Map()
let cursor
do {
  const page = await list({ token, prefix: PREFIX, cursor, limit: 1000 })
  for (const b of page.blobs) existing.set(b.pathname, b.size)
  cursor = page.hasMore ? page.cursor : undefined
} while (cursor)
console.log(`${existing.size} already in the store`)

const files = (await readdir(AUDIO_DIR)).filter((f) => f.endsWith('.mp3')).sort()
const queue = []
for (const f of files) {
  const pathname = `${PREFIX}${f}`
  const size = (await stat(AUDIO_DIR + f)).size
  if (existing.get(pathname) !== size) queue.push({ f, pathname, size })
}

console.log(`${queue.length} to upload of ${files.length}\n`)
if (queue.length === 0) {
  console.log('Nothing to do.')
  process.exit(0)
}

let done = 0
let failed = 0
const started = Date.now()

async function worker() {
  for (;;) {
    const job = queue.shift()
    if (!job) return
    try {
      await put(job.pathname, await readFile(AUDIO_DIR + job.f), {
        access: 'public',
        token,
        addRandomSuffix: false, // URLs must stay predictable: audio/<number>.mp3
        allowOverwrite: true,
        contentType: 'audio/mpeg',
        cacheControlMaxAge: 31536000, // a year; the files never change
      })
    } catch (e) {
      failed += 1
      console.error(`  ✗ ${job.f}: ${e.message}`)
      continue
    }
    done += 1
    if (done % 25 === 0 || queue.length === 0) {
      const secs = (Date.now() - started) / 1000
      console.log(`  ${done} uploaded · ${queue.length} left · ${secs.toFixed(0)}s`)
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))

console.log(`\nUploaded ${done}, failed ${failed}, in ${((Date.now() - started) / 1000).toFixed(0)}s`)
process.exit(failed > 0 ? 1 : 0)
