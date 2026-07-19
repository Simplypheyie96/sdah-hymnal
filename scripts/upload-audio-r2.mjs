// Uploads the hymn recordings to Cloudflare R2.
//
//   node scripts/upload-audio-r2.mjs
//
// Reads credentials from .env.local (gitignored) — never pass them on the
// command line, where they end up in shell history:
//
//   R2_ACCOUNT_ENDPOINT=https://<account>.r2.cloudflarestorage.com
//   R2_BUCKET=hymns
//   R2_ACCESS_KEY_ID=...
//   R2_SECRET_ACCESS_KEY=...
//
// Why R2 and not the Blob store this replaces: the recordings are 1.0 GB and
// Vercel Blob's free tier is 1 GB, so the library did not fit in its own
// allowance — at 100% Vercel stops serving the store for thirty days and the
// music goes silent. R2 gives 10 GB, and charges nothing for egress, which
// matters for a file people stream rather than download once.
//
// Safe to re-run: anything already there at the right size is skipped.

import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const AUDIO_DIR = fileURLToPath(new URL('../public/audio/', import.meta.url))
const ENV = fileURLToPath(new URL('../.env.local', import.meta.url))
const PREFIX = 'audio/'
const CONCURRENCY = 12

const env = Object.fromEntries(
  (await readFile(ENV, 'utf8'))
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
    }),
)

const need = ['R2_ACCOUNT_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
const missing = need.filter((k) => !env[k])
if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(', ')}`)
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto', // R2 has no regions; the SDK still insists on a value
  endpoint: env.R2_ACCOUNT_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})

// What is already there, so a re-run resumes rather than repeats.
const existing = new Map()
let token
do {
  const page = await s3.send(
    new ListObjectsV2Command({ Bucket: env.R2_BUCKET, Prefix: PREFIX, ContinuationToken: token }),
  )
  for (const o of page.Contents ?? []) existing.set(o.Key, o.Size)
  token = page.IsTruncated ? page.NextContinuationToken : undefined
} while (token)
console.log(`${existing.size} already in the bucket`)

const files = (await readdir(AUDIO_DIR)).filter((f) => f.endsWith('.mp3')).sort()
const queue = []
for (const f of files) {
  const key = `${PREFIX}${f}`
  const size = (await stat(AUDIO_DIR + f)).size
  if (existing.get(key) !== size) queue.push({ f, key })
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
      await s3.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET,
          Key: job.key,
          Body: await readFile(AUDIO_DIR + job.f),
          ContentType: 'audio/mpeg',
          CacheControl: 'public, max-age=31536000, immutable', // the files never change
        }),
      )
    } catch (e) {
      failed += 1
      console.error(`  ✗ ${job.f}: ${e.message}`)
      continue
    }
    done += 1
    if (done % 50 === 0 || queue.length === 0) {
      console.log(`  ${done} uploaded · ${queue.length} left · ${((Date.now() - started) / 1000).toFixed(0)}s`)
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))

console.log(`\nUploaded ${done}, failed ${failed}, in ${((Date.now() - started) / 1000).toFixed(0)}s`)
process.exit(failed > 0 ? 1 : 0)
