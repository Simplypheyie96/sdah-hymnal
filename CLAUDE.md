# SDAH Hymnal

## Now
Task · Home masthead redesign: three variations on prototype/home-directions, awaiting pick
Done · Looks picked and locked: Mono = Folded paper, Sage = Olive branch, Rose = Petals, Sky = Cloud bank (light) / Aurora (dark); keyed on data-accent only, other 7 motifs deleted. Stray "frame" fixed: the sticky search's top scrim now paints the page's own sky and fades in on scroll.
Next · User picks masthead A (Wordmark: huge left title), B (centred title page, user's favourite so far) or C (Lockup: accent badge + stacked title) via ?variant=a|b|c; then fold it into Home.tsx, drop the switcher, merge to main.
Files · src/components/Home.tsx (Masthead, LangSwitch), src/components/prototype/looks.css, prototype/bg/*.svg, icons.tsx (Music)
Open · SEO canonical domain still unchosen (proposed sdahymnal.vercel.app)

## Decisions log
- 2026-10-22 · Header: no added content (greeting, hymn of the day rejected); design only. Title page kept; Wordmark and Lockup replace the other two.
- 2026-10-22 · Looks picked: Mono Folded paper, Sage Olive branch, Rose Petals, Sky Cloud bank by day / Aurora by night. Top scrim was a paper slab visible at rest (read as a stray frame on tinted skies); now look-bg fixed + scroll-driven fade-in.
- 2026-10-22 · Looks legibility: secondary text darkened (light ink-2 32%/ink-3 38%, dark 87%/81%) and the darkest motifs softened (mono-1, sage-2, rose-3, sky-2 light); worst-case contrast over every motif peak now ≥4.89 on all 24 looks.
- 2026-10-22 · Looks: "same designs in different colors" rejected; each theme now gets its own three motifs, not shared recipes.
- 2026-10-21 · Icons: hand-drawn strokes ran to the 24px box edge and clipped; replaced with Remix (`KeypadIcon` = hashtag, `MusicOffIcon` = volume-mute, `PresentIcon` = slideshow-3).
