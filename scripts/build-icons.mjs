// Rasterises public/favicon.svg into the PNG sizes the manifest and iOS need.
//
//   node scripts/build-icons.mjs
//
// Re-run whenever the mark changes; nothing else depends on the PNGs.

import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const SRC = new URL('../public/favicon.svg', import.meta.url)
const out = (name) => new URL(`../public/${name}`, import.meta.url)

const svg = await readFile(SRC)

const targets = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
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
