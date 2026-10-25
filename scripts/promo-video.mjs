// Renders the "Use your hymnal this Sabbath" promo — a portrait (9:16) clip
// for WhatsApp Status, Reels, TikTok and Shorts, cut to the beat of a song.
//
//   node scripts/promo-video.mjs --music joy.mp3 [--base http://localhost:5173]
//
// Three steps, all automatic:
//   1. Capture — drives the real app in a phone-sized browser (dark, Rose).
//   2. Listen  — fits a beat grid to the drum hits and finds the chorus, so every cut,
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
//                    the first chorus itself (or, failing that, the loudest
//                    stretch).
//   --bpm <n>        force the tempo instead of detecting it
//   --offset <sec>   force the first downbeat (seconds after --start)
//   --base <url>     the app to capture (default http://localhost:5173 —
//                    run `npm run dev` first)
//   --out <file>     default docs/promo-sabbath.mp4
//   --skip-capture   reuse the screenshots from the last run
//   --preview <s,…>  write stills at these steps (0–80) to .video/promo/ and stop
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

/**
 * The drum hits: moments the sound jumps by 8 dB within 20 ms. These are the
 * kick, snare and claps, and unlike the softer onsets they sit exactly on
 * the beat, so they are what the grid is fitted to.
 */
function drumHits(x) {
  const w = Math.round(SR * 0.005)
  const env = []
  for (let i = 0; i + w <= x.length; i += w) {
    let e = 0
    for (let j = i; j < i + w; j++) e += x[j] * x[j]
    env.push(10 * Math.log10(e / w + 1e-12))
  }
  const hits = []
  for (let k = 4; k < env.length; k++) {
    const t = (k * w) / SR // exact: a step is w samples, not a round 5 ms
    const rise = env[k] - Math.min(env[k - 1], env[k - 2], env[k - 3], env[k - 4])
    if (rise > 8 && (!hits.length || t - hits[hits.length - 1] > 0.12)) hits.push(t)
  }
  return hits
}

/**
 * The beat grid that the most drum hits land on (within 25 ms), searched to a
 * hundredth of a BPM around the first estimate. A small tempo error adds up:
 * 0.3 BPM off is a tenth of a second adrift after a minute.
 */
function beatGrid(hits, guess) {
  let best = { bpm: guess, phase: 0, n: -1 }
  for (let bpm = guess - 1.5; bpm <= guess + 1.5; bpm += 0.01) {
    const beat = 60 / bpm
    for (let ph = 0; ph < beat; ph += 0.002) {
      let n = 0
      for (const h of hits) {
        const r = ((h - ph) / beat) % 1
        if (Math.min(r, 1 - r) * beat < 0.025) n++
      }
      if (n > best.n) best = { bpm, phase: ph, n }
    }
  }
  return best
}

/** As beatGrid, with the tempo given: only the phase is fitted. */
function beatGridAt(hits, bpm) {
  const beat = 60 / bpm
  let best = { bpm, phase: 0, n: -1 }
  for (let ph = 0; ph < beat; ph += 0.001) {
    let n = 0
    for (const h of hits) {
      const r = ((h - ph) / beat) % 1
      if (Math.min(r, 1 - r) * beat < 0.025) n++
    }
    if (n > best.n) best = { bpm, phase: ph, n }
  }
  return best
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

/** In-place radix-2 FFT. */
function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const c = Math.cos(ang * k)
        const sn = Math.sin(ang * k)
        const a = i + k
        const b = a + len / 2
        const vr = re[b] * c - im[b] * sn
        const vi = re[b] * sn + im[b] * c
        re[b] = re[a] - vr
        im[b] = im[a] - vi
        re[a] += vr
        im[a] += vi
      }
    }
  }
}

/**
 * The first chorus, found the way a listener finds it: the loud stretch the
 * song plays again, note for note, later on. Each bar is boiled down to its
 * harmony (12 pitch classes) and tone (8 bands); a chorus shows up as a long
 * run of bars that match the bars a fixed number of bars later. Returns the
 * downbeat it starts on, or null when nothing repeats convincingly.
 */
function chorus(x, grid) {
  const beat = 60 / grid.bpm
  const N = 2048
  const hann = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N))
  // One harmony (12 pitch classes) and tone (8 bands) reading per beat.
  const beats = []
  for (let t = grid.phase; (t + beat) * SR < x.length; t += beat) {
    const pitch = new Float64Array(12)
    const tone = new Float64Array(8)
    let energy = 0
    let frames = 0
    for (let at = Math.round(t * SR); at + N <= (t + beat) * SR; at += N) {
      const re = new Float64Array(N)
      const im = new Float64Array(N)
      for (let i = 0; i < N; i++) re[i] = x[at + i] * hann[i]
      fft(re, im)
      for (let k = 2; k < N / 2; k++) {
        const f = (k * SR) / N
        const m = re[k] * re[k] + im[k] * im[k]
        energy += m
        if (f > 80 && f < 2000) pitch[(((Math.round(12 * Math.log2(f / 440)) % 12) + 12) % 12)] += Math.sqrt(m)
        const band = Math.min(7, Math.floor(Math.log2(f / 40)))
        if (band >= 0) tone[band] += Math.log1p(m)
      }
      frames++
    }
    beats.push({ t, pitch, tone, db: 10 * Math.log10(energy / Math.max(1, frames) + 1e-12) })
  }
  // Which beat of four is the "one": the chords change on it. (The kick is
  // no guide; plenty of songs hit beat three as hard as beat one.)
  const cos = (a, b) => {
    let d = 0
    let la = 0
    let lb = 0
    for (let i = 0; i < 12; i++) {
      d += a[i] * b[i]
      la += a[i] * a[i]
      lb += b[i] * b[i]
    }
    return d / Math.sqrt(la * lb || 1)
  }
  const change = [0, 0, 0, 0]
  for (let k = 1; k < beats.length; k++) change[k % 4] += 1 - cos(beats[k - 1].pitch, beats[k].pitch)
  const one = change.indexOf(Math.max(...change))
  // A bar starting at any beat: the four beats summed, then normalised.
  const unit = (v) => {
    const l = Math.hypot(...v) || 1
    return v.map((a) => a / l)
  }
  const bars = []
  for (let j = 0; j + 4 <= beats.length; j++) {
    const pitch = new Float64Array(12)
    const tone = new Float64Array(8)
    let db = 0
    for (let k = j; k < j + 4; k++) {
      for (let i = 0; i < 12; i++) pitch[i] += beats[k].pitch[i]
      for (let i = 0; i < 8; i++) tone[i] += beats[k].tone[i]
      db += beats[k].db / 4
    }
    bars.push({ t: beats[j].t, pitch: unit(pitch), tone: unit(tone), db })
  }
  const alike = (a, b) => {
    let p = 0
    let q = 0
    for (let i = 0; i < 12; i++) p += a.pitch[i] * b.pitch[i]
    for (let i = 0; i < 8; i++) q += a.tone[i] * b.tone[i]
    return 0.7 * p + 0.3 * q
  }
  // Only loud stretches count: within 3 dB of the song's loudest 8 bars.
  let loudest = -Infinity
  for (let j = 0; j + 32 <= bars.length; j += 4) {
    let d = 0
    for (let k = 0; k < 32; k += 4) d += bars[j + k].db
    loudest = Math.max(loudest, d / 8)
  }
  // A bar sung a little differently the second time should not split the
  // chorus in two, so each bar is judged with the bars either side of it.
  const median3 = (a, b, c) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), c))
  let best = null
  // Repeats sit whole bars apart (any multiple of 4 beats, from 16 bars on).
  for (let lag = 64; lag + 32 < bars.length; lag += 4) {
    const raw = []
    for (let j = 0; j + lag < bars.length; j++) raw.push(alike(bars[j], bars[j + lag]))
    const same = raw.map((v, j) => median3(raw[j - 4] ?? v, v, raw[j + 4] ?? v))
    let run = 0
    let db = 0
    for (let j = 0; j <= same.length; j++) {
      if (j < same.length && same[j] >= 0.975) {
        run++
        db += bars[j].db
        continue
      }
      const start = j - run
      if (run >= 32 && db / run > loudest - 3 && bars[start].t > 5) {
        // Longest run wins; a near-tie goes to the earlier one.
        if (!best || run > best.run * 1.1 || (run > best.run * 0.9 && start < best.start)) {
          best = { run, start }
        }
      }
      run = 0
      db = 0
    }
  }
  if (!best) return null
  // The match often begins a beat or two early, on a lead-in sung the same
  // both times; the chorus itself starts on the next "one".
  let k = best.start
  while (k % 4 !== one) k++
  return beats[k].t
}

let START = opt.start ? Number(opt.start) : 0
let bpm = opt.bpm ? Number(opt.bpm) : 120
let offset = opt.offset ? Number(opt.offset) : 0

// The edit is cut in a comfortable range; a very fast song is cut every
// other beat.
const gridOf = (b) => {
  while (b > 150) b /= 2
  while (b < 75) b *= 2
  return b
}
// The stage runs in 80 steps: intro, pocket, eight features, the call, the
// close. On a slow song each step is a beat. On a quick one (over 120) the
// words still land beat by beat, but each phone screen and the closing card
// get two bars, so there is time to read them.
const paceOf = (g) =>
  g > 120
    ? [[0, 8, 1], [8, 16, 2], [16, 48, 2], [48, 64, 1], [64, 80, 2]]
    : [[0, 80, 1]]
const beatsOf = (pace) => pace.reduce((n, [a, b, k]) => n + (b - a) * k, 0)

if (opt.music) {
  await access(opt.music)
  console.log(`\nListening to ${opt.music}`)
  const song = await decode(opt.music)
  const guess = opt.bpm ? Number(opt.bpm) : tempo(onsets(song.subarray(Math.round(song.length * 0.2), Math.round(song.length * 0.8))))
  // Fit the grid to the drum hits. --bpm pins the tempo; the phase is still fitted.
  const hits = drumHits(song)
  const fit = opt.bpm ? beatGridAt(hits, guess) : beatGrid(hits, guess)
  bpm = fit.bpm
  console.log(`Beat grid: ${bpm.toFixed(2)} BPM, ${fit.n} of ${hits.length} drum hits within 25 ms`)
  const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`
  if (!opt.start) {
    const found = chorus(song, fit)
    if (found !== null) {
      START = found
      console.log(`Starting at ${clock(START)}, where the chorus begins (--start to change)`)
    } else {
      START = strongest(song, (beatsOf(paceOf(gridOf(bpm))) * 60) / gridOf(bpm))
      console.log(`Starting at ${clock(START)}, the song's strongest stretch (--start to change)`)
    }
  }
  // Start exactly on the grid: the first beat at or after the chosen start.
  if (!opt.offset) {
    const beat = 60 / bpm
    const k = Math.ceil((START - fit.phase) / beat - 0.25)
    offset = fit.phase + k * beat - START
    if (offset < 0) offset = 0
  }
}
const grid = gridOf(bpm)
const BEAT = 60 / grid
const PACE = paceOf(grid)
const DURATION = beatsOf(PACE) * BEAT
console.log(
  `Tempo ${bpm.toFixed(1)} BPM${grid !== bpm ? ` (cut at ${grid.toFixed(1)})` : ''}, ` +
    `downbeat ${offset.toFixed(3)} s after ${START.toFixed(3)} s → ${DURATION.toFixed(1)} s of video`,
)

// ————————————————————————————————————————————————————————————————
// 3 · Render
// ————————————————————————————————————————————————————————————————

const stage = fileURLToPath(new URL('./promo-stage.html', import.meta.url))
const html = (await readFile(stage, 'utf8'))
  .replace('__BEAT__', String(BEAT))
  .replace('__PACE__', JSON.stringify(PACE))
const icon = fileURLToPath(new URL('../public/pwa-512x512.png', import.meta.url))
await writeFile(`${DIR}stage.html`, html.replaceAll('__ICON__', pathToFileURL(icon).href))

const browser = await launch()
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.error(`stage: ${e.message}`))
await page.goto(pathToFileURL(`${DIR}stage.html`).href, { waitUntil: 'networkidle' })
await page.evaluate(() => window.ready)

if (opt.preview) {
  for (const b of opt.preview.split(',').map(Number)) {
    await page.evaluate((step) => window.render(timeOf(step)), b)
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
