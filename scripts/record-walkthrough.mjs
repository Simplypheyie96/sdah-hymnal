// Records the walk-through video.
//
//   node scripts/record-walkthrough.mjs [url]
//
// Drives the real app in a phone-sized browser, captures each step, renders
// title cards, and stitches everything into an MP4 with ffmpeg. Frames land
// in .video/ and the finished file in docs/walkthrough.mp4.
//
// Requires ffmpeg on PATH.

import { chromium } from 'playwright'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const run = promisify(execFile)
const BASE = process.argv[2] ?? 'https://sdahymnal.vercel.app'
// fileURLToPath, not .pathname: the project path contains a space, which
// .pathname leaves percent-encoded and ffmpeg then cannot open.
const DIR = fileURLToPath(new URL('../.video/', import.meta.url))
const OUT = fileURLToPath(new URL('../docs/walkthrough.mp4', import.meta.url))

// Portrait phone, 2x for a crisp result at 1080 wide.
const W = 540
const H = 1170
const SCALE = 2

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** A full-bleed caption card, drawn to match the app's own type. */
async function card(text, sub, file) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}">
    <rect width="100%" height="100%" fill="#17191b"/>
    <text x="50%" y="47%" text-anchor="middle" fill="#f2f3f3"
          font-family="EB Garamond, Georgia, serif" font-size="${74}" font-weight="600">${text}</text>
    ${
      sub
        ? `<text x="50%" y="54%" text-anchor="middle" fill="#8b9195"
             font-family="-apple-system, Helvetica, sans-serif" font-size="${34}">${sub}</text>`
        : ''
    }
  </svg>`
  await sharp(Buffer.from(svg)).png().toFile(`${DIR}${file}`)
}

await rm(DIR, { recursive: true, force: true })
await mkdir(DIR, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: SCALE,
  isMobile: true,
  hasTouch: true,
})

const shots = []
const shot = async (name, hold = 2.6) => {
  const file = `${String(shots.length).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: `${DIR}${file}` })
  shots.push({ file, hold })
  console.log(`  ${file}`)
}
/** Click without letting one stubborn selector end the recording. */
const tap = async (selector, { timeout = 6000 } = {}) => {
  try {
    await page.locator(selector).first().click({ timeout, force: true })
    return true
  } catch {
    console.log(`  (skipped: ${selector})`)
    return false
  }
}

const titleCard = async (text, sub, hold = 2.2) => {
  const file = `${String(shots.length).padStart(2, '0')}-card.png`
  await card(text, sub, file)
  shots.push({ file, hold })
  console.log(`  ${file}  "${text}"`)
}

console.log(`Recording ${BASE}\n`)

// ——— Opening ———
await page.goto(BASE, { waitUntil: 'networkidle' })
await wait(1200)
await shot('splash', 3)
await wait(4200)
await shot('home', 2.8)

// ——— Finding a hymn ———
await titleCard('Find a hymn', 'by title, number, or a line you remember')
await page.fill('input[type=search]', 'amazing')
await wait(900)
await shot('search-title')

await page.fill('input[type=search]', 'streams of mercy')
await wait(900)
await shot('search-lyrics', 3.2)

await page.fill('input[type=search]', '')
await tap('button[aria-label="Open number keypad"]')
await wait(700)
for (const d of ['3', '0', '0']) {
  await tap(`button[aria-label="${d}"]`)
  await wait(220)
}
await shot('keypad', 2.6)

// ——— Reading ———
await tap('button:has-text("Open 300")')
await wait(1600)
await shot('hymn', 3)

await titleCard('Every verse, sung', 'the recording plays the whole hymn')
await tap('button[aria-label="Play accompaniment"]')
await wait(3500)
await shot('playing', 2.8)

// ——— Yorùbá ———
await titleCard('English and Yorùbá', 'the same hymn, the right number')
await tap('button:text-is("Yorùbá")')
await wait(1800)
await shot('yoruba', 3)
await tap('button:text-is("English")')
await wait(1200)

// ——— Sharing ———
await titleCard('Share a verse', 'pick the verse, pick a colour')
await tap('button[aria-label="Share"]')
await wait(2200)
await shot('share-mono', 2.6)
await tap('button[aria-label="Rose colours"]')
await wait(1800)
await shot('share-rose', 3)
await tap('button:text-is("Done")')
await wait(800)

// ——— Projection ———
await titleCard('Put it on the screen', 'one verse at a time, for the whole church')
await tap('button[aria-label="Present on screen"]')
await wait(1800)
await shot('present', 3.2)
await page.keyboard.press('Escape')
await wait(900)

// ——— Settings ———
await tap('button[aria-label="Back"]')
await wait(900)
await titleCard('Make it yours', 'four themes, light or dark, any size')
await tap('nav button[aria-label="Settings"]')
await wait(1400)
await shot('settings')
await tap('[role=radio]:has-text("Sage")')
await wait(1600)
await shot('settings-sage', 3)

await titleCard('920 hymns and readings', 'free, and it works offline')

await browser.close()

// ——— Stitch ———
console.log('\nStitching…')
const list = shots
  .map((s) => `file '${DIR}${s.file}'\nduration ${s.hold}`)
  .join('\n')
// ffmpeg's concat demuxer needs the final frame repeated to honour its duration
const listFile = `${DIR}frames.txt`
await writeFile(listFile, `${list}\nfile '${DIR}${shots[shots.length - 1].file}'\n`)

await run('ffmpeg', [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', listFile,
  '-vf', `fps=30,scale=${W * SCALE}:${H * SCALE}:force_original_aspect_ratio=decrease,pad=${W * SCALE}:${H * SCALE}:(ow-iw)/2:(oh-ih)/2:color=0x17191b,format=yuv420p`,
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '20',
  '-movflags', '+faststart',
  OUT,
])

const { stdout } = await run('ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration,size',
  '-of', 'default=nw=1',
  OUT,
])
console.log(`\ndocs/walkthrough.mp4`)
console.log(stdout.trim())
