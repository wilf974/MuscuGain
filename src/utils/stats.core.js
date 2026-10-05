// src/utils/stats.core.js
// Statistiques pures pour le Dashboard « prochaine action » et l'Historique.
// Aucune dépendance navigateur (testable sous node --test). `now` toujours injectable.
import { localWeekKey, calendarDaysBetween } from './dates.core.js';

const ts = (s) => {
  const t = Date.parse(s && s.date);
  return Number.isFinite(t) ? t : null;
};

// Historique trié du plus récent au plus ancien (robuste si l'ordre stocké est altéré).
export function sortNewestFirst(history) {
  return (Array.isArray(history) ? history.filter(Boolean) : [])
    .map((s, i) => ({ s, t: ts(s), i }))
    .sort((a, b) => (b.t ?? -Infinity) - (a.t ?? -Infinity) || a.i - b.i)
    .map((x) => x.s);
}

const vol = (s) => {
  const v = Number(s && s.totalVolume);
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/**
 * Résumé de la semaine en cours vs la précédente (semaines lundi local).
 * → { thisWeek: {sessions, volume}, lastWeek: {sessions, volume}, volumeTrendPct|null,
 *     daysSinceLast|null, lastSession|null, weekStreak }
 */
export function weekSummary(history, now = new Date()) {
  const sorted = sortNewestFirst(history);
  const thisKey = localWeekKey(now);
  const prevMonday = new Date(now);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const lastKey = localWeekKey(prevMonday);

  const byWeek = new Map();
  for (const s of sorted) {
    const k = localWeekKey(s.date);
    if (!k) continue;
    const w = byWeek.get(k) || { sessions: 0, volume: 0 };
    w.sessions += 1;
    w.volume += vol(s);
    byWeek.set(k, w);
  }
  const empty = { sessions: 0, volume: 0 };
  const thisWeek = { ...(byWeek.get(thisKey) || empty) };
  const lastWeek = { ...(byWeek.get(lastKey) || empty) };
  thisWeek.volume = Math.round(thisWeek.volume);
  lastWeek.volume = Math.round(lastWeek.volume);
  const volumeTrendPct = lastWeek.volume > 0
    ? Math.round(((thisWeek.volume - lastWeek.volume) / lastWeek.volume) * 100)
    : null;

  // Série de semaines consécutives avec ≥1 séance (la semaine en cours compte si déjà entamée,
  // sinon on part de la semaine dernière pour ne pas « casser » la série un lundi matin).
  let weekStreak = 0;
  const cursor = new Date(now);
  if (!byWeek.has(thisKey)) cursor.setDate(cursor.getDate() - 7);
  for (let i = 0; i < 520; i++) {
    if (!byWeek.has(localWeekKey(cursor))) break;
    weekStreak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  const lastSession = sorted.find((s) => ts(s) !== null) || null;
  const daysSinceLast = lastSession ? Math.max(0, calendarDaysBetween(lastSession.date, now)) : null;

  return { thisWeek, lastWeek, volumeTrendPct, daysSinceLast, lastSession, weekStreak };
}

/**
 * Prochain programme suggéré : celui fait il y a le plus longtemps (jamais fait = prioritaire,
 * dans l'ordre de la liste). → { routine, lastDone: ISO|null } ou null si aucune routine.
 */
export function nextRoutine(routines, history) {
  const list = Array.isArray(routines) ? routines.filter((r) => r && r.name) : [];
  if (!list.length) return null;
  const lastDone = new Map();
  for (const s of sortNewestFirst(history)) {
    if (s.routineName && !lastDone.has(s.routineName)) lastDone.set(s.routineName, s.date);
  }
  let best = null;
  for (const r of list) {
    const d = lastDone.get(r.name) || null;
    if (!d) return { routine: r, lastDone: null };
    if (!best || Date.parse(d) < Date.parse(best.lastDone)) best = { routine: r, lastDone: d };
  }
  return best;
}

/**
 * Nombre de records de poids (PR) battus par séance, en rejouant l'historique chronologiquement.
 * Clé = id de séance (ou date si pas d'id). La 1ère occurrence d'un exercice n'est pas un PR.
 */
export function prCountBySession(history) {
  const chrono = sortNewestFirst(history).reverse();
  const best = {};
  const out = {};
  for (const s of chrono) {
    let count = 0;
    const sessionMax = {};
    for (const [name, sets] of Object.entries((s && s.exercises) || {})) {
      if (!Array.isArray(sets)) continue;
      for (const set of sets) {
        const w = Number(set && set.weight);
        if (set && set.done && Number.isFinite(w) && w > 0 && w > (sessionMax[name] || 0)) sessionMax[name] = w;
      }
    }
    for (const [name, w] of Object.entries(sessionMax)) {
      if (best[name] !== undefined && w > best[name]) count += 1;
      if (best[name] === undefined || w > best[name]) best[name] = w;
    }
    out[s.id || s.date] = count;
  }
  return out;
}
