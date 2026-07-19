# Hymn recordings

691 MP3s covering hymns 1–694 (missing 251, 450, 695; 683 does not exist in
the hymnal). Roughly 1 GB in total, which is why they are **not committed** —
a repository that size is slow to clone and exceeds GitHub's LFS free tier
several times over.

## Local development

Unzip the recordings into this folder, named by hymn number:

```
public/audio/1.mp3
public/audio/2.mp3
...
```

The app reads them from here by default, so nothing else is needed.

## Production

Two options.

**Serve them with the site.** Upload `dist/` including `dist/audio/` directly
to Netlify or Vercel via their CLI rather than through a git deploy, since the
files are not in the repository.

**Serve them from object storage** — better for cost and deploy speed. Upload
the folder to Cloudflare R2 (10 GB free, no egress charges) or Backblaze B2,
then point the app at it at build time:

```
VITE_AUDIO_BASE=https://your-bucket.r2.dev/audio npm run build
```

Nothing else changes: the player builds its URLs from that base, and the
service worker still caches each recording after it is first played, so
offline use is unaffected either way.
