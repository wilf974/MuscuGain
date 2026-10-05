// src/utils/timeline.core.js
// Agrégats temporels pour la timeline corporelle enrichie.
import { localWeekKey } from './dates.core.js';

// Somme du volume par semaine (lundi LOCAL) → [{x: lundi 'YYYY-MM-DD', y: volume}], trié chrono.
// Bucketing local : une séance dimanche 23h reste dans sa semaine, quel que soit le fuseau.
export function weeklyVolumePoints(history) {
  const weeks = {};
  for (const session of history || []) {
    const wk = localWeekKey(session.date);
    if (!wk) continue;
    const v = Number(session.totalVolume);
    if (!Number.isFinite(v)) continue;
    weeks[wk] = (weeks[wk] || 0) + v;
  }
  return Object.entries(weeks)
    .map(([x, y]) => ({ x, y: Math.round(y) }))
    .sort((a, b) => (a.x < b.x ? -1 : 1));
}
