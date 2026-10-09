// Renders the "Use your hymnal this Sabbath" promo — a portrait (9:16) clip
// for WhatsApp Status, Reels, TikTok and Shorts, cut to the beat of a song.
//
//   node scripts/promo-video.mjs --music joy.mp3 [--base http://localhost:5173]
//
// Three steps, all automatic:
//   1. Capture — drives the real app in a phone-sized browser (dark, Rose).
//   2. Listen  — finds the song's tempo and first downbeat, so every cut,
//                pulse and word lands on a beat. Override with --bpm/--offset
//                if the detection picks double or half time.
//   3. Render  — draws each frame of the motion graphics in the browser,
//                pipes them to ffmpeg, and lays the song underneath.
//
// Flags:
//   --music <file>   the song (mp3, m4a, wav…). Without it the video is cut to
//                    --bpm and rendered silent, ready for a song to be added
//                    in the Instagram/TikTok editor.
//   --start <sec>    where in the song to begin. Left out, the script finds
//                    the song's strongest stretch (usually the chorus) itself.
//   --bpm <n>        force the tempo instead of detecting it
//   --offset <sec>   force the first downbeat (seconds after --start)
//   --base <url>     the app to capture (default http://localhost:5173 —
//                    run `npm run dev` first)
//   --out <file>     default docs/promo-sabbath.mp4
//   --skip-capture   reuse the screenshots from the last run
//   --preview <b,…>  write stills at these beats to .video/promo/ and stop
//
// Set CHROMIUM_PATH if Playwright's own browser is not installed.
// Requires ffmpeg and ffprobe on PATH. Frames land in .video/promo/.

import { chromium } from 'playwright'
import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const run = promisify(execFile)

const { values: opt } = parseArgs({
  options: {
    music: { type: 'string' },
    start: { type: 'string' },
    bpm: { type: 'string' },
    offset: { type: 'string' },
    base: { type: 'string', default: 'http://localhost:5173' },
    out: { type: 'string' },
    'skip-capture': { type: 'boolean', default: false },
    fps: { type: 'string', default: '30' },
    preview: { type: 'string' },
  },
})

const DIR = fileURLToPath(new URL('../.video/promo/', import.meta.url))
const SHOTS = `${DIR}shots/`
const OUT = opt.out ?? fileURLToPath(new URL('../docs/promo-sabbath.mp4', import.meta.url))
const FPS = Number(opt.fps)
const W = 1080
const H = 1920
const launch = () =>
  chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

await mkdir(SHOTS, { recursive: true })

// ————————————————————————————————————————————————————————————————
// 1 · Capture
// ————————————————————————————————————————————————————————————————

async function capture() {
  console.log(`Capturing ${opt.base}`)
  const browser = await launch()
  // iPhone 16 Pro: 402 × 874 points at 3x — the phone's own 1206 × 2622 pixels.
  const ctx = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
  })
  // Skip the splash and install nudge, start dark in Rose.
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('promo.seeded')) return
    sessionStorage.setItem('promo.seeded', '1')
    localStorage.setItem('sdah.splashSeen', 'true')
    localStorage.setItem('sdah.installNudge.dismissed', 'true')
    localStorage.setItem('sdah.theme', '"dark"')
    localStorage.setItem('sdah.accent', '"rose"')
  })
  const page = await ctx.newPage()
  // Clear the Dynamic Island and home indicator the way the real phone does;
  // the app already pads for env(safe-area-inset-*).
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setSafeAreaInsetsOverride', {
    insets: { top: 62, bottom: 34, left: 0, right: 0 },
  })
  const shot = async (name) => {
    await page.screenshot({ path: `${SHOTS}${name}.png` })
    console.log(`  ${name}.png`)
  }
  const tap = async (selector) => {
    try {
      await page.locator(selector).first().click({ timeout: 6000, force: true })
    } catch {
      console.log(`  (skipped: ${selector})`)
    }
  }

  await page.goto(opt.base, { waitUntil: 'networkidle' })
  await wait(1500)
  await shot('splash')
  await wait(4500)
  await shot('home')

  await page.fill('input[type=search]', 'joyful')
  await wait(900)
  await shot('search')

  await page.fill('input[type=search]', '')
  await tap('button[aria-label="Open number keypad"]')
  await wait(700)
  for (const d of ['1', '2']) {
    await tap(`button[aria-label="${d}"]`)
    await wait(200)
  }
  await shot('keypad')

  await tap('button:has-text("Open 12")')
  await wait(1600)
  await shot('hymn')

  await page.mouse.wheel(0, 700)
  await wait(900)
  await shot('verses')
  await page.mouse.wheel(0, -2000)
  await wait(600)

  await tap('button[aria-label="Share"]')
  await wait(1800)
  await tap('button[aria-label="Rose colours"]')
  await wait(1400)
  await shot('share')
  await tap('button:text-is("Done")')
  await wait(800)

  await tap('button[aria-label="Present on screen"]')
  await wait(1800)
  await shot('present')
  await page.keyboard.press('Escape')
  await wait(900)

  await tap('button[aria-label="Back"]')
  await wait(900)
  await tap('nav button[aria-label="Settings"]')
  await wait(1400)
  await tap('[role=radio]:has-text("Sage")')
  await wait(1200)
  await shot('settings')

  // Hymn 12 has no Yorùbá text; Joy to the World (125) does — Ayọ̀ F' Ayé.
  await tap('nav button[aria-label="Hymns"]')
  await wait(900)
  await tap('button[aria-label="Open number keypad"]')
  await wait(700)
  for (const d of ['1', '2', '5']) {
    await tap(`button[aria-label="${d}"]`)
    await wait(200)
  }
  await tap('button:has-text("Open 125")')
  await wait(1600)
  await shot('english')
  // The home screen's own language toggle sits underneath the hymn, so take
  // the hymn's — the last one in the document.
  try {
    await page.locator('button:text-is("Yorùbá")').last().click({ timeout: 6000 })
  } catch {
    console.log('  (skipped: Yorùbá)')
  }
  await wait(1800)
  await shot('yoruba')

  await browser.close()
}

if (!opt['skip-capture']) await capture()

// ————————————————————————————————————————————————————————————————
// 2 · Listen
// ————————————————————————————————————————————————————————————————

const SR = 11025
const HOP = 128
const FR = SR / HOP // onset-envelope frames per second

/** Decode the song to mono float samples, from `start` for `length` seconds. */
async function decode(file, start = 0, length) {
  const { stdout } = await run(
    'ffmpeg',
    [
      '-v', 'error', '-ss', String(start), ...(length ? ['-t', String(length)] : []),
      '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-',
    ],
    { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
  )
  return new Float32Array(stdout.buffer, stdout.byteOffset, stdout.byteLength / 4)
}

/** Onset strength: rises in loudness, full-band and high-passed together. */
function onsets(x) {
  const n = Math.floor((x.length - 512) / HOP)
  const full = new Float32Array(n)
  const high = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let e = 0
    let h = 0
    for (let j = i * HOP, end = j + 512; j < end; j++) {
      e += x[j] * x[j]
      const d = x[j] - (j ? x[j - 1] : 0)
      h += d * d
    }
    full[i] = Math.log1p(e * 100)
    high[i] = Math.log1p(h * 100)
  }
  const o = new Float32Array(n)
  for (let i = 1; i < n; i++) {
    o[i] = Math.max(0, full[i] - full[i - 1]) + Math.max(0, high[i] - high[i - 1])
  }
  // Subtract a running mean so sustained loud passages do not swamp the beats.
  const win = Math.round(FR * 0.4)
  const out = new Float32Array(n)
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += o[i]
    if (i >= win) sum -= o[i - win]
    out[i] = Math.max(0, o[i] - sum / Math.min(i + 1, win))
  }
  return out
}

const at = (o, f) => {
  const i = Math.floor(f)
  if (i < 0 || i + 1 >= o.length) return 0
  return o[i] + (o[i + 1] - o[i]) * (f - i)
}

/** Tempo by autocorrelation (with its harmonics), gently preferring ~120. */
function tempo(o) {
  let best = { bpm: 120, score: -1 }
  for (let bpm = 70; bpm <= 180; bpm += 0.1) {
    const p = (60 * FR) / bpm
    let s = 0
    for (const [k, w] of [[1, 1], [2, 0.5], [4, 0.25]]) {
      let a = 0
      for (let i = 0; i + p * k < o.length; i++) a += o[i] * at(o, i + p * k)
      s += w * a
    }
    s *= Math.exp(-0.5 * (Math.log2(bpm / 120) / 1.0) ** 2)
    if (s > best.score) best = { bpm, score: s }
  }
  return best.bpm
}

/** First beat of the grid, then which of the next four is the downbeat. */
function phase(o, bpm) {
  const p = (60 * FR) / bpm
  const near = (f) => Math.max(at(o, f - 1), at(o, f), at(o, f + 1))
  let best = { f: 0, score: -1 }
  for (let f = 0; f < p; f += 0.25) {
    let s = 0
    for (let k = 0; f + k * p < Math.min(o.length, FR * 40); k++) s += near(f + k * p)
    if (s > best.score) best = { f, score: s }
  }
  let down = { m: 0, score: -1 }
  for (let m = 0; m < 4; m++) {
    let s = 0
    for (let k = m; best.f + k * p < o.length; k += 4) s += near(best.f + k * p)
    if (s > down.score) down = { m, score: s }
  }
  // A frame's rise is heard at the end of its 512-sample window, not the start.
  return (best.f + down.m * p) / FR + 512 / SR
}

/**
 * Where the clip should begin: the stretch of the song, as long as the video,
 * that is loudest overall and opens with the biggest lift — the chorus or the
 * drop, rather than an intro or a spoken bit before the music.
 */
function strongest(x, length) {
  const block = Math.floor(SR / 2) // half-second loudness blocks
  const loud = []
  for (let i = 0; i + block <= x.length; i += block) {
    let e = 0
    for (let j = i; j < i + block; j++) e += x[j] * x[j]
    loud.push(10 * Math.log10(e / block + 1e-9))
  }
  const mean = (a, b) => {
    let s = 0
    for (let i = a; i < b; i++) s += loud[i]
    return s / (b - a)
  }
  const span = Math.round(length * 2)
  let best = { at: 0, score: -Infinity }
  // Skip the first few seconds: a fade-in or a video's opening is never the moment.
  for (let i = 16; i + span <= loud.length; i++) {
    const score = mean(i, i + span) + 1.5 * (mean(i, i + 8) - mean(i - 8, i))
    if (score > best.score) best = { at: i / 2, score }
  }
  return best.at
}

let START = opt.start ? Number(opt.start) : 0
let bpm = opt.bpm ? Number(opt.bpm) : 120
let offset = opt.offset ? Number(opt.offset) : 0

// The edit is cut in a comfortable range; a fast song is cut every other beat.
const BEATS = 80 // 20 bars: intro, pocket, eight features, the call, the close
const gridOf = (b) => {
  while (b > 140) b /= 2
  while (b < 80) b *= 2
  return b
}

if (opt.music) {
  await access(opt.music)
  console.log(`\nListening to ${opt.music}`)
  const song = await decode(opt.music)
  if (!opt.bpm) bpm = tempo(onsets(song.subarray(Math.round(song.length * 0.2), Math.round(song.length * 0.8))))
  if (!opt.start) {
    START = strongest(song, (BEATS * 60) / gridOf(bpm))
    console.log(`Starting at ${Math.floor(START / 60)}:${String(Math.floor(START % 60)).padStart(2, '0')}, the song's strongest stretch (--start to change)`)
  }
  if (!opt.offset) offset = phase(onsets(song.subarray(Math.round(START * SR))), bpm)
}
const grid = gridOf(bpm)
const BEAT = 60 / grid
const DURATION = BEATS * BEAT
console.log(
  `Tempo ${bpm.toFixed(1)} BPM${grid !== bpm ? ` (cut at ${grid.toFixed(1)})` : ''}, ` +
    `downbeat ${offset.toFixed(3)} s after ${START} s → ${DURATION.toFixed(1)} s of video`,
)

// ————————————————————————————————————————————————————————————————
// 3 · Render
// ————————————————————————————————————————————————————————————————

const stage = fileURLToPath(new URL('./promo-stage.html', import.meta.url))
const html = (await readFile(stage, 'utf8')).replace('__BEAT__', String(BEAT))
const icon = fileURLToPath(new URL('../public/pwa-512x512.png', import.meta.url))
await writeFile(`${DIR}stage.html`, html.replaceAll('__ICON__', pathToFileURL(icon).href))

const browser = await launch()
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.error(`stage: ${e.message}`))
await page.goto(pathToFileURL(`${DIR}stage.html`).href, { waitUntil: 'networkidle' })
await page.evaluate(() => window.ready)

if (opt.preview) {
  for (const b of opt.preview.split(',').map(Number)) {
    await page.evaluate((t) => window.render(t), b * BEAT)
    await page.screenshot({ path: `${DIR}preview-${b}.png` })
    console.log(`  preview-${b}.png`)
  }
  await browser.close()
  process.exit(0)
}

const silent = `${DIR}silent.mp4`
const ff = spawn('ffmpeg', [
  '-y', '-v', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  // Capped so the file stays shareable on WhatsApp; Instagram and TikTok
  // re-encode anyway.
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '6M', '-bufsize', '12M',
  '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  silent,
], { stdio: ['pipe', 'inherit', 'inherit'] })
const done = new Promise((resolve, reject) =>
  ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))),
)

const frames = Math.round(DURATION * FPS)
console.log(`\nRendering ${frames} frames…`)
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.render(t), i / FPS)
  const jpg = await page.screenshot({ type: 'jpeg', quality: 92 })
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r))
  if (i % (FPS * 5) === 0) process.stdout.write(`  ${(i / FPS).toFixed(0)}s`)
}
ff.stdin.end()
await done
await browser.close()
console.log()

// ——— Lay the song underneath, starting exactly on the downbeat ———
const mux = ['-y', '-v', 'error', '-i', silent]
if (opt.music) {
  const fadeOut = Math.max(0, DURATION - BEAT * 4)
  mux.push(
    '-ss', String(START + offset), '-t', String(DURATION), '-i', opt.music,
    '-map', '0:v', '-map', '1:a',
    '-af', `afade=t=in:d=0.04,afade=t=out:st=${fadeOut}:d=${BEAT * 4}`,
    '-c:a', 'aac', '-b:a', '192k', '-shortest',
  )
}
mux.push('-c:v', 'copy', '-movflags', '+faststart', OUT)
await run('ffmpeg', mux)

const { stdout } = await run('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'default=nw=1', OUT,
])
console.log(`\n${OUT}\n${stdout.trim()}`)
