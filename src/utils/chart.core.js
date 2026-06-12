// src/utils/chart.core.js
// Math pur des courbes SVG : axe X = temps réel (dates), axe Y = valeur.
// Renvoie des coordonnées dans le viewBox, pas de DOM ici.

function clean(points) {
  return (points || [])
    .map((p) => ({ t: new Date(p.x).getTime(), y: Number(p.y) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.y))
    .sort((a, b) => a.t - b.t);
}

export function chartCoords(points, { width = 320, height = 120, pad = 8, yMin = null, yMax = null } = {}) {
  const pts = clean(points);
  if (pts.length < 2) return { coords: [], min: null, max: null };
  const t0 = pts[0].t;
  const tSpan = pts[pts.length - 1].t - t0 || 1;
  const lo = yMin !== null ? yMin : Math.min(...pts.map((p) => p.y));
  const hi = yMax !== null ? yMax : Math.max(...pts.map((p) => p.y));
  const flat = hi === lo;
  const ySpan = hi - lo || 1;
  const coords = pts.map((p) => ({
    x: pad + ((p.t - t0) / tSpan) * (width - pad * 2),
    y: flat ? height / 2 : height - pad - ((p.y - lo) / ySpan) * (height - pad * 2),
  }));
  return { coords, min: lo, max: hi };
}

export function seriesDomain(series) {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series || []) {
    for (const p of clean(s.points)) {
      if (p.y < min) min = p.y;
      if (p.y > max) max = p.y;
    }
  }
  if (min === Infinity) return { min: null, max: null };
  return { min, max };
}
