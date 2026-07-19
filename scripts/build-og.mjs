// Renders the social share card.
//
//   node scripts/build-og.mjs
//
// This is the picture that appears when the link is pasted into WhatsApp,
// Facebook or a text message — for a lot of people it is the first thing they
// ever see of the app, so it carries the same mark as the icon and the splash
// rather than something invented for the occasion.
//
// Dark ground on purpose: nearly every other preview in a feed is white, and
// this one should not disappear between them.

import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const W = 1200
const H = 630
const OUT = fileURLToPath(new URL('../public/og.png', import.meta.url))

// The mark's own geometry, shared with favicon.svg and the splash. Its natural
// box is 324×262 starting at (94,140); place it centred on the left third.
const MARK_W = 324
const MARK_H = 262
const scale = 218 / MARK_W
const cx = 316
const cy = H / 2
const tx = cx - (94 + MARK_W / 2) * scale
const ty = cy - (140 + MARK_H / 2) * scale

// Staff lines behind the mark, fading out at both ends.
const staff = [0, 1, 2, 3, 4]
  .map((i) => `<rect x="70" y="${cy - 46 + i * 23}" width="492" height="2" fill="#3f464b" mask="url(#fade)"/>`)
  .join('\n    ')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" x2="1">
      <stop offset="0"    stop-color="#000"/>
      <stop offset="0.14" stop-color="#fff"/>
      <stop offset="0.86" stop-color="#fff"/>
      <stop offset="1"    stop-color="#000"/>
    </linearGradient>
    <mask id="fade"><rect x="70" y="0" width="492" height="${H}" fill="url(#g)"/></mask>
  </defs>

  <rect width="${W}" height="${H}" fill="#17191b"/>

  ${staff}

  <!-- Paper either side knocks the staff out from behind the mark, exactly as
       the splash does. -->
  <rect x="${cx - 132}" y="0" width="264" height="${H}" fill="#17191b"/>

  <g transform="translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
    <path d="M248 168c-40-28-96-38-148-27a8 8 0 0 0-6 8v190a8 8 0 0 0 10 8c46-10 96-2 134 22a8 8 0 0 0 10-7V168z" fill="#f2f3f3"/>
    <path d="M264 168c40-28 96-38 148-27a8 8 0 0 1 6 8v190a8 8 0 0 1-10 8c-46-10-96-2-134 22a8 8 0 0 1-10-7V168z" fill="#f2f3f3"/>
    <rect x="250" y="152" width="12" height="238" rx="6" fill="#8b9195"/>
    <g fill="#17191b">
      <rect x="126" y="232" width="92" height="12" rx="6"/>
      <rect x="126" y="274" width="66" height="12" rx="6"/>
    </g>
    <g fill="#17191b">
      <rect x="344" y="212" width="11" height="92" rx="5"/>
      <path d="M355 212c26 10 42 24 44 44 1 12-3 22-11 30 3-16-3-28-16-36-9-6-14-10-17-16v-22z"/>
      <ellipse cx="326" cy="304" rx="30" ry="23" transform="rotate(-19 326 304)"/>
    </g>
  </g>

  <g font-family="-apple-system, Helvetica Neue, Helvetica, Arial, sans-serif">
    <text x="640" y="212" fill="#8b9195" font-size="27" font-weight="600" letter-spacing="4.6">
      SEVENTH-DAY ADVENTIST
    </text>

    <text x="637" y="314" fill="#f2f3f3" font-size="104" font-weight="600"
          font-family="EB Garamond, Georgia, Times New Roman, serif">
      Hymnal
    </text>

    <rect x="641" y="352" width="86" height="3" rx="2" fill="#5c6469"/>

    <text x="640" y="419" fill="#c2c7ca" font-size="31">
      920 hymns, readings and benedictions
    </text>
    <text x="640" y="467" fill="#8b9195" font-size="29">
      English and Yorùbá · works offline · free
    </text>
  </g>
</svg>`

await sharp(Buffer.from(svg)).png().toFile(OUT)
console.log(`public/og.png — ${W}×${H}`)
