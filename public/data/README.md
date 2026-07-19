# Hymnal editions

Each language is one JSON file in this folder. The app fetches `<lang>.json`
lazily the first time someone opens that edition, renders **everything** the
file contains, and needs no code changes when a file grows or a new one
appears.

| File      | Edition                      | Status        |
| --------- | ---------------------------- | ------------- |
| `en.json` | Seventh-day Adventist Hymnal | loaded        |
| `yo.json` | Ìwé Orin Mímọ́ (Yorùbá)       | awaiting text |
| `ig.json` | Abụ Ọtụtọ (Igbo)             | not yet added |
| `ha.json` | Hausa hymnal                 | not yet added |

To enable an edition in the language switcher, set `available: true` for its
entry in `LANGS` in `src/data/hymns.ts`.

## File shape

```jsonc
{
  "lang": "en",
  "hymnalTitle": "Seventh-day Adventist Hymnal",
  "hymns": [
    {
      "number": 73,                    // number in THIS edition
      "songId": "sdah-73",             // stable id, see below
      "title": "Holy, Holy, Holy",
      "category": "Trinity",           // must match CATEGORIES in hymns.ts
      "kind": "hymn",                  // "hymn" | "reading"
      "author": "Reginald Heber",      // optional
      "sdahRef": 73,                   // optional; see cross-language notes
      "verses": [
        { "lines": ["Holy, holy, holy! Lord God Almighty!", "..."] },
        { "lines": ["..."], "isRefrain": true }
      ]
    }
  ]
}
```

### Fields

- **`number`** — the number printed in *this* hymnal. Editions number
  differently; that is expected and handled.
- **`songId`** — stable identity used for favourites and for following a song
  across languages. English uses `sdah-<number>`. Other editions use
  `<lang>-<number>` (e.g. `yo-57`).
- **`category`** — must be one of the strings in `CATEGORIES`
  (`src/data/hymns.ts`), otherwise the entry won't appear under any filter
  chip. Add new categories there first if an edition needs them.
- **`kind`** — `"hymn"` gets a melody button and verse labels; `"reading"`
  gets "Part 1, Part 2…" and no melody.
- **`sdahRef`** — for non-English editions, the English hymn number this song
  corresponds to. This is what links translations together and what selects
  the MIDI tune. Omit it when a song has no English counterpart.
- **`verses[].isRefrain`** — renders italic with the accent rule beside it.

## Cross-language numbering

Switching language follows `songId`/`sdahRef`, never the raw number. Yorùbá
No. 57 is English No. 73, so the Yorùbá entry reads:

```json
{ "number": 57, "songId": "yo-57", "sdahRef": 73, "title": "Mímọ́, Mímọ́, Mímọ́", ... }
```

Get `sdahRef` right and everything else follows: the language switcher lands
on the correct song, favourites stay in sync across editions, and the correct
MIDI plays.

## Melodies

Tunes live in `public/midi/` as zero-padded English hymn numbers —
`073.mid` for hymn 73. They are shared across editions via `sdahRef`, so a
translation needs no MIDI of its own.

## Diacritics

Store text as UTF-8 with real precomposed characters (`ẹ`, `ọ`, `ṣ`, `ị`,
`ụ`, `ń`, `ǹ`). The reading face (EB Garamond) covers Latin Extended, so
Yorùbá tone marks and Igbo dotted vowels render correctly at every size —
including on a projector.

## Validating a file

```bash
node -e "const f=require('./public/data/en.json');
const seen=new Set();
for (const h of f.hymns) {
  if (seen.has(h.songId)) throw new Error('duplicate songId '+h.songId);
  seen.add(h.songId);
  if (!h.title || !Array.isArray(h.verses)) throw new Error('bad entry '+h.number);
}
console.log(f.hymns.length+' entries OK');"
```
