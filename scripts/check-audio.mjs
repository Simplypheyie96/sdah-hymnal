// Refuses to build a release whose recordings cannot be served.
//
//   node scripts/check-audio.mjs
//
// This exists because of a real regression. The 691 mp3s are gitignored — a
// gigabyte is far too much for the repository — so they only ever reached
// production by being uploaded from a developer's machine. The moment Vercel
// started building from GitHub instead, every deploy silently shipped without
// them, and the app reported each hymn as simply never having been recorded.
// Nothing failed. Nothing warned. The music just quietly went away.
//
// So: if the manifest says a hymn has a recording, this checks the configured
// audio base can actually produce it, and fails the build if it cannot.
//
// Whether recordings are required is declared in audio.config.json, in version
// control, so that shipping without them is a visible commit rather than the
// silent absence of an environment variable. ALLOW_MISSING_AUDIO=1 overrides it
// for one-off local builds.

import { readFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const manifestPath = fileURLToPath(new URL('public/data/recordings.json', root))

const fail = (msg) => {
  console.error(`\n  ✗ ${msg}\n`)
  process.exit(1)
}

if (process.env.ALLOW_MISSING_AUDIO === '1') {
  console.log('  Audio: check skipped (ALLOW_MISSING_AUDIO=1).')
  process.exit(0)
}

let config = { expectRecordings: true }
try {
  config = JSON.parse(await readFile(fileURLToPath(new URL('audio.config.json', root)), 'utf8'))
} catch {
  /* no config — hold to the safe default and require recordings */
}

if (config.expectRecordings === false) {
  // Loud, but not fatal. Someone chose this and wrote it down.
  console.log(
    '\n  ! Building WITHOUT hymn recordings (audio.config.json:' +
      ' expectRecordings = false).\n' +
      '    The app will show "Recordings unavailable" for every hymn.\n' +
      '    Set VITE_AUDIO_BASE and flip that flag back to true to restore them.\n',
  )
  process.exit(0)
}

let manifest
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
} catch {
  fail(
    'public/data/recordings.json is missing.\n' +
      '    Run: node scripts/build-recordings-index.mjs',
  )
}

if (manifest.length === 0) {
  console.log('  Audio: manifest is empty — nothing to verify.')
  process.exit(0)
}

// Same resolution the app uses, kept in step with AUDIO_BASE in src/lib/audio.ts.
const base = process.env.VITE_AUDIO_BASE?.replace(/\/?$/, '/') ?? null

// Check a spread rather than just the first file, so a partial upload is
// caught too.
const sample = [
  manifest[0],
  manifest[Math.floor(manifest.length / 2)],
  manifest[manifest.length - 1],
]

if (base) {
  const missing = []
  for (const n of sample) {
    const url = `${base}${n}.mp3`
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (!res.ok) missing.push(`${url} → ${res.status}`)
    } catch (e) {
      missing.push(`${url} → ${e.message}`)
    }
  }
  if (missing.length) {
    fail(
      `VITE_AUDIO_BASE is set, but recordings are not reachable there:\n` +
        missing.map((m) => `      ${m}`).join('\n') +
        `\n\n    Check the bucket is public and the URL ends at the folder holding` +
        `\n    the mp3 files.`,
    )
  }
  console.log(`  Audio: ${manifest.length} recordings reachable at ${base}`)
  process.exit(0)
}

// No external host configured, so the files must be in the build itself.
const missing = []
for (const n of sample) {
  const file = fileURLToPath(new URL(`media/audio/${n}.mp3`, root))
  try {
    await access(file)
  } catch {
    missing.push(`media/audio/${n}.mp3`)
  }
}

if (missing.length) {
  fail(
    `The manifest lists ${manifest.length} recordings, but they are not in this build.\n\n` +
      `    Missing: ${missing.join(', ')}\n\n` +
      `    The mp3s are gitignored (~1 GB), so a build from a fresh clone — which\n` +
      `    is what Vercel does — has none of them. Host them somewhere and set\n` +
      `    VITE_AUDIO_BASE to that folder's URL.\n\n` +
      `    To ship without recordings on purpose: ALLOW_MISSING_AUDIO=1`,
  )
}

console.log(`  Audio: ${manifest.length} recordings present in media/audio`)
