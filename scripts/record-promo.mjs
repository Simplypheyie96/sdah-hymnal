// Records the short introduction / marketing film.
//
//   node scripts/record-promo.mjs [url] [soundtrack.mp3]
//
// A ~20-second vertical (1080×1920) promo, made the way app-store previews are:
// one short message per scene, real screens shown large in a clean device
// frame, and smooth motion. Rather than stitch stills with ffmpeg, it builds an
// animated HTML page and screen-records it — the browser does the easing, so the
// motion is fluid and the layout is centred by CSS, not by hand.
//
// Two passes: capture the app's real screens in a phone-sized browser, then play
// and record a composed timeline of them at 1080×1920. Audio is laid under at
// the end — pass a hymn recording, or a soft instrumental is generated.
//
// Requires ffmpeg on PATH (set FFMPEG to point elsewhere).

import { chromium } from 'playwright'
import { mkdir, rm, writeFile, readdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'
const BASE = process.argv[2] ?? 'https://sdahymnal.vercel.app'
const SOUNDTRACK = process.argv[3] ?? null
const DIR = fileURLToPath(new URL('../.promo/', import.meta.url))
const OUT = process.env.OUT ?? fileURLToPath(new URL('../docs/promo.mp4', import.meta.url))
const RING = process.env.RING ?? null
const CHROME = process.env.CHROME || undefined

const W = 1080
const H = 1920
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The app's own book-and-note mark, for the opening.
const MARK = `<svg viewBox="94 140 324 262" xmlns="http://www.w3.org/2000/svg">
  <path d="M248 168c-40-28-96-38-148-27a8 8 0 0 0-6 8v190a8 8 0 0 0 10 8c46-10 96-2 134 22a8 8 0 0 0 10-7V168z" fill="#f2f3f3"/>
  <path d="M264 168c40-28 96-38 148-27a8 8 0 0 1 6 8v190a8 8 0 0 1-10 8c-46-10-96-2-134 22a8 8 0 0 1-10-7V168z" fill="#f2f3f3"/>
  <rect x="250" y="152" width="12" height="238" rx="6" fill="#8b9195"/>
  <g fill="#101214"><rect x="126" y="232" width="92" height="12" rx="6"/><rect x="126" y="274" width="66" height="12" rx="6"/></g>
  <g fill="#101214"><rect x="344" y="212" width="11" height="92" rx="5"/><ellipse cx="326" cy="304" rx="30" ry="23" transform="rotate(-19 326 304)"/></g>
</svg>`

// A soft instrumental bed — a slow I–vi–IV–V hymn cadence in G — generated when
// no recording is supplied. Reverb and a low-pass are added at the mux.
async function buildBed(total) {
  const prog = [
    [196.0, 246.94, 293.66], [164.81, 196.0, 246.94], [130.81, 164.81, 196.0], [146.83, 185.0, 220.0],
    [196.0, 246.94, 293.66], [130.81, 164.81, 196.0], [146.83, 185.0, 220.0], [196.0, 246.94, 293.66],
  ]
  const dur = total / prog.length
  const clips = []
  for (const [i, chord] of prog.entries()) {
    const f = `${DIR}bed-${String(i).padStart(2, '0')}.wav`
    const ins = chord.flatMap((hz) => ['-f', 'lavfi', '-i', `sine=frequency=${hz}:duration=${dur.toFixed(3)}`])
    const mix = chord.map((_, k) => `[${k}]`).join('')
    await run(FFMPEG, ['-y', ...ins, '-filter_complex',
      `${mix}amix=inputs=${chord.length},afade=t=in:st=0:d=0.9,afade=t=out:st=${(dur - 1.1).toFixed(2)}:d=1.1,volume=2.4`, f])
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

// ——————————————————————————— Pass 1: capture the app ————————————————————————
const browser = await chromium.launch({ executablePath: CHROME })
const cap = await browser.newContext({
  viewport: { width: 540, height: 1170 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
await cap.addInitScript(`try { sessionStorage.setItem('sdah.splashSeen','1') } catch {}`)
if (RING) await cap.route(/\.mp3(\?|$)/, (r) => r.fulfill({ path: RING, headers: { 'Accept-Ranges': 'bytes' } }))
const page = await cap.newPage()

const tap = async (sel) => {
  try {
    await page.locator(sel).first().click({ timeout: 6000, force: true })
  } catch {
    console.log(`  (skipped: ${sel})`)
  }
}
const fillSearch = async (text) => {
  for (const sel of ['input[type=search]', 'input[type=text]', 'input']) {
    try {
      await page.fill(sel, text, { timeout: 2500 })
      return
    } catch {
      /* next */
    }
  }
  console.log(`  (skipped: search input for "${text}")`)
}
const grab = async (name) => {
  await page.screenshot({ path: `${DIR}shot-${name}.png` })
  console.log(`  shot-${name}.png`)
}

console.log(`Recording ${BASE}\n`)
await page.goto(BASE, { waitUntil: 'networkidle' })
await wait(1200)
await page.evaluate(() => {
  const e = new Event('beforeinstallprompt')
  e.prompt = async () => {}
  Object.defineProperty(e, 'userChoice', { value: Promise.resolve({ outcome: 'dismissed' }) })
  window.dispatchEvent(e)
})
await wait(900)
await grab('home')

await fillSearch('streams of mercy')
await wait(1100)
await grab('search')

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
await grab('playing')

// The open hymn overlays a still-mounted Home, so two "Yorùbá" chips exist —
// the reader's is the last. Partial match dodges the label's diacritic.
await page.locator('button:has-text("Yor")').last().click({ timeout: 6000 }).catch(() => console.log('  (skipped: yoruba)'))
await wait(1600)
await grab('yoruba')

await tap('button[aria-label="Present on screen"]')
await wait(1700)
await grab('present')
await cap.close()

// ——————————————————————————— Compose the timeline ——————————————————————————
// One message per scene; real screens shown large in a device frame.
const scenes = [
  { kind: 'intro', dur: 3000 },
  { kind: 'feature', img: 'home', eyebrow: 'The complete hymnal', head: '920 hymns & readings', dur: 2600 },
  { kind: 'feature', img: 'search', eyebrow: 'Search', head: 'Find any hymn', dur: 2400 },
  { kind: 'feature', img: 'playing', eyebrow: 'Listen', head: 'Every verse, sung', dur: 2600 },
  { kind: 'feature', img: 'yoruba', eyebrow: 'Two languages', head: 'English & Yorùbá', dur: 2400 },
  { kind: 'feature', img: 'present', eyebrow: 'For church', head: 'Project on the screen', dur: 2400 },
  { kind: 'outro', dur: 4200 },
]
const XFADE = 700
const totalMs = scenes.reduce((a, s) => a + s.dur, 0)
const VID_SEC = (totalMs + XFADE + 600) / 1000

const sceneHtml = scenes
  .map((s, i) => {
    if (s.kind === 'intro') {
      return `<section class="scene intro" data-i="${i}">
        <div class="mark">${MARK}</div>
        <div class="eyebrow">Seventh-day Adventist</div>
        <h1 class="headline serif">Hymnal</h1>
        <div class="rule"></div>
        <p class="sub">Every hymn, in your pocket</p>
      </section>`
    }
    if (s.kind === 'outro') {
      return `<section class="scene outro" data-i="${i}">
        <div class="eyebrow">Free · No app store</div>
        <h1 class="headline serif">Get it on<br/>your phone</h1>
        <p class="sub">Open the link — install in a tap</p>
        <div class="pill">sdahymnal.vercel.app</div>
      </section>`
    }
    return `<section class="scene feature" data-i="${i}">
      <div class="eyebrow">${esc(s.eyebrow)}</div>
      <h2 class="headline">${esc(s.head)}</h2>
      <div class="device"><img src="shot-${s.img}.png" alt=""/></div>
    </section>`
  })
  .join('\n')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  .stage{position:relative;width:${W}px;height:${H}px;
    background:radial-gradient(125% 90% at 50% 16%, #1c1f22 0%, #0e1012 62%);
    color:#f2f3f3;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
  .scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:0 96px;
    opacity:0;transform:translateY(30px);
    transition:opacity ${XFADE}ms cubic-bezier(.22,1,.36,1),transform ${XFADE}ms cubic-bezier(.22,1,.36,1)}
  .scene.in{opacity:1;transform:none}
  .eyebrow{font-size:27px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#a7c3b1}
  .headline{font-weight:700;letter-spacing:-.02em;line-height:1.03;font-size:82px;margin-top:22px}
  .headline.serif{font-family:'EB Garamond',Georgia,'Times New Roman',serif;font-weight:600;font-size:104px}
  .feature .headline{font-size:76px}
  .sub{margin-top:26px;font-size:36px;color:#9aa0a5;font-weight:500}
  .rule{width:104px;height:4px;border-radius:2px;background:#a7c3b1;opacity:.7;margin:38px 0 4px}
  .mark{width:158px;height:158px;margin-bottom:36px}
  .device{margin-top:78px;width:512px;border-radius:48px;overflow:hidden;background:#000;
    box-shadow:0 44px 130px rgba(0,0,0,.6),0 0 0 2px rgba(255,255,255,.07);
    transition:transform 3.4s cubic-bezier(.22,1,.36,1)}
  .device img{display:block;width:100%}
  .scene.in .device{transform:scale(1.05)}
  .scene.in .headline,.scene.in .eyebrow,.scene.in .sub{animation:rise .8s cubic-bezier(.22,1,.36,1) both}
  .scene.in .eyebrow{animation-delay:.05s}
  .scene.in .headline{animation-delay:.14s}
  .scene.in .sub{animation-delay:.24s}
  @keyframes rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
  .pill{margin-top:44px;border:3px solid #a7c3b1;border-radius:60px;padding:26px 56px;
    font-size:46px;font-weight:700;letter-spacing:.01em}
</style></head><body>
  <div class="stage">${sceneHtml}</div>
  <script>
    const DUR=${JSON.stringify(scenes.map((s) => s.dur))};
    const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
    const els=[...document.querySelectorAll('.scene')];
    (async()=>{
      await wait(300);
      for(let i=0;i<els.length;i++){
        els[i].classList.add('in');
        await wait(DUR[i]);
        els[i].classList.remove('in'); // fades out as the next fades in → crossfade
      }
    })();
  </script>
</body></html>`
const htmlPath = `${DIR}promo.html`
await writeFile(htmlPath, html)

// ——————————————————————————— Pass 2: record the timeline ————————————————————
console.log('\nAnimating…')
const rec = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: DIR, size: { width: W, height: H } },
})
const stage = await rec.newPage()
await stage.goto(`file://${htmlPath}`)
await stage.waitForTimeout(totalMs + XFADE + 700)
await rec.close()
await browser.close()

const webm = (await readdir(DIR)).find((f) => f.endsWith('.webm'))
if (!webm) throw new Error('no recording produced')

// ——————————————————————————— Mux: audio + fades ————————————————————————————
console.log('Stitching…')
const track = SOUNDTRACK ?? (await buildBed(VID_SEC))
const bed = SOUNDTRACK
  ? `[1:a]volume=0.9`
  : `[1:a]aecho=0.8:0.9:1100:0.3,lowpass=f=1100,volume=0.85`
const vOut = Math.max(0, VID_SEC - 1.0).toFixed(2)
const aOut = Math.max(0, VID_SEC - 2.5).toFixed(2)

await run(FFMPEG, [
  '-y', '-i', `${DIR}${webm}`, '-i', track,
  '-filter_complex',
  `[0:v]fps=30,scale=${W}:${H},fade=t=in:st=0:d=0.6,fade=t=out:st=${vOut}:d=1.0,format=yuv420p[v];` +
    `${bed},afade=t=in:st=0:d=1.2,afade=t=out:st=${aOut}:d=2.5[a]`,
  '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '192k',
  '-t', VID_SEC.toFixed(2), '-movflags', '+faststart', OUT,
])

console.log(`\n${OUT}  (~${VID_SEC.toFixed(1)}s)`)
