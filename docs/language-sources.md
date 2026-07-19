# Language sources

What exists for each edition, so nobody has to repeat the search.

## Yorùbá — done

**Ìwé Orin Mímọ́**, 621 hymns, live in the app.

Source: [fisayoafolayan/sdahymnalyorubaweb](https://github.com/fisayoafolayan/sdahymnalyorubaweb),
MIT licensed. Its README asks third-party apps to bundle a copy and credit the
source; `scripts/build-yoruba.mjs` does both, and the attribution renders in
Settings from the edition file itself. Re-run the script to pick up upstream
corrections.

278 of the 621 carry an `SDAH` cross-reference. The rest reach their English
counterpart through the normalised-title fallback in `hymnal.tsx`, using the
`english_title` field the dataset ships.

## English — importer ready, data not

`scripts/import-english.mjs` converts a scraped `sdah_hymns.json` into
`public/data/en.json`. Run it and all 919 entries render.

Datasets checked, none usable as an open source:

| Repo | Contents | Licence |
| --- | --- | --- |
| [GoGoShift/Hymnal-Flutter](https://github.com/GoGoShift/Hymnal-Flutter) | SDAH en/es/pt/ru | **none** — README claims open source, no LICENSE file |
| [GospelSounders/hymnals-data](https://github.com/GospelSounders/hymnals-data) | SDAH, CH1941, others | **none** |
| [josmithua/song-data](https://github.com/josmithua/song-data) | BHB, SS&S only — no SDAH | AGPL-3.0 |
| [yozachar/hymnal](https://github.com/yozachar/hymnal) | Malayalam only | AGPL-3.0 |

The two repos that actually carry SDAH have no licence at all, which means no
grant. The two that are properly licensed don't carry it.

## Igbo — no open source found

**Abụ Ọtụtọ** is the Adventist hymnal for Eastern Nigeria: 294 hymns with
sol-fa notation. It exists as a closed Android app (ABU OTUTO, music advice by
Chikezie Chike-Michael) with no exported data, no API, and no repository.

Leads worth pursuing by hand:

- the app's author, for collaboration or a data export
- Eastern Nigeria Union Conference offices
- ["Indigenous SDA Songs in Ngwa Land"](https://www.scribd.com/document/574803970/81165998450-159085356962),
  a paper that references SDAH ↔ Abụ Ọtụtọ numbering and may contain a partial
  concordance

## Hausa — nothing digitised

No Adventist Hausa hymnal appears to exist in digital form anywhere.

The Hausa hymnals that *are* online are different books from other traditions —
**Littafin Wakoki** (Sacred Songs & Solos in Hausa, SIM Bookshop, 1957) and
Hausa Audio Hymnal. Useful to know so they aren't mistaken for the Adventist
hymnal.

Realistic route: the Northern Nigeria Union Conference or the West-Central
Africa Division. If it comes together here it would likely be the first digital
Hausa Adventist hymnal anywhere.

## Adding an edition

See `public/data/README.md` for the file format. Set `available: true` for the
language in `LANGS` (`src/data/hymns.ts`) and it appears in the switcher.
