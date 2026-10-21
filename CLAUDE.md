# SDAH Hymnal

## Now
Task · Visual redesign: 12 distinct designs (3 of its own per theme) over the UNCHANGED layout; user pick pending
Done · PR #58 on main, deployed. Prototype on branch prototype/home-directions (not main). Each look = sky gradient (::before) + one illustrated motif from src/components/prototype/bg/<theme>-<n>.svg used as a mask, filled with --motif (::after). Mono: Ink wash, Moonrise, Folded paper. Sage: Meadow, Olive branch, Dappled shade. Rose: Petals, Rose window, Silk. Sky: Cloud bank, Horizon, Aurora. Scrims = translucent paper with feathered mask (no backdrop-filter). Switcher ?variant=now|mono-1…sky-3 also sets the real accent
Next · On pick: write DESIGN.md from the winner(s), move tokens into src/index.css on main, drop switcher + losers. SEO: user to choose canonical domain (proposed sdahymnal.vercel.app), then canonical + robots.txt + sitemap.xml on main
Files · src/components/prototype/looks.css, src/components/prototype/bg/*.svg, src/components/prototype/PrototypeSwitcher.tsx, src/App.tsx, index.html
Open · User rejected: grid/laid lines, warm ivory (old A), accent-glow-on-indigo (old B), multi-hue combos, and one recipe recoloured per theme (Halo/Dunes/Window light). layout-check reads body bg (transparent in looks) so paint body with --paper before measuring
## Decisions log
- 2026-10-22 · Looks legibility: secondary text darkened (light ink-2 32%/ink-3 38%, dark 87%/81%) and the darkest motifs softened (mono-1, sage-2, rose-3, sky-2 light); worst-case contrast over every motif peak now ≥4.89 on all 24 looks.
- 2026-10-22 · Looks: "same designs in different colors" rejected; each theme now gets its own three motifs, not shared recipes.
- 2026-10-21 · Icons: hand-drawn strokes ran to the 24px box edge and clipped; replaced with Remix (`KeypadIcon` = hashtag, `MusicOffIcon` = volume-mute, `PresentIcon` = slideshow-3).
