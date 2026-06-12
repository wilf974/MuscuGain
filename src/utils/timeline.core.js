// src/utils/timeline.core.js
// Agrégats temporels pour la timeline corporelle enrichie.

function mondayOf(dateISO) {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDay(); // 0=dim … 6=sam
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

// Somme du volume par semaine ISO → [{x: lundi 'YYYY-MM-DD', y: volume}], trié chrono.
export function weeklyVolumePoints(history) {
  const weeks = {};
  for (const session of history || []) {
    const wk = mondayOf(session.date);
    if (!wk) continue;
    const v = Number(session.totalVolume);
    if (!Number.isFinite(v)) continue;
    weeks[wk] = (weeks[wk] || 0) + v;
  }
  return Object.entries(weeks)
    .map(([x, y]) => ({ x, y: Math.round(y) }))
    .sort((a, b) => (a.x < b.x ? -1 : 1));
}
