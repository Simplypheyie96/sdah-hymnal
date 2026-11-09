// Turns the web build in dist/ into the store apps' bundle: the fonts come from
// inside the app (native/fonts/, see native-fonts.mjs) instead of Google, so a
// first launch with no signal still sets the hymns in their own type.
// It also empties #root of the search-engine text seo-pages.mjs adds, which
// otherwise flashed up as a list of hymn titles before the app started.
// Runs only from npm run ios / android; the web build never sees it.
import { cp, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

await cp('native/fonts', 'dist/fonts', { recursive: true })

const GOOGLE = /\s*<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>|<link\s+href="https:\/\/fonts\.googleapis\.com\/css2[^"]*"\s+rel="stylesheet"\s*\/?>/g
const SEO = /<div id="root"><style>\.seo[\s\S]*?<\/main><\/div>/
let pages = 0
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) await walk(p)
    else if (e.name.endsWith('.html')) {
      const html = await readFile(p, 'utf8')
      const out = html.replace(SEO, '<div id="root"></div>').replace(GOOGLE, (m) => (m.includes('stylesheet') ? '<link href="/fonts/fonts.css" rel="stylesheet" />' : ''))
      if (!out.includes('/fonts/fonts.css')) throw new Error(`${p}: Google Fonts link not found`)
      if (out.includes('class="seo"')) throw new Error(`${p}: search-engine text left in`)
      await writeFile(p, out)
      pages++
    }
  }
}
await walk('dist')
console.log(`native bundle: fonts local in ${pages} pages`)
