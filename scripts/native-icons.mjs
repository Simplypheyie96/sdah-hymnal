// Store app icons and launch screens, drawn from public/icon.svg.
// Run once after `npx cap add`, or whenever the icon changes: node scripts/native-icons.mjs
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import sharp from 'sharp'

const svg = await readFile('public/icon.svg', 'utf8')
const INK = '#17191b'
// Square, opaque: the stores round the corners themselves.
const square = Buffer.from(svg.replace('rx="112" ', ''))
// The mark alone, for Android's adaptive foreground and the launch screens.
const mark = Buffer.from(svg.replace(/<rect width="512" height="512"[^>]*\/>/, ''))
const png = (input, size) => sharp(input, { density: 72 * (size / 512) * 2 }).resize(size, size).png().toBuffer()

// iOS
const ios = 'ios/App/App/Assets.xcassets'
await writeFile(`${ios}/AppIcon.appiconset/AppIcon-512@2x.png`, await sharp(await png(square, 1024)).flatten({ background: INK }).png().toBuffer())

// Launch screen: the mark on the app's own paper, light and dark.
const splash = async (bg) =>
  sharp({ create: { width: 2732, height: 2732, channels: 4, background: bg } })
    .composite([{ input: await sharp(await png(Buffer.from(svg), 512)).png().toBuffer(), gravity: 'center' }])
    .flatten({ background: bg }).png().toBuffer()
const light = await splash('#f2f3f3')
const dark = await splash('#101214')
for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
  await writeFile(`${ios}/Splash.imageset/${f}`, f.endsWith('-1.png') ? dark : light)
await writeFile(`${ios}/Splash.imageset/Contents.json`, JSON.stringify({
  images: [
    { idiom: 'universal', filename: 'splash-2732x2732-2.png', scale: '1x' },
    { appearances: [{ appearance: 'luminosity', value: 'dark' }], idiom: 'universal', filename: 'splash-2732x2732-1.png', scale: '1x' },
    { idiom: 'universal', filename: 'splash-2732x2732.png', scale: '2x' },
    { appearances: [{ appearance: 'luminosity', value: 'dark' }], idiom: 'universal', filename: 'splash-2732x2732-1.png', scale: '2x' },
    { idiom: 'universal', filename: 'splash-2732x2732.png', scale: '3x' },
    { appearances: [{ appearance: 'luminosity', value: 'dark' }], idiom: 'universal', filename: 'splash-2732x2732-1.png', scale: '3x' },
  ],
  info: { version: 1, author: 'xcode' },
}, null, 2) + '\n')

// Android: legacy and round launchers, and the adaptive foreground (108dp, mark inside the 66dp safe zone).
const res = 'android/app/src/main/res'
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(dens)) {
  const dir = `${res}/mipmap-${d}`
  await mkdir(dir, { recursive: true })
  await writeFile(`${dir}/ic_launcher.png`, await png(Buffer.from(svg), 48 * k))
  const round = Buffer.from(svg.replace('rx="112"', 'rx="256"'))
  await writeFile(`${dir}/ic_launcher_round.png`, await png(round, 48 * k))
  const fg = 108 * k, inner = Math.round(fg * 0.72)
  await writeFile(`${dir}/ic_launcher_foreground.png`,
    await sharp({ create: { width: fg, height: fg, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: await png(mark, inner), gravity: 'center' }]).png().toBuffer())
}
await writeFile(`${res}/values/ic_launcher_background.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${INK.toUpperCase()}</color>\n</resources>\n`)

// Android before 12 shows drawable*/splash.png full screen: the same paper and mark, at each file's own size.
for (const d of (await readdir(res)).filter((d) => d.startsWith('drawable'))) {
  const f = `${res}/${d}/splash.png`
  let meta
  try { meta = await sharp(f).metadata() } catch { continue }
  const side = Math.round(Math.min(meta.width, meta.height) * 0.3)
  await writeFile(f, await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: '#f2f3f3' } })
    .composite([{ input: await png(Buffer.from(svg), side), gravity: 'center' }]).flatten({ background: '#f2f3f3' }).png().toBuffer())
}
console.log('icons and launch screens written')
