// Runs after `vite build`. The app is one client-rendered page, so to a search
// engine it was a single empty <div>. This writes a real HTML page for every
// hymn (/hymn/100, /yo/hymn/12) with its own title, description and lyrics,
// puts a crawlable list of every hymn on the home page, and rebuilds the
// sitemap. React replaces the static markup the moment it mounts, and the app
// opens the hymn named in the path, so people see the normal app.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const SITE = 'https://sdahymnal.vercel.app'
const dist = new URL('../dist/', import.meta.url)
const template = readFileSync(new URL('index.html', dist), 'utf8')
const today = new Date().toISOString().slice(0, 10)

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '…')
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`

// Readable before the app's script arrives, in the page's own ink.
const STYLE =
  '<style>.seo{max-width:40rem;margin:0 auto;padding:32px 24px;color:var(--ink,#222);font:17px/1.6 Georgia,serif}.seo a{color:inherit}.seo ol{padding-left:2.5em}</style>'

function page({ path, title, description, body, data }) {
  const url = SITE + path
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace('</head>', `${ld(data)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${STYLE}<main class="seo">${body}</main></div>`)
}

const write = (path, html) => {
  const dir = new URL('.' + path + '/', dist)
  mkdirSync(dir, { recursive: true })
  writeFileSync(new URL('index.html', dir), html)
}

const editions = [
  { lang: 'en', prefix: '', book: 'SDA Hymnal', label: (h) => (h.kind === 'hymn' ? `Hymn ${h.number}` : `${h.number}`) },
  { lang: 'yo', prefix: '/yo', book: 'Ìwé Orin Mímọ́ (Yoruba SDA Hymnal)', label: (h) => `Orin ${h.number}` },
]

const urls = ['/']
const links = []

for (const ed of editions) {
  const { hymns } = JSON.parse(readFileSync(new URL(`data/${ed.lang}.json`, dist), 'utf8'))
  for (const h of hymns) {
    const lines = h.verses.flatMap((v) => v.lines)
    if (!lines.length) continue
    const path = `${ed.prefix}/hymn/${h.number}`
    const name = h.altTitle ? `${h.title} (${h.altTitle})` : h.title
    const title = `${ed.label(h)}: ${name} — ${ed.book}`
    const description = clip(`${ed.book} #${h.number}, ${h.title}. Lyrics: ${lines.join(' / ')}`, 158)
    const verses = h.verses.map((v) => `<p>${v.lines.map(esc).join('<br>')}</p>`).join('')
    const body =
      `<p><a href="/">${esc(ed.book)}</a>${h.category ? ` · ${esc(h.category)}` : ''}</p>` +
      `<h1>${esc(ed.label(h))}: ${esc(h.title)}</h1>` +
      (h.altTitle ? `<p><em>${esc(h.altTitle)}</em></p>` : '') +
      verses
    const data = {
      '@context': 'https://schema.org',
      '@type': h.kind === 'hymn' ? 'MusicComposition' : 'CreativeWork',
      name: h.title,
      ...(h.altTitle && { alternateName: h.altTitle }),
      inLanguage: ed.lang,
      url: SITE + path,
      position: h.number,
      isPartOf: { '@type': 'Book', name: ed.book, url: SITE + '/' },
      ...(h.kind === 'hymn' && { lyrics: { '@type': 'CreativeWork', text: lines.join('\n') } }),
    }
    write(path, page({ path, title, description, body, data }))
    urls.push(path)
    links.push(`<li value="${h.number}"><a href="${path}">${esc(name)}</a></li>`)
  }
}

// Home: the same app, plus every hymn as a plain link so crawlers find them all.
const home = template
  .replace('</head>', `${ld({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SDA Hymnal',
    alternateName: ['SDAH', 'Seventh-day Adventist Hymnal', 'Adventist Hymnal', 'Ìwé Orin Mímọ́'],
    url: SITE + '/',
  })}\n  </head>`)
  .replace(
    '<div id="root"></div>',
    `<div id="root">${STYLE}<main class="seo"><h1>SDA Hymnal — Seventh-day Adventist Hymnal</h1>` +
      `<p>All 920 hymns and readings of the Seventh-day Adventist Hymnal (SDAH), with lyrics, recordings and projection, plus the Yoruba Ìwé Orin Mímọ́. Free, and works offline.</p>` +
      `<ol>${links.join('')}</ol></main></div>`,
  )
writeFileSync(new URL('index.html', dist), home)

writeFileSync(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    `\n</urlset>\n`,
)

console.log(`seo-pages: ${urls.length - 1} hymn pages, sitemap with ${urls.length} URLs`)
