// Records the short introduction / marketing film.
//
//   node scripts/record-promo.mjs [url] [soundtrack.mp3]
//
// A ~30-second portrait cut: a title card, a handful of the app's real
// screens, and an outro that asks the viewer to open the link and add it to
// their phone. Built the same way as record-walkthrough.mjs — the app driven
// in a phone-sized browser, cards drawn to match its type, stitched with
// ffmpeg — but shorter, softer, and pointed at one thing: install it.
//
// Audio: pass a hymn recording as the second argument to lay it under the
// picture. With none, a soft placeholder drone is generated so the timing can
// be judged. (A hymn recording belongs to its performers and publishers —
// clear the rights before using one in something you publish.)
//
// Requires ffmpeg on PATH (set FFMPEG to point elsewhere).

import { chromium } from 'playwright'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const run = promisify(execFile)
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'
const BASE = process.argv[2] ?? 'https://sdahymnal.vercel.app'
const SOUNDTRACK = process.argv[3] ?? null
const DIR = fileURLToPath(new URL('../.promo/', import.meta.url))
const OUT = process.env.OUT ?? fileURLToPath(new URL('../docs/promo.mp4', import.meta.url))
// A short, playable clip served in place of the real recordings, so the
// play button's progress ring animates on camera even without R2 reachable.
const RING = process.env.RING ?? null

// Portrait phone at 2x — 1080×2340, the shape people actually hold.
const W = 540
const H = 1170
const S = 2
const PW = W * S
const PH = H * S
const INK = '#17191b'
const PAPER = '#f2f3f3'
const MUTE = '#8b9195'
const ACCENT = '#9db8a6'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * A full-bleed card in the app's voice: dark paper, a serif title over a
 * letterspaced eyebrow, an optional accent rule, muted sub-lines, and — for
 * the close — a pill holding the link.
 */
async function card(file, { eyebrow, title = [], sub = [], link, mark = false } = {}) {
  const cx = PW / 2
  let y = mark ? PH * 0.30 : PH * 0.33
  const parts = []

  if (mark) {
    // The app's own book-and-note mark, from the opening screen.
    parts.push(`<g transform="translate(${cx - 94} ${PH * 0.17}) scale(0.58)">
      <path d="M248 168c-40-28-96-38-148-27a8 8 0 0 0-6 8v190a8 8 0 0 0 10 8c46-10 96-2 134 22a8 8 0 0 0 10-7V168z" fill="${PAPER}"/>
      <path d="M264 168c40-28 96-38 148-27a8 8 0 0 1 6 8v190a8 8 0 0 1-10 8c-46-10-96-2-134 22a8 8 0 0 1-10-7V168z" fill="${PAPER}"/>
      <rect x="250" y="152" width="12" height="238" rx="6" fill="${MUTE}"/>
      <g fill="${INK}"><rect x="126" y="232" width="92" height="12" rx="6"/><rect x="126" y="274" width="66" height="12" rx="6"/></g>
      <g fill="${INK}"><rect x="344" y="212" width="11" height="92" rx="5"/><ellipse cx="326" cy="304" rx="30" ry="23" transform="rotate(-19 326 304)"/></g>
    </g>`)
  }

  if (eyebrow) {
    parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" fill="${MUTE}" letter-spacing="6"
      font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="30" font-weight="600">${esc(eyebrow)}</text>`)
    y += 96
  }
  for (const line of title) {
    parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" fill="${PAPER}"
      font-family="EB Garamond, Georgia, 'Times New Roman', serif" font-size="94" font-weight="600">${esc(line)}</text>`)
    y += 116
  }
  if (title.length) {
    parts.push(`<rect x="${cx - 46}" y="${y - 40}" width="92" height="3" rx="1.5" fill="${ACCENT}" opacity="0.7"/>`)
    y += 44
  }
  for (const line of sub) {
    parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" fill="${MUTE}"
      font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="38">${esc(line)}</text>`)
    y += 62
  }
  if (link) {
    const lw = 560
    parts.push(`<rect x="${cx - lw / 2}" y="${y + 6}" width="${lw}" height="96" rx="48" fill="none" stroke="${ACCENT}" stroke-width="3" opacity="0.8"/>
      <text x="${cx}" y="${y + 68}" text-anchor="middle" fill="${PAPER}"
        font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="44" font-weight="600">${esc(link)}</text>`)
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}">
    <rect width="100%" height="100%" fill="${INK}"/>${parts.join('')}</svg>`
  await sharp(Buffer.from(svg)).png().toFile(`${DIR}${file}`)
}

// A soft instrumental bed, generated rather than fetched — the recordings live
// in R2, and a promo built on one needs its rights cleared anyway. A slow
// I–vi–IV–V hymn cadence in G, each chord a few pure tones under a gentle
// swell; reverb and a low-pass are added at the mux so it sits warm and far
// back. Pass a real recording as the soundtrack argument to replace it.
async function buildBed(total) {
  const prog = [
    [196.0, 246.94, 293.66], // G
    [164.81, 196.0, 246.94], // Em
    [130.81, 164.81, 196.0], // C
    [146.83, 185.0, 220.0], //  D
    [196.0, 246.94, 293.66], // G
    [130.81, 164.81, 196.0], // C
    [146.83, 185.0, 220.0], //  D
    [196.0, 246.94, 293.66], // G
  ]
  const dur = total / prog.length
  const clips = []
  for (const [i, chord] of prog.entries()) {
    const f = `${DIR}bed-${String(i).padStart(2, '0')}.wav`
    const ins = chord.flatMap((hz) => ['-f', 'lavfi', '-i', `sine=frequency=${hz}:duration=${dur.toFixed(3)}`])
    const mix = chord.map((_, k) => `[${k}]`).join('')
    await run(FFMPEG, [
      '-y', ...ins,
      '-filter_complex',
      `${mix}amix=inputs=${chord.length},afade=t=in:st=0:d=0.9,afade=t=out:st=${(dur - 1.1).toFixed(2)}:d=1.1,volume=2.4`,
      f,
    ])
    clips.push(f)
  }
  const list = `${DIR}bed.txt`
  await writeFile(list, clips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n') + '\n')
  const bed = `${DIR}bed.wav`
  await run(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', bed])
  return bed
}

await rm(DIR, { recursive: true, force: true })
await mkdir(DIR, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: S,
  isMobile: true,
  hasTouch: true,
})
// Skip the live splash (we open on our own title card), and let the install
// nudge appear so the film shows the very thing it is asking for.
await ctx.addInitScript(`try { sessionStorage.setItem('sdah.splashSeen','1') } catch {}`)
// Stand in for the recordings so the progress ring animates on camera.
if (RING) await ctx.route(/\.mp3(\?|$)/, (r) => r.fulfill({ path: RING, headers: { 'Accept-Ranges': 'bytes' } }))

const page = await ctx.newPage()

const seq = []
const shot = async (name, hold = 2.6) => {
  const file = `${String(seq.length).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: `${DIR}${file}` })
  seq.push({ file, hold })
  console.log(`  ${file}`)
}
const titleCard = async (name, opts, hold = 2.4) => {
  const file = `${String(seq.length).padStart(2, '0')}-${name}.png`
  await card(file, opts)
  seq.push({ file, hold })
  console.log(`  ${file}  card`)
}
// A feature beat: the real screen dropped onto dark paper as a rounded, inset
// device shot with one line of benefit beneath it — an app-store frame, not a
// tutorial step. Flagged `zoom` so the stitch gives it a slow push-in.
const featureShot = async (name, caption, hold = 2.6) => {
  const file = `${String(seq.length).padStart(2, '0')}-${name}.png`
  const shotW = Math.round(PW * 0.82)
  const resized = await sharp(await page.screenshot()).resize(shotW).toBuffer()
  const { height: shotH } = await sharp(resized).metadata()
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${shotW}" height="${shotH}"><rect width="${shotW}" height="${shotH}" rx="40" ry="40"/></svg>`,
  )
  const rounded = await sharp(resized).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  const top = 160
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}">
    <rect x="${PW / 2 - 46}" y="${top + shotH + 74}" width="92" height="3" rx="1.5" fill="${ACCENT}" opacity="0.75"/>
    <text x="${PW / 2}" y="${top + shotH + 152}" text-anchor="middle" fill="${PAPER}"
      font-family="EB Garamond, Georgia, serif" font-size="64" font-weight="600">${esc(caption)}</text>
  </svg>`
  await sharp({ create: { width: PW, height: PH, channels: 4, background: INK } })
    .composite([
      { input: rounded, top, left: Math.round((PW - shotW) / 2) },
      { input: Buffer.from(overlay), top: 0, left: 0 },
    ])
    .png()
    .toFile(`${DIR}${file}`)
  seq.push({ file, hold, zoom: true })
  console.log(`  ${file}  feature`)
}
const tap = async (sel, { timeout = 6000 } = {}) => {
  try {
    await page.locator(sel).first().click({ timeout, force: true })
    return true
  } catch {
    console.log(`  (skipped: ${sel})`)
    return false
  }
}
const fillSearch = async (text) => {
  for (const sel of ['input[type=search]', 'input[type=text]', 'input']) {
    try {
      await page.fill(sel, text, { timeout: 2500 })
      return
    } catch {
      /* try the next */
    }
  }
  // Resilient by design, like tap(): a stubborn field should not abort an
  // otherwise-good recording. Note it and carry on.
  console.log(`  (skipped: search input for "${text}")`)
}

console.log(`Recording ${BASE}\n`)

// ——— Intro ———
await titleCard('intro', {
  eyebrow: 'SEVENTH-DAY ADVENTIST',
  title: ['Hymnal'],
  sub: ['Every hymn, in your pocket'],
  mark: true,
}, 3.0)

// ——— Feature montage: real screens as framed, moving app-store shots ———
await page.goto(BASE, { waitUntil: 'networkidle' })
await wait(1200)
// Nudge the browser's install offer so the banner is on screen.
await page.evaluate(() => {
  const e = new Event('beforeinstallprompt')
  e.prompt = async () => {}
  Object.defineProperty(e, 'userChoice', { value: Promise.resolve({ outcome: 'dismissed' }) })
  window.dispatchEvent(e)
})
await wait(900)
await featureShot('home', '920 hymns & readings', 2.8)

await fillSearch('streams of mercy')
await wait(1100)
await featureShot('search', 'Find any hymn in seconds', 2.6)

await fillSearch('')
await tap('button[aria-label="Open number keypad"]')
await wait(500)
for (const d of ['3', '0', '0']) {
  await tap(`button[aria-label="${d}"]`)
  await wait(180)
}
await tap('button:has-text("Open 300")')
await wait(1400)
await tap('button[aria-label="Play accompaniment"]')
await wait(3000)
await featureShot('playing', 'Every verse, sung', 2.8)

// The open hymn overlays a still-mounted Home, so two "Yorùbá" chips exist —
// the reader's is the last. Partial match dodges the label's diacritic.
await page.locator('button:has-text("Yor")').last().click({ timeout: 6000 }).catch(() => console.log('  (skipped: yoruba chip)'))
await wait(1600)
await featureShot('yoruba', 'English & Yorùbá', 2.6)

await tap('button[aria-label="Present on screen"]')
await wait(1700)
await featureShot('present', 'Project it for church', 2.6)
await page.keyboard.press('Escape').catch(() => {})
await wait(500)

// ——— Outro: the ask ———
await titleCard('outro', {
  eyebrow: 'FREE — NO APP STORE',
  title: ['Get it on', 'your phone'],
  link: 'sdahymnal.vercel.app',
  sub: ['Open the link — install in a tap'],
}, 4.4)

await browser.close()

// ——— Stitch ———
console.log('\nStitching…')
const total = seq.reduce((a, s) => a + s.hold, 0)

// Encode each still as an exact-length clip. The concat demuxer's per-image
// `duration` proved unreliable — it compressed the whole film — so we make
// real clips of known length and join those instead.
const vf = `scale=${PW}:${PH}:force_original_aspect_ratio=decrease,pad=${PW}:${PH}:(ow-iw)/2:(oh-ih)/2:color=0x17191b,format=yuv420p`
const clips = []
for (const [i, s] of seq.entries()) {
  const clip = `${DIR}clip-${String(i).padStart(2, '0')}.mp4`
  await run(FFMPEG, [
    '-y', '-loop', '1', '-t', String(s.hold), '-i', `${DIR}${s.file}`,
    '-vf', vf, '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', clip,
  ])
  clips.push(clip)
}
const listFile = `${DIR}clips.txt`
// Forward slashes: ffmpeg's concat demuxer cannot parse the backslashes a
// Windows path would carry.
await writeFile(listFile, clips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n') + '\n')
const montage = `${DIR}montage.mp4`
await run(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', montage])

// The soundtrack: the given hymn, or a soft generated drone the length of the
// film. Faded under a gentle fade-in and fade-out of the picture itself.
const track = SOUNDTRACK ?? (await buildBed(total))
const inputs = ['-i', track]
const bed = SOUNDTRACK
  ? `[1:a]volume=0.9`
  : `[1:a]aecho=0.8:0.9:1100:0.3,lowpass=f=1100,volume=0.85`
const vOut = Math.max(0, total - 1.2).toFixed(2)
const aOut = Math.max(0, total - 2.5).toFixed(2)

await run(FFMPEG, [
  '-y', '-i', montage, ...inputs,
  '-filter_complex',
  `[0:v]fade=t=in:st=0:d=0.8,fade=t=out:st=${vOut}:d=1.2[v];` +
    `${bed},afade=t=in:st=0:d=1.5,afade=t=out:st=${aOut}:d=2.5[a]`,
  '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '192k',
  '-shortest', '-movflags', '+faststart', OUT,
])

const { stdout } = await run(FFMPEG.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1'), [
  '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'default=nw=1', OUT,
]).catch(() => ({ stdout: '' }))
console.log(`\n${OUT}\n${stdout.trim()}  (${total.toFixed(1)}s of frames)`)
