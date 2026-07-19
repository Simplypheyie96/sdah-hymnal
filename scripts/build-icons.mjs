// Rasterises public/favicon.svg into the PNG sizes the manifest and iOS need.
//
//   node scripts/build-icons.mjs
//
// Re-run whenever the mark changes; nothing else depends on the PNGs.

import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { fileURLToPath } from 'node:url'

const SRC = new URL('../public/favicon.svg', import.meta.url)
const out = (name) => new URL(`../public/${name}`, import.meta.url)

const svg = await readFile(SRC)

const targets = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  // Plain PNG favicons. An SVG icon is enough for current desktop browsers,
  // but plenty of surfaces — tab switchers, history, older Android — only
  // look for a raster one, and when they find none they keep showing whatever
  // they cached earlier. That is how Vite's lightning bolt survived long
  // after the project stopped being a fresh scaffold.
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-16x16.png', size: 16 },
  // iOS ignores transparency and squares the corners itself, so the mark is
  // rendered onto its own ground rather than left to the system.
  { name: 'apple-touch-icon.png', size: 180 },
]

const INK = { r: 23, g: 25, b: 27, alpha: 1 }

for (const { name, size } of targets) {
  const png = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: INK })
    .png({ compressionLevel: 9 })
    .toBuffer()
  await writeFile(out(name), png)
  console.log(`${name.padEnd(26)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} KB`)
}

// Maskable needs its own composition. Android crops to a circle of the inner
// 80%, so the mark must sit well inside that; at full bleed the book's outer
// edges were being shaved off. Here the mark is inset onto a square ground —
// no rounded corners, because the platform applies its own mask.
const MASKABLE = 512
const INSET = 320 // leaves the mark comfortably inside the safe circle

const mark = await sharp(svg, { density: 384 }).resize(INSET, INSET).png().toBuffer()
const maskable = await sharp({
  create: { width: MASKABLE, height: MASKABLE, channels: 4, background: INK },
})
  .composite([{ input: mark, gravity: 'centre' }])
  .png({ compressionLevel: 9 })
  .toBuffer()

await writeFile(out('pwa-maskable-512.png'), maskable)
console.log(`${'pwa-maskable-512.png'.padEnd(26)} ${MASKABLE}×${MASKABLE}  ${(maskable.length / 1024).toFixed(1)} KB`)

// favicon.ico last, built from the PNGs above.
//
// Browsers request /favicon.ico by path whether or not the document links to
// one, and a 404 there is what leaves a stale icon in place. Shipping a real
// one settles it everywhere, including the surfaces that never read the HTML.
const ico = await pngToIco([
  fileURLToPath(out('favicon-16x16.png')),
  fileURLToPath(out('favicon-32x32.png')),
])
await writeFile(out('favicon.ico'), ico)
console.log(`${'favicon.ico'.padEnd(26)} 16+32   ${(ico.length / 1024).toFixed(1)} KB`)
