# SDAH Hymnal

## Now
Task · Home header picked: Cover with an arched lower edge, folded into Home.tsx on prototype/home-directions
Done · Looks picked and locked: Mono = Folded paper, Sage = Olive branch, Rose = Petals, Sky = Cloud bank (light) / Aurora (dark); keyed on data-accent only, other 7 motifs deleted. Stray "frame" fixed: the sticky search's top scrim now paints the page's own sky and fades in on scroll.
Next · Merge prototype/home-directions to main (user's go) and ship the SEO fix (canonical, robots.txt, sitemap.xml → sdahymnal.vercel.app).
Files · src/components/Home.tsx (Masthead, LangSwitch; search has -mt-[52px] to overlap the cover), src/components/prototype/looks.css (.cover at the end; glass/paper-raised opacity), prototype/bg/*.svg
Open · SEO: site is live at both sdahymnal.vercel.app and sdah-hymnal.vercel.app with no canonical, robots.txt or sitemap; og:url already says sdahymnal.vercel.app. Fix on main awaits user's go; Search Console verification is the user's step.

## Decisions log
- 2026-10-22 · Header picked: Cover, with an arched lower edge (border-radius 50%/88px) instead of rounded corners; Arch, Book cover and the variant switcher removed. Surfaces behind text made near-opaque for readability: --glass .92 light / .9 dark, --paper-raised .92 light.
- 2026-10-22 · Header: Wordmark (too huge) and Lockup (not premium) rejected, and the header must read as its own region. New set: Cover, Arch, Book cover, all panels set apart from the list; .cover flips ink/accent tokens so the language switch inverts by itself.
- 2026-10-22 · Header: no added content (greeting, hymn of the day rejected); design only. Title page kept; Wordmark and Lockup replace the other two.
- 2026-10-22 · Looks picked: Mono Folded paper, Sage Olive branch, Rose Petals, Sky Cloud bank by day / Aurora by night. Top scrim was a paper slab visible at rest (read as a stray frame on tinted skies); now look-bg fixed + scroll-driven fade-in.
- 2026-10-22 · Looks legibility: secondary text darkened (light ink-2 32%/ink-3 38%, dark 87%/81%) and the darkest motifs softened (mono-1, sage-2, rose-3, sky-2 light); worst-case contrast over every motif peak now ≥4.89 on all 24 looks.
- 2026-10-22 · Looks: "same designs in different colors" rejected; each theme now gets its own three motifs, not shared recipes.
- 2026-10-21 · Icons: hand-drawn strokes ran to the 24px box edge and clipped; replaced with Remix (`KeypadIcon` = hashtag, `MusicOffIcon` = volume-mute, `PresentIcon` = slideshow-3).
