// Draws a GTA-style multi-panel cover onto a canvas: the panels (each a photo,
// cover-fit with its own zoom and focal point), the Vice City grade (warm sunset
// wash, neon edge, vignette, halftone, grain), and the caption in big Anton
// lettering with an outline and a gradient fill. Everything is drawn from the
// state object, so the preview canvas and the export canvas render identically.
//
// A layout is a list of panels in normalized coordinates (0..1 of the cover).
// A panel is { photo, zoom, fx, fy } where fx/fy is the focal point of the photo
// (0..1) shown at the panel's centre and zoom is 1..2.5. Caption is
// { text, size, y, theme } where size multiplies the base size and y is the
// caption's baseline as a fraction of the cover height.

export const LAYOUTS = {
  poster: {
    name: 'Poster',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.6, w: 0.5, h: 0.4 },
      { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
    ],
  },
  grid: {
    name: 'Grid',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  solo: {
    name: 'Solo',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
};

export const THEMES = {
  sunset: {
    label: 'Sunset',
    fill: ['#fff8d8', '#ffb347', '#ff5e8a'],
    bar: ['#ff2e88', '#ff9a3d'],
    glow: 'rgba(255, 94, 138, 0.55)',
  },
  neon: {
    label: 'Neon',
    fill: ['#eafcff', '#7df9ff', '#ff5df2'],
    bar: ['#00e5ff', '#ff2e88'],
    glow: 'rgba(0, 229, 255, 0.55)',
  },
  gold: {
    label: 'Gold',
    fill: ['#fffbe0', '#ffd94d', '#ff8a00'],
    bar: ['#ffd94d', '#ff6a00'],
    glow: 'rgba(255, 180, 60, 0.55)',
  },
  mono: {
    label: 'Mono',
    fill: ['#ffffff', '#f2f2f8', '#c9c9de'],
    bar: ['#ffffff', '#9a9ab5'],
    glow: 'rgba(255, 255, 255, 0.5)',
  },
};

/** A small noise tile, drawn once and reused as the grain overlay. */
let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(128, 128);
  // A fixed seed, so the grain is the same on every render and every export.
  let seed = 123456789;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

/** A halftone dot tile, reused as the print-dot overlay. */
let dotTile = null;
function getDotTile() {
  if (dotTile) return dotTile;
  const c = document.createElement('canvas');
  c.width = 12;
  c.height = 12;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 12, 12);
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(3, 3, 1.4, 0, Math.PI * 2);
  ctx.arc(9, 9, 1.4, 0, Math.PI * 2);
  ctx.fill();
  dotTile = c;
  return c;
}

/**
 * Draws one panel's photo, cover-fit inside `rect` (pixels), zoomed around its
 * focal point. `rect` is already inset by the gutter.
 */
function drawPanel(ctx, rect, panel) {
  const img = panel.photo;
  if (!img) {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, '#3a1c5e');
    g.addColorStop(1, '#12041f');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `bold ${Math.max(14, rect.h * 0.06)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('DROP A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (panel.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  // The focal point (fx, fy of the photo) sits at the panel centre; clamp so the
  // photo never leaves a gap at the panel's edges.
  const cx = (panel.fx ?? 0.5) * dw;
  const cy = (panel.fy ?? 0.5) * dh;
  let dx = rect.x + rect.w / 2 - cx;
  let dy = rect.y + rect.h / 2 - cy;
  dx = Math.min(dx, rect.x);
  dx = Math.max(dx, rect.x + rect.w - dw);
  dy = Math.min(dy, rect.y);
  dy = Math.max(dy, rect.y + rect.h - dh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** The Vice City grade: sunset wash, neon edge, vignette, halftone, grain. */
function drawGrade(ctx, w, h) {
  // Warm sunset wash, strongest at the bottom.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, 'rgba(255, 170, 90, 0.05)');
  wash.addColorStop(0.55, 'rgba(255, 110, 60, 0.10)');
  wash.addColorStop(1, 'rgba(214, 38, 130, 0.30)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  // Pink glow in the top corner, like a low neon sun.
  const glow = ctx.createRadialGradient(w * 0.85, h * 0.08, 0, w * 0.85, h * 0.08, w * 0.55);
  glow.addColorStop(0, 'rgba(255, 80, 160, 0.20)');
  glow.addColorStop(1, 'rgba(255, 80, 160, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  // Halftone print dots, barely there.
  const dots = ctx.createPattern(getDotTile(), 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = dots;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // Vignette.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(8, 0, 18, 0)');
  vig.addColorStop(1, 'rgba(8, 0, 18, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  // Film grain.
  const grain = ctx.createPattern(getNoiseTile(), 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grain;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The caption: big Anton capitals, dark outline, gradient fill, neon bar. */
function drawCaption(ctx, w, h, caption) {
  const text = (caption.text || '').trim().toUpperCase();
  if (!text) return;
  const theme = THEMES[caption.theme] || THEMES.sunset;
  const base = Math.min(w, h) * 0.115 * (caption.size || 1);
  const y = h * (caption.y ?? 0.86);
  // A dark band behind the words, so they read over any photo.
  const band = ctx.createLinearGradient(0, y - base * 1.05, 0, y + base * 0.55);
  band.addColorStop(0, 'rgba(10, 0, 25, 0)');
  band.addColorStop(0.45, 'rgba(10, 0, 25, 0.55)');
  band.addColorStop(1, 'rgba(10, 0, 25, 0.55)');
  ctx.fillStyle = band;
  ctx.fillRect(0, y - base * 1.05, w, base * 1.6);

  let size = base;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = (s) => {
    ctx.font = `${s}px Anton, 'Arial Black', sans-serif`;
  };
  setFont(size);
  while (ctx.measureText(text).width > w * 0.94 && size > 12) {
    size -= 2;
    setFont(size);
  }
  const tw = ctx.measureText(text).width;
  ctx.save();
  ctx.translate(w / 2, y);
  ctx.transform(1, 0, -0.05, 1, 0, 0); // a slight forward lean
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = size * 0.18;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.085;
  ctx.strokeStyle = '#16042c';
  ctx.strokeText(text, 0, 0);
  ctx.shadowBlur = 0;
  const fill = ctx.createLinearGradient(0, -size * 0.85, 0, size * 0.1);
  fill.addColorStop(0, theme.fill[0]);
  fill.addColorStop(0.55, theme.fill[1]);
  fill.addColorStop(1, theme.fill[2]);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  // Neon bar under the words.
  const bar = ctx.createLinearGradient(w / 2 - tw * 0.42, 0, w / 2 + tw * 0.42, 0);
  bar.addColorStop(0, theme.bar[0]);
  bar.addColorStop(1, theme.bar[1]);
  ctx.fillStyle = bar;
  const bh = Math.max(3, size * 0.055);
  ctx.fillRect(w / 2 - tw * 0.42, y + size * 0.16, tw * 0.84, bh);
}

/**
 * Draws the whole cover for `state` ({ layout, panels, caption }) onto `canvas`
 * at its own pixel size. `gutterPx` is the gap between panels in pixels.
 */
export function drawCover(canvas, state, gutterPx = 8) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#0d0218';
  ctx.fillRect(0, 0, w, h);
  const layout = LAYOUTS[state.layout] || LAYOUTS.poster;
  const g = gutterPx;
  layout.panels.forEach((p, i) => {
    const rect = {
      x: p.x * w + (p.x > 0 ? g / 2 : 0),
      y: p.y * h + (p.y > 0 ? g / 2 : 0),
      w: p.w * w - (p.x > 0 ? g / 2 : 0) - (p.x + p.w < 1 ? g / 2 : 0),
      h: p.h * h - (p.y > 0 ? g / 2 : 0) - (p.y + p.h < 1 ? g / 2 : 0),
    };
    drawPanel(ctx, rect, state.panels[i] || {});
  });
  drawGrade(ctx, w, h);
  drawCaption(ctx, w, h, state.caption);
}

/** The panel rectangles (pixels) a layout covers on a canvas of this size. */
export function panelRects(canvas, layoutName, gutterPx = 8) {
  const { width: w, height: h } = canvas;
  const layout = LAYOUTS[layoutName] || LAYOUTS.poster;
  const g = gutterPx;
  return layout.panels.map((p) => ({
    x: p.x * w + (p.x > 0 ? g / 2 : 0),
    y: p.y * h + (p.y > 0 ? g / 2 : 0),
    w: p.w * w - (p.x > 0 ? g / 2 : 0) - (p.x + p.w < 1 ? g / 2 : 0),
    h: p.h * h - (p.y > 0 ? g / 2 : 0) - (p.y + p.h < 1 ? g / 2 : 0),
  }));
}
