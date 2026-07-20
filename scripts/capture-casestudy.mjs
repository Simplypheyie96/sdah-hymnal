// Captures the stills and clips used in the portfolio case study.
//
//   node scripts/capture-casestudy.mjs [url]
//
// Writes straight into the portfolio's asset folder. Shoots the live site at
// phone size and 3x, because the case-study frames are tall and these read
// better as a real phone than as a shrunken desktop window.

import { chromium } from 'playwright'
import { mkdir, rm, rename, readdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const BASE = process.argv[2] ?? 'https://sdahymnal.vercel.app'
const OUT = '/Users/simplypheyie/afm-portfolio/public/assets/cs/hymnal'
const TMP = '/tmp/hymnal-cs-video'

const W = 390
const H = 844
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

await mkdir(OUT, { recursive: true })
await rm(TMP, { recursive: true, force: true })
await mkdir(TMP, { recursive: true })

const browser = await chromium.launch()

/** A page that has already sat through the splash. */
async function open(opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
    ...opts,
  })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await wait(6200) // the opening screen holds for 4.2s
  return { ctx, page }
}

const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}/${name}.jpg`, quality: 92, type: 'jpeg' })
  console.log(`  ${name}.jpg`)
}

const tap = async (page, selector, { timeout = 6000 } = {}) => {
  try {
    await page.locator(selector).first().click({ timeout, force: true })
    return true
  } catch {
    console.log(`  (skipped: ${selector})`)
    return false
  }
}

console.log(`Shooting ${BASE}\n`)

// ——— Stills ———
{
  const { ctx, page } = await open()

  // The library: 920 entries, hymns and worship aids together.
  await shot(page, 'hy-library')

  // A responsive reading — the part other hymnal apps leave out.
  await page.fill('input[type=search]', '696')
  await wait(900)
  await tap(page, 'button:has(.numeral)')
  await wait(1400)
  await shot(page, 'hy-reading')

  // Number keypad.
  await tap(page, 'button[aria-label="Back"]')
  await wait(700)
  await page.fill('input[type=search]', '')
  await tap(page, 'button[aria-label="Open number keypad"]')
  await wait(800)
  for (const d of ['3', '3', '4']) {
    await tap(page, `button[aria-label="${d}"]`)
    await wait(200)
  }
  await shot(page, 'hy-keypad')

  // Searching by a half-remembered line.
  await page.keyboard.press('Escape')
  await wait(500)
  await page.fill('input[type=search]', 'streams of mercy')
  await wait(1200)
  await shot(page, 'hy-search-lyrics')

  await ctx.close()
}

{
  const { ctx, page } = await open()

  // The same hymn in Yorùbá, under a different number.
  await page.fill('input[type=search]', 'amazing grace')
  await wait(1000)
  await tap(page, 'button:has(.numeral)')
  await wait(1400)
  await tap(page, 'button:text-is("Yorùbá")')
  await wait(1800)
  await shot(page, 'hy-yoruba')

  await ctx.close()
}

{
  const { ctx, page } = await open()

  // The presenter, for a screen at the front of a hall.
  await page.fill('input[type=search]', '16')
  await wait(900)
  await tap(page, 'button:has(.numeral)')
  await wait(1400)
  await tap(page, 'button[aria-label="Present on screen"]')
  await wait(1800)
  await shot(page, 'hy-presenter')

  await ctx.close()
}

{
  const { ctx, page } = await open()

  // Settings: themes, lyric size, and the credits that matter.
  await tap(page, 'nav button[aria-label="Settings"]')
  await wait(1400)
  await shot(page, 'hy-settings')

  await ctx.close()
}

// ——— Clips ———
async function clip(name, script) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
    recordVideo: { dir: TMP, size: { width: W * 2, height: H * 2 } },
  })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await wait(6200)
  await script(page)
  await ctx.close()

  const webm = (await readdir(TMP)).filter((f) => f.endsWith('.webm')).pop()
  await run('ffmpeg', [
    '-y', '-i', `${TMP}/${webm}`,
    '-vf', 'scale=780:-2,fps=30',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
    `${OUT}/${name}.mp4`,
  ])
  await rm(`${TMP}/${webm}`, { force: true })
  console.log(`  ${name}.mp4`)
}

// Search: a line you half remember, narrowing as you type.
await clip('hy-search', async (page) => {
  await wait(700)
  for (const part of ['str', 'eams of ', 'mercy']) {
    await page.type('input[type=search]', part, { delay: 110 })
    await wait(700)
  }
  await wait(1600)
})

// The player: press play, the button opens into a speed control.
await clip('hy-player', async (page) => {
  await page.fill('input[type=search]', '1')
  await wait(900)
  await tap(page, 'button:has(.numeral)')
  await wait(1600)
  await tap(page, 'button[aria-label="Play accompaniment"]')
  await wait(3200)
  await tap(page, 'button[aria-label="Play slower"]')
  await wait(1200)
  await tap(page, 'button[aria-label="Play slower"]')
  await wait(2400)
})

await browser.close()
await rm(TMP, { recursive: true, force: true })

console.log(`\n→ ${OUT}`)
for (const f of (await readdir(OUT)).sort()) console.log(`  ${f}`)
