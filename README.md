# SDA Hymnal — Hymns & Readings

The Seventh-day Adventist Hymnal as a web app: every hymn and responsive
reading, numbers 1 to 920, with recorded music, a Yorùbá edition, and a
projection mode for church. Works fully offline once installed.

**Live:** [sdahymnal.vercel.app](https://sdahymnal.vercel.app)

## What it does

- **920 entries** — 695 hymns and 225 worship aids (scripture readings), typed
  in on a number pad or found by title and first line.
- **691 recordings** — a play button on every hymn that has one. The audio
  lives on Cloudflare R2, not in this repo (see *Audio* below).
- **Yorùbá edition** — *Ìwé Orin Mímọ́*, 621 hymns, 278 of them cross-referenced
  to their English number so switching language lands on the same song.
  Sources and licences are in [docs/language-sources.md](docs/language-sources.md).
- **Phone, laptop, projector** — a presenter view for the operator and a
  receiver view for the screen. Casts with the Presentation API where the
  browser has it (Chrome and Edge with a Chromecast); explains screen
  mirroring where it does not (iPhone and iPad).
- **Offline** — installable PWA; the hymnal text ships with the app and the
  update prompt appears only when a new version is ready.
- Favourites, a share sheet, and a tip jar (Paystack).

## Stack

Vite · React · TypeScript · Tailwind v4 · vite-plugin-pwa · motion ·
Vercel Analytics · oxlint. Hosted on Vercel.

## Running it

```bash
npm install
npm run dev
```

| Script            | What it does                                              |
| ----------------- | --------------------------------------------------------- |
| `npm run dev`     | Vite dev server                                           |
| `npm run build`   | checks the audio host, type-checks, then builds to `dist/` |
| `npm run preview` | serves the production build                               |
| `npm run lint`    | oxlint                                                    |
| `npm run check:audio` | the audio check on its own                            |

### Environment

| Variable                   | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `VITE_AUDIO_BASE`          | Base URL of the recordings host. The build fails without it.       |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack public key for the tip jar.                               |
| `ALLOW_MISSING_AUDIO=1`    | Skip the audio check for a local build with no recordings.          |

### Audio

The 691 mp3s are about 1 GB and are not in git. They are served from a
Cloudflare R2 bucket named by `VITE_AUDIO_BASE`; `scripts/check-audio.mjs`
samples that host on every build so a release can never ship silently without
music. The reasoning is written down in [audio.config.json](audio.config.json).

## Data

Each edition is one JSON file in [public/data/](public/data/): `en.json`,
`yo.json`, plus `recordings.json` (which numbers have audio) and
`sdah-index.json`. The file shape, cross-language numbering and a validation
one-liner are documented in [public/data/README.md](public/data/README.md).
The scripts that assembled the datasets are in `scripts/` and
`data-pipeline/`.

## Licence

Code is MIT (see [LICENSE](LICENSE)). Hymn texts and recordings remain the
property of their respective copyright holders; the Yorùbá text is used under
its source's MIT licence with attribution shown in the app's Settings.
