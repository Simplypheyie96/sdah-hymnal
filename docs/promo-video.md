# Sabbath promo video

A 9:16 portrait clip for WhatsApp Status, Instagram Reels, TikTok and YouTube
Shorts. It says "use your hymnals this Sabbath", and every cut, word and spark
lands on the beat of the song underneath it.

**Running order.** The bars below are for a slow song. On a quick one
(over 120 BPM, like RAYE's "Joy" at 140) the words still land on every beat,
but each phone screen and the closing card get two bars so they can be read.
That makes about 58 seconds at 140 BPM.

| Bars  | Scene                                                                 |
| ----- | --------------------------------------------------------------------- |
| 1–2   | "It's *Sabbath!* Let's sing with **JOY**"                              |
| 3–4   | An iPhone rises in: *the whole hymnal in your pocket*, 0 → 920        |
| 5–12  | One feature per bar (two on a quick song): search, number pad, verses, English & Yorùbá (two phones), sharing, the big screen, themes, offline |
| 13–16 | Light rays: "This Sabbath, open your **hymnal** … and sing with **joy!**" |
| 17–20 | "Happy Sabbath · Use your hymnals *this Sabbath*" and the link        |

## Making it

One-time setup on a Mac (Homebrew for ffmpeg, then the project):

```bash
brew install ffmpeg
git checkout claude/friendly-hawking-o2ygog
npm install
npx playwright install chromium
```

Then, in two terminal windows:

```bash
npm run dev                       # window 1: the app to film
node scripts/promo-video.mjs --music ~/Downloads/joy.mp3     # window 2
```

- The script picks where the song starts on its own: the first chorus, found
  as the loud stretch the song plays again note for note later on, starting
  on its first downbeat. A song with no clear repeat starts at its loudest
  stretch instead. It prints the time it chose; to use another point, pass
  `--start 45` (seconds).
- The beat grid is fitted to the drum hits, to a hundredth of a BPM, so the
  cuts stay on the beat to the last bar. It prints how many hits it lands on.
  `--bpm` pins the tempo if a song fools it; `--offset` shifts the first cut
  (seconds after the start).
- `--preview 7,24,58,68` writes those steps (0–80) as stills to `.video/promo/` so
  you can check the look in seconds before a full render (about 7 minutes).
- Without `--music` it renders silently at 120 BPM.

The phone is an iPhone 16 Pro drawn at its real proportions, and the
screenshots are taken at its native 1206 × 2622 pixels with the Dynamic Island
and home indicator safe areas, so the app sits on it exactly as it does on a
real phone.

Output: `docs/promo-sabbath.mp4` (not committed, since it is rebuilt from the song).

## About the music

A commercial song is copyrighted. A clip with it baked in may be muted or
taken down on Instagram, TikTok, YouTube and Facebook. Two safe routes:

1. **Post from the app's own music library.** Render once with the song to
   find its beat, then render again without `--music`, passing the `--bpm`
   the first run printed. Upload the silent file and add the song inside
   Instagram or TikTok, starting at the downbeat the first run printed
   (the start time plus the offset). Their libraries are licensed.
2. **WhatsApp Status and group chats** are not scanned the same way, so the
   version with the song baked in is usually fine to send there.
