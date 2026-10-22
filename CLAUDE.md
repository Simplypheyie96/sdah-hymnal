# SDAH Hymnal

## Now
Task · SEO for "sda hymnal" / "adventist hymnal" rankings; one Vercel domain
Done · sdah-hymnal.vercel.app is a 308 domain redirect (Vercel project setting) to sdahymnal.vercel.app. Build now runs scripts/seo-pages.mjs: 920 /hymn/N + 621 /yo/hymn/N static pages (title, description, lyrics, JSON-LD), crawlable hymn list on home, sitemap of 1,542 URLs. App opens the hymn in the path and keeps URL + tab title in step.
Next · IndexNow done (Bing 200, Yandex 202; key public/ffffd61a45084d2fa11637a3b57f7893.txt). Google Search Console: ownership verified (HTML tag in index.html, keep it), sitemap.xml submitted. Live test of / fails "Robots.txt unreachable" although robots.txt is 200 and PageSpeed (Google servers) scores SEO 100: likely Googlebot cached a DNS miss for the hostname new today. Recheck from 2026-10-23: URL Inspection on / → Request indexing, then a few hymns (/hymn/100). Biggest remaining lever: a real domain (e.g. sdahymnal.org) + backlinks from church sites/groups.
Files · scripts/seo-pages.mjs, src/App.tsx (linked, homeTitle, URL-sync effect), index.html (title/description)
Open · Rankings take weeks; .vercel.app subdomain caps authority.

## Decisions log
- 2026-10-22 · Search Console: property https://sdahymnal.vercel.app/ verified by HTML tag; sitemap submitted (first fetch "Couldn't fetch"); Request indexing rejected with Robots.txt unreachable on Googlebot only. Nothing changed on the site for it; retry after a day.
- 2026-10-22 · One link: sdah-hymnal.vercel.app kept attached as a 308 domain redirect, not removed (removing would 404 old links). Per-hymn prerendered pages + /hymn/N URLs added for search; static markup lives in #root and React replaces it on mount.
- 2026-10-22 · SEO: canonical domain is sdahymnal.vercel.app. Added <link rel=canonical>, public/robots.txt, public/sitemap.xml, and a permanent host redirect sdah-hymnal.vercel.app → sdahymnal.vercel.app in vercel.json. prototype/home-directions merged to main.
- 2026-10-22 · "For cover, let's do arc" meant the Arch variant (B) as the header, not an arched Cover edge; Cover removed, Arch in.
- 2026-10-22 · Header picked: Cover, with an arched lower edge (border-radius 50%/88px) instead of rounded corners; Arch, Book cover and the variant switcher removed. Surfaces behind text made near-opaque for readability: --glass .92 light / .9 dark, --paper-raised .92 light.
- 2026-10-22 · Header: Wordmark (too huge) and Lockup (not premium) rejected, and the header must read as its own region. New set: Cover, Arch, Book cover, all panels set apart from the list; .cover flips ink/accent tokens so the language switch inverts by itself.
- 2026-10-22 · Header: no added content (greeting, hymn of the day rejected); design only. Title page kept; Wordmark and Lockup replace the other two.
- 2026-10-22 · Looks picked: Mono Folded paper, Sage Olive branch, Rose Petals, Sky Cloud bank by day / Aurora by night. Top scrim was a paper slab visible at rest (read as a stray frame on tinted skies); now look-bg fixed + scroll-driven fade-in.
- 2026-10-22 · Looks legibility: secondary text darkened (light ink-2 32%/ink-3 38%, dark 87%/81%) and the darkest motifs softened (mono-1, sage-2, rose-3, sky-2 light); worst-case contrast over every motif peak now ≥4.89 on all 24 looks.
- 2026-10-22 · Looks: "same designs in different colors" rejected; each theme now gets its own three motifs, not shared recipes.
- 2026-10-21 · Icons: hand-drawn strokes ran to the 24px box edge and clipped; replaced with Remix (`KeypadIcon` = hashtag, `MusicOffIcon` = volume-mute, `PresentIcon` = slideshow-3).
