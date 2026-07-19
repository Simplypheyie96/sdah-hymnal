// Adds a narration track to the walk-through, and proper end cards.
//
//   node scripts/narrate-walkthrough.mjs
//
// Each line below is spoken with macOS `say`, timed, and the matching scene is
// held exactly as long as its narration takes — so the picture never runs
// ahead of the voice. Run record-walkthrough.mjs first to produce the frames.
//
// The voice is a stock system one. It is clear and it is free, but it is
// plainly synthetic; re-record over the silent cut if you would rather use
// your own voice. Everything else about the video stays the same.

import { readdir, mkdir, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const run = promisify(execFile)
const DIR = fileURLToPath(new URL('../.video/', import.meta.url))
const VOICE_DIR = `${DIR}voice/`
const OUT = fileURLToPath(new URL('../docs/walkthrough.mp4', import.meta.url))

const VOICE = process.env.VOICE ?? 'Daniel' // en_GB, clear and unhurried
const RATE = 172 // words per minute; slower than default, easier to follow

const W = 1080
const H = 2340

// Scene → what is said over it. Frames are matched by their prefix number.
const SCRIPT = [
  { frame: '00', say: null, hold: 2.4 }, // splash, let it breathe
  { frame: '01', say: 'This is the Seventh-day Adventist Hymnal. All nine hundred and twenty of them, on your phone.' },
  { frame: '02', say: null, hold: 1.8 },
  { frame: '03', say: 'Search by title.' },
  { frame: '04', say: 'Or by a line you half remember. Streams of mercy finds hymn three hundred and thirty four.' },
  { frame: '05', say: 'If you know the number, key it straight in.' },
  { frame: '06', say: 'Every verse is here, with the refrain marked, at whatever size you find easy to read.' },
  { frame: '07', say: null, hold: 1.8 },
  { frame: '08', say: 'Press play and the recording carries the whole hymn, every verse. It downloads once, then works with no signal at all.' },
  { frame: '09', say: null, hold: 1.8 },
  { frame: '10', say: 'The same hymn in Yoruba. It finds the right number on its own, because the Yoruba hymnal numbers them differently.' },
  { frame: '11', say: null, hold: 1.8 },
  { frame: '12', say: 'Share a verse as a picture.' },
  { frame: '13', say: 'Four colours to choose from, and the link comes with it.' },
  { frame: '14', say: null, hold: 1.8 },
  { frame: '15', say: 'For church, the presenter fills the screen one verse at a time, big enough to read from the back.' },
  { frame: '16', say: null, hold: 1.8 },
  { frame: '17', say: 'Light or dark, four themes, and text as large as you need.' },
  { frame: '18', say: 'It remembers what you choose.' },
]

// ——— End card ———
async function endCard(file) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="100%" height="100%" fill="#17191b"/>
    <g transform="translate(${W / 2}, ${H * 0.36})">
      <text text-anchor="middle" fill="#f2f3f3" font-family="EB Garamond, Georgia, serif"
            font-size="96" font-weight="600">Hymnal</text>
      <text y="78" text-anchor="middle" fill="#8b9195"
            font-family="-apple-system, Helvetica, sans-serif" font-size="36">
        920 hymns, readings and benedictions
      </text>
      <text y="150" text-anchor="middle" fill="#8b9195"
            font-family="-apple-system, Helvetica, sans-serif" font-size="36">
        English and Yorùbá · works offline · free
      </text>
      <rect x="-60" y="220" width="120" height="3" rx="2" fill="#5c6469"/>
      <text y="330" text-anchor="middle" fill="#f2f3f3"
            font-family="-apple-system, Helvetica, sans-serif" font-size="44" font-weight="600">
        sdah-hymnal.vercel.app
      </text>
    </g>
  </svg>`
  await sharp(Buffer.from(svg)).png().toFile(`${DIR}${file}`)
}

// ——— Build ———
await rm(VOICE_DIR, { recursive: true, force: true })
await mkdir(VOICE_DIR, { recursive: true })

const files = (await readdir(DIR)).filter((f) => f.endsWith('.png')).sort()
const frameFor = (prefix) => files.find((f) => f.startsWith(`${prefix}-`))

const duration = async (file) => {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
  ])
  return parseFloat(stdout.trim())
}

const segments = []
let spoken = 0

for (const [i, step] of SCRIPT.entries()) {
  const frame = frameFor(step.frame)
  if (!frame) {
    console.log(`  (no frame ${step.frame})`)
    continue
  }

  let hold = step.hold ?? 2.4
  let audio = null

  if (step.say) {
    const aiff = `${VOICE_DIR}${String(i).padStart(2, '0')}.aiff`
    const m4a = `${VOICE_DIR}${String(i).padStart(2, '0')}.m4a`
    await run('say', ['-v', VOICE, '-r', String(RATE), '-o', aiff, step.say])
    await run('ffmpeg', ['-y', '-i', aiff, '-c:a', 'aac', '-b:a', '128k', m4a])
    // Hold the picture for the narration plus a beat either side.
    hold = (await duration(m4a)) + 0.9
    audio = m4a
    spoken += 1
  }

  segments.push({ frame: `${DIR}${frame}`, hold, audio })
  console.log(`  ${frame}  ${hold.toFixed(1)}s${step.say ? '  🔊' : ''}`)
}

// End card, spoken.
await endCard('99-end.png')
const endAiff = `${VOICE_DIR}99.aiff`
const endM4a = `${VOICE_DIR}99.m4a`
await run('say', ['-v', VOICE, '-r', String(RATE), '-o', endAiff,
  'It is free, and it always will be. Share it with your church.'])
await run('ffmpeg', ['-y', '-i', endAiff, '-c:a', 'aac', '-b:a', '128k', endM4a])
segments.push({ frame: `${DIR}99-end.png`, hold: (await duration(endM4a)) + 1.6, audio: endM4a })
console.log(`  99-end.png  🔊`)

// ——— Render each segment, then join ———
const parts = []
for (const [i, seg] of segments.entries()) {
  const part = `${VOICE_DIR}part-${String(i).padStart(2, '0')}.mp4`
  const args = ['-y', '-loop', '1', '-t', String(seg.hold), '-i', seg.frame]

  if (seg.audio) args.push('-i', seg.audio)
  else args.push('-f', 'lavfi', '-t', String(seg.hold), '-i', 'anullsrc=r=44100:cl=stereo')

  args.push(
    '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x17191b,fps=30,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
    '-af', 'adelay=500|500,apad', // small lead-in so speech never clips the cut
    '-shortest', '-t', String(seg.hold),
    part,
  )
  await run('ffmpeg', args)
  parts.push(part)
}

const listFile = `${VOICE_DIR}parts.txt`
await writeFile(listFile, parts.map((p) => `file '${p}'`).join('\n') + '\n')
await run('ffmpeg', [
  '-y', '-f', 'concat', '-safe', '0', '-i', listFile,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
  '-c:a', 'aac', '-b:a', '160k',
  '-movflags', '+faststart', OUT,
])

const { stdout } = await run('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'default=nw=1', OUT,
])
console.log(`\nNarrated with “${VOICE}” · ${spoken + 1} spoken lines`)
console.log(stdout.trim())
