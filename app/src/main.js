// Wires the page: pick a layout, photos and a caption, drag a panel to reframe
// it, and export the cover as a PNG. A `?shot=` query sets up a fixed scene for
// a screenshot instead (./shots.js). All work happens in the browser; no photo
// or caption ever leaves the machine.
import { drawCover, panelRects, LAYOUTS, THEMES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const overlay = document.getElementById('overlay');
const stage = document.getElementById('stage');
const captionInput = document.getElementById('caption');
const statusEl = document.getElementById('status');
const panelRow = document.getElementById('panels');
const zoomInput = document.getElementById('zoom');
const sizeInput = document.getElementById('cap-size');
const yInput = document.getElementById('cap-y');
const themeInput = document.getElementById('theme');
const exportSize = document.getElementById('export-size');

const SAMPLES = ['pier', 'boulevard'];
const PANEL_LABELS = {
  poster: ['Hero', 'Bottom left', 'Bottom right'],
  grid: ['Top left', 'Top right', 'Bottom left', 'Bottom right'],
  solo: ['Full cover'],
};

const state = {
  layout: 'poster',
  panels: [],
  caption: { text: 'Sunset Heist', size: 1, y: 0.86, theme: 'sunset' },
};
let selected = 0;
const sampleCache = new Map();

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSample(name) {
  if (!sampleCache.has(name)) sampleCache.set(name, loadImage(`samples/${name}.jpg`));
  return sampleCache.get(name);
}

function blankPanel() {
  return { photo: null, sample: null, zoom: 1, fx: 0.5, fy: 0.5 };
}

function fitPanelsToLayout() {
  const n = LAYOUTS[state.layout].panels.length;
  while (state.panels.length < n) state.panels.push(blankPanel());
  state.panels.length = n;
  if (selected >= n) selected = 0;
}

async function fillDefaults() {
  fitPanelsToLayout();
  for (let i = 0; i < state.panels.length; i++) {
    if (!state.panels[i].photo) {
      const name = SAMPLES[i % SAMPLES.length];
      state.panels[i].photo = await loadSample(name);
      state.panels[i].sample = name;
    }
  }
}

function redraw() {
  drawCover(canvas, state, 8);
  drawOverlay();
}

/** The selection outline on the overlay canvas (never part of the export). */
function drawOverlay() {
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (new URLSearchParams(location.search).get('shot') === 'cover') return;
  const rects = panelRects(canvas, state.layout, 8);
  const r = rects[selected];
  if (!r) return;
  ctx.save();
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 8]);
  ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  ctx.setLineDash([]);
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  const label = `Panel ${selected + 1} · ${(PANEL_LABELS[state.layout] || [])[selected] || ''}`;
  const tw = ctx.measureText(label).width;
  ctx.fillRect(r.x + 6, r.y + 6, tw + 16, 32);
  ctx.fillStyle = '#0d0218';
  ctx.fillText(label, r.x + 14, r.y + 29);
  ctx.restore();
}

function rebuildPanelButtons() {
  panelRow.innerHTML = '';
  const labels = PANEL_LABELS[state.layout] || [];
  state.panels.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panel-btn' + (i === selected ? ' active' : '');
    b.textContent = `${i + 1} · ${labels[i] || 'Panel'}${p.sample ? ` (${p.sample})` : ''}`;
    b.addEventListener('click', () => {
      selected = i;
      syncControls();
      redraw();
    });
    panelRow.appendChild(b);
  });
}

function syncControls() {
  rebuildPanelButtons();
  const p = state.panels[selected] || blankPanel();
  zoomInput.value = String(p.zoom);
  captionInput.value = state.caption.text;
  sizeInput.value = String(state.caption.size);
  yInput.value = String(state.caption.y);
  themeInput.value = state.caption.theme;
  document.querySelectorAll('#layouts button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
}

function setLayout(name) {
  state.layout = name;
  fitPanelsToLayout();
  fillDefaults().then(() => {
    syncControls();
    redraw();
  });
}

async function setPanelPhoto(i, img, sampleName) {
  state.panels[i].photo = img;
  state.panels[i].sample = sampleName || null;
  state.panels[i].zoom = 1;
  state.panels[i].fx = 0.5;
  state.panels[i].fy = 0.5;
  syncControls();
  redraw();
}

// --- pointer: click selects a panel, drag reframes its photo -----------------
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function panelAt(x, y) {
  const rects = panelRects(canvas, state.layout, 8);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
stage.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  selected = i;
  syncControls();
  redraw();
  drag = { i, x: p.x, y: p.y, moved: false };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const dx = p.x - drag.x;
  const dy = p.y - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
  const panel = state.panels[drag.i];
  const rects = panelRects(canvas, state.layout, 8);
  const r = rects[drag.i];
  const img = panel.photo;
  if (img && r) {
    const base = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight);
    const dw = img.naturalWidth * base * panel.zoom;
    const dh = img.naturalHeight * base * panel.zoom;
    panel.fx = Math.min(1, Math.max(0, panel.fx - dx / dw));
    panel.fy = Math.min(1, Math.max(0, panel.fy - dy / dh));
  }
  drag.x = p.x;
  drag.y = p.y;
  redraw();
});
stage.addEventListener('pointerup', () => {
  drag = null;
});

// --- controls ----------------------------------------------------------------
document.querySelectorAll('#layouts button').forEach((b) => {
  b.addEventListener('click', () => setLayout(b.dataset.layout));
});

document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = await loadImage(URL.createObjectURL(file));
  await setPanelPhoto(selected, img, null);
  statusEl.textContent = `Panel ${selected + 1} uses your photo.`;
  e.target.value = '';
});
document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', async () => {
    const img = await loadSample(b.dataset.sample);
    await setPanelPhoto(selected, img, b.dataset.sample);
  });
});
zoomInput.addEventListener('input', () => {
  const p = state.panels[selected];
  if (p) {
    p.zoom = Number(zoomInput.value);
    redraw();
  }
});
document.getElementById('recenter').addEventListener('click', () => {
  const p = state.panels[selected];
  if (p) {
    p.zoom = 1;
    p.fx = 0.5;
    p.fy = 0.5;
    syncControls();
    redraw();
  }
});
captionInput.addEventListener('input', () => {
  state.caption.text = captionInput.value;
  redraw();
});
sizeInput.addEventListener('input', () => {
  state.caption.size = Number(sizeInput.value);
  redraw();
});
yInput.addEventListener('input', () => {
  state.caption.y = Number(yInput.value);
  redraw();
});
themeInput.addEventListener('change', () => {
  state.caption.theme = themeInput.value;
  redraw();
});

stage.addEventListener('dragover', (e) => e.preventDefault());
stage.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const img = await loadImage(URL.createObjectURL(file));
  await setPanelPhoto(selected, img, null);
  statusEl.textContent = `Panel ${selected + 1} uses your dropped photo.`;
});

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = exportSize.value.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state, Math.round((8 * Math.min(w, h)) / 1080));
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed.';
      return;
    }
    const name = `neon-cover-${w}x${h}.png`;
    window.__lastExport = { width: w, height: h, bytes: blob.size, name };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    statusEl.textContent = `Saved ${name} (${Math.round(blob.size / 1024)} KiB).`;
  }, 'image/png');
});

// --- shots -------------------------------------------------------------------
/** Sets up a fixed scene from a ?shot= query (see shots.js). */
async function setupShot(cfg) {
  state.layout = cfg.layout || 'poster';
  state.caption = {
    text: cfg.caption ?? 'Sunset Heist',
    size: cfg.size ?? 1,
    y: cfg.capY ?? 0.86,
    theme: cfg.theme || 'sunset',
  };
  fitPanelsToLayout();
  const photos = cfg.photos || [];
  const seen = new Map();
  for (let i = 0; i < state.panels.length; i++) {
    const name = photos[i] || SAMPLES[i % SAMPLES.length];
    state.panels[i].photo = await loadSample(name);
    state.panels[i].sample = name;
    // A repeated photo gets a different crop, so no two panels look alike.
    const count = seen.get(name) || 0;
    seen.set(name, count + 1);
    state.panels[i].zoom = count > 0 ? 1.25 : 1;
    state.panels[i].fx = count > 0 ? 0.25 : 0.5;
    state.panels[i].fy = count > 0 ? 0.35 : 0.5;
  }
  syncControls();
  redraw();
}

// --- boot --------------------------------------------------------------------
const params = new URLSearchParams(location.search);
if (params.get('shot')) {
  runShot(params.get('shot'), params, setupShot);
} else {
  fillDefaults().then(() => {
    syncControls();
    redraw();
  });
}

// Anton is a local file; redraw once it is actually loaded so the caption uses
// it instead of the fallback.
if (document.fonts) {
  document.fonts.load('100px Anton').then(redraw).catch(() => {});
  document.fonts.ready.then(redraw).catch(() => {});
}
