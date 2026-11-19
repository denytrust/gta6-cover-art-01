# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/denytrust/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/denytrust/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Cover Studio: an offline web app that turns your photo and a caption
into a GTA-style multi-panel cover — the iconic poster look with a Vice City
neon-sunset grade — and exports it as a PNG to share. Everything runs in
your browser; no photo ever leaves your machine.

- Three layouts: Poster (1 hero + 2 panels), Grid (2×2), Solo (full cover).
- Every panel takes its own photo (upload, drag-and-drop, or the two bundled
  samples) with drag-to-reframe and a zoom slider.
- The caption is set in Anton (SIL Open Font License, vendored in
  `app/fonts/`) — big capitals with a dark outline, a gradient fill and a
  neon bar — with size, height and four colour styles.
- The grade: a warm sunset wash, a neon glow, halftone print dots, a
  vignette and film grain, all drawn on the canvas.
- Export PNG at 1080×1080, 1080×1350 or 1920×1080.

No Rockstar logo, artwork or font is used anywhere. The two sample photos
were made for make.fun with an image model and are free to use.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

- `main.ts` — the program. Copies `app/` and `screenshots/` to `/output`
  (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the vendored
  `vendor/makefun-app.ts` library.
- `REPORT.md` — design notes, file sizes, and the local test results.
- `screenshots/` — the cover (1-cover.jpg), the editor (2-editor.jpg) and a
  second cover (3-cover.jpg); the first by name is the cover.
