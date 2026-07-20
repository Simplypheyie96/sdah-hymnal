# Promo film — introduction & install

A ~30-second portrait film that introduces the app and asks one thing: open
the link and add it to your phone. Made to share from a phone — WhatsApp
status, Reels, Shorts, a group chat.

Generated, not filmed. `scripts/record-promo.mjs` drives the real app in a
phone-sized browser, draws the title cards in the app's own type, and stitches
everything with ffmpeg — the same machinery as the walk-through, cut shorter
and softer.

## Making it

```
node scripts/record-promo.mjs [url] [soundtrack.mp3]
```

- `url` — the site to record. Defaults to `https://sdahymnal.vercel.app`.
- `soundtrack.mp3` — a hymn recording to lay under the picture. Omit it and a
  soft placeholder drone is generated instead, so the timing can be judged.

Requires **ffmpeg** on `PATH` (or set `FFMPEG` to a binary). The finished file
lands at `docs/promo.mp4`; working frames go to `.promo/` (gitignored).

## The beats (~34s)

1. Title card — the mark, **Hymnal**, "Hymns & readings, 1–920 · English & Yorùbá"
2. Home, with the "add to your phone" nudge on screen
3. _Find any hymn_ — a search for "streams of mercy"
4. Rock of Ages (300), then the recording playing every verse
5. _English & Yorùbá_ — the same hymn as No. 224, Àpáta Ayérayé (the music
   plays straight through the language switch)
6. _For the whole church_ — the projection screen
7. Outro — "No app store. Open it. Add to your phone." with the link

Copy and pacing live in the script; edit the `titleCard(...)` calls to change a
line, or a scene's `hold` to change how long it sits.

## What's left: the music

The film wants a hymn under it. Pass one as the second argument:

```
node scripts/record-promo.mjs https://sdahymnal.vercel.app 300.mp3
```

**300 (Rock of Ages)** is the natural pick — it is the hymn on screen, so the
sound matches the picture. Any soft recording works.

Two notes on getting the file:

- The recordings live in the **R2 bucket** (`VITE_AUDIO_BASE`), not in this
  repo. To pull one, play that hymn once in the app (it downloads for offline
  use) or fetch `<base>/300.mp3` from the bucket directly.
- A recording belongs to its **performers and publishers**. Clear the rights
  before publishing a promo built on one, or use a public-domain instrumental.

The committed `docs/promo.mp4` currently carries the **placeholder drone** —
running the command above with a hymn replaces it in place.

## Sharing

Send it alongside the link. WhatsApp compresses video hard; if it looks soft,
upload to YouTube as **Unlisted** and share that link instead.
