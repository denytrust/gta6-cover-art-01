// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos;
// ?shot=cover shows the cover alone. Query params: layout (poster/grid/solo),
// photos (comma-separated sample names, one per panel), caption, theme
// (sunset/neon/gold/mono), size (caption scale) and capY (caption height).
// window.__shotReady is set once painted.
export async function runShot(shot, query, setupShot) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photos = (query.get('photos') || '').split(',').map((s) => s.trim()).filter(Boolean);
  await setupShot({
    layout: query.get('layout') || 'poster',
    photos,
    caption: query.get('caption') ?? 'Sunset Heist',
    theme: query.get('theme') || 'sunset',
    size: Number(query.get('size') || 1),
    capY: Number(query.get('capY') || 0.86),
  });
  if (document.fonts) {
    try {
      await document.fonts.load('100px Anton');
    } catch {
      // Fall back to the system bold face; the shot still renders.
    }
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
