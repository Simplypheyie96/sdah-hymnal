# Sabbath promo video

A 9:16 portrait clip for WhatsApp Status, Instagram Reels, TikTok and YouTube
Shorts. It says "use your hymnals this Sabbath", and every cut, word and spark
lands on the beat of the song underneath it.

**Running order** (20 bars, about 45 seconds at 104 BPM):

| Bars  | Scene                                                                 |
| ----- | --------------------------------------------------------------------- |
| 1–2   | "It's *Sabbath!* Let's sing with **JOY**"                              |
| 3–4   | An iPhone rises in: *the whole hymnal in your pocket*, 0 → 920        |
| 5–12  | One feature per bar: search, number pad, verses, English & Yorùbá (two phones), sharing, the big screen, themes, offline |
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

- The script picks where the song starts on its own. It looks for the stretch
  as long as the video that is loudest and opens with the biggest lift, which
  is usually the chorus, and it skips a video's spoken intro. It prints the
  time it chose. To use another point, pass `--start 45` (seconds).
- It finds the tempo and the first downbeat itself. If the cuts feel twice as
  fast or slow as the song, pass `--bpm` with the right number. If they sit
  just off the beat, nudge them with `--offset` (seconds after the start).
- `--preview 7,24,58,68` writes those beats as stills to `.video/promo/` so
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
