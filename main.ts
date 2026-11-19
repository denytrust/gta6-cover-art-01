// Neon Cover Studio — a GTA 6-style cover maker, built for make.fun's
// gta6-cover-art-01 bounty.
//
// The app itself lives in app/: an offline, single-page cover studio that
// turns a person's photos and a caption into a multi-panel poster in the
// Vice City neon-sunset style and exports it as a PNG to share. This
// program is only the hand-in: it checks the entry's folders first, then
// copies app/ and screenshots/ from beside this file into the output
// directory and writes dossier.json, the summary the house AI judge reads,
// using the vendored make.fun library. Nothing here phones home; the
// photos never leave the machine that runs the app.
//
// A working gta6-cover-art-01 entry (Node 22, standard library only): the app is this directory's app/ folder, plain
// static files a desktop browser loads offline (app/index.html and its ES modules, no library and no network
// request), and the program hands it in. It copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library. Only the plumbing, not the
// cover art the bounty asks for: Cover Snap, a plain one-photo square cover with a sunset tint and a bold caption,
// exported as a 1080 x 1080 PNG. Its two sample photos (app/samples/) were made for make.fun with an image model and
// are free to use. Build your own GTA-style cover maker in its place, put your 3 or 4 PNG or JPEG screenshots in
// screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight checks, before anything is copied: fail fast with a named
// file, so a bad screenshot never reaches the dossier the judge reads.
const appDir = join(here, 'app');
if (!existsSync(appDir)) throw new Error('Neon Cover Studio: app/ folder is missing beside main.ts');
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) throw new Error('Neon Cover Studio: screenshots/ folder is missing beside main.ts');
const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shots.length === 0) throw new Error('Neon Cover Studio: screenshots/ is empty — add 3 or 4 cover screenshots first');
for (const name of shots) {
  const entry = statSync(join(shotsDir, name));
  if (entry.isFile() && entry.size > 262144) {
    throw new Error(`Neon Cover Studio: screenshot ${name} is ${entry.size} bytes, over the 262144-byte cap`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
