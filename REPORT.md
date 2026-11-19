# REPORT — Neon Cover Studio (gta6-cover-art-01)

## What it is

An offline web app that turns a photo and a caption into a GTA-style
multi-panel cover with a Vice City neon-sunset grade, exported as a PNG.
Open `app/index.html` (via `node serve.ts`, http://localhost:8080) and the
cover is already there: the Poster layout with the two bundled sample photos
and the caption "Sunset Heist".

## How it works

- `app/src/cover.js` — the renderer. Layouts are lists of panels in
  normalized coordinates, so the same state draws at any export size. Each
  panel draws its photo cover-fit around its own zoom and focal point, then
  the grade is applied (sunset wash, neon glow, halftone dots, vignette,
  seeded film grain) and the caption is drawn in Anton with a dark outline,
  a gradient fill, a slight forward lean and a neon bar underneath.
- `app/src/main.js` — the editor state and wiring. Click a panel to pick it,
  drag it to reframe the photo, or use the zoom slider; upload a photo, drop
  an image file onto the cover, or use the Pier / Boulevard samples. The
  caption, its size, height and colour style are editable live. Export
  renders an offscreen canvas at 1080×1080, 1080×1350 or 1920×1080 and
  downloads the PNG.
- `app/src/shots.js` — fixed scenes for screenshots via `?shot=`: `cover`
  shows the cover alone, `editor` the app with a photo loaded. Query params
  pick the layout, the sample per panel, the caption and its style.
- `app/fonts/Anton-Regular.ttf` — Anton, Copyright 2020 The Anton Project
  Authors, SIL Open Font License 1.1 (`app/fonts/OFL.txt`). Loaded from a
  local file; no font, script, image or stylesheet is ever fetched from the
  network at runtime.
- `main.ts` — starter plumbing plus an authored header and a pre-flight
  check (app/ exists, screenshots/ non-empty, every screenshot ≤ 262144
  bytes, failing with the file's name); it copies `app/` and `screenshots/`
  to `/output` and writes `dossier.json` with `vendor/makefun-app.ts`.

## File sizes

| file | bytes |
| --- | --- |
| app/index.html | ~3.0 KiB |
| app/style.css | ~2.6 KiB |
| app/src/main.js | ~10.3 KiB |
| app/src/cover.js | ~9.3 KiB |
| app/src/shots.js | ~1.1 KiB |
| app/fonts/Anton-Regular.ttf | 170,812 |
| app/samples/pier.jpg | 59,923 |
| app/samples/boulevard.jpg | 58,675 |
| screenshots/1-cover.jpg (1080×1080) | 236,280 |
| screenshots/2-editor.jpg (1280×720) | 130,733 |
| screenshots/3-cover.jpg (1080×1080) | 258,453 |

All three screenshots are JPEGs under the 256 KiB cap. The app totals well
under the 48 MiB / 993-entry caps.

## Local tests (19 Nov 2026)

- Served with `node serve.ts` and opened in headless Chromium (Playwright
  chromium-1255): the cover and the editor render; the three screenshots
  were taken from `shots.json` at quality 88 and checked for size and for
  non-blank pixels.
- No-network check: a CDP session recorded every request while the page
  loaded and the cover was drawn — all requests were to localhost; no
  external host was contacted. A static grep over `app/` finds no `http://`,
  `https://` or protocol-relative URL.
- Export check: via CDP the Export button was clicked for 1080×1080; the
  page reported `window.__lastExport` (1080×1080, PNG bytes) and the
  download landed in the test download directory.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` (Node v24.22.1) wrote
  `out/dossier.json` plus complete copies of `app/` and `screenshots/`.

## What is not in here

No Rockstar Games logo, artwork or font. No network at runtime, no upload,
no account, no watermark. The sample photos are the kit's own, made for
make.fun with an image model.
