// src/utils/storage.core.js
// Lecture/écriture localStorage sûres + migration de schéma, avec un `store` injecté
// (interface getItem/setItem/removeItem) → testable sous node avec un faux store.
import { calculateVolume } from './format.js';

export const KEYS = {
  schema: 'muscuGainSchemaVersion',
  history: 'muscuGainHistory',
  historyBackup: 'muscuGainHistoryBackupV1',
  historyCorrupt: 'muscuGainHistoryCorrupt',
  routines: 'muscuGainCustomRoutines',
  bodyAnalyses: 'muscuGainBodyAnalyses',
  bodyConsent: 'muscuGainBodyConsent',
  measurements: 'muscuGainMeasurements',
  coach: 'muscuGainCoachAnalysis',
  activeSession: 'muscuGainActiveSession',
  lastFinished: 'muscuGainLastFinishedSession',
  customExercises: 'muscuGainCustomExercises',
  reminders: 'muscuGainReminders',
  lastReminder: 'muscuGainLastReminder',
  theme: 'muscuGainTheme',
  onboarded: 'muscuGainOnboarded',
  installDismissed: 'muscuGainInstallDismissed',
};

export const SCHEMA_VERSION = 2;

// JSON.parse tolérant : fallback si absent / invalide / rejeté par `validate`.
export function readJSON(store, key, fallback, validate) {
  let raw;
  try {
    raw = store.getItem(key);
  } catch {
    return fallback;
  }
  if (raw === null || raw === undefined) return fallback;
  try {
    const v = JSON.parse(raw);
    if (validate && !validate(v)) return fallback;
    return v;
  } catch {
    return fallback;
  }
}

// true si écrit, false si quota dépassé / stockage indisponible (mode privé…).
export function writeJSON(store, key, value) {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const isArray = (v) => Array.isArray(v);
export const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// Normalise une séance d'historique (v2) : id stable, exercises objet, volume numérique.
export function normalizeHistoryEntry(entry, index = 0) {
  if (!isObject(entry)) return null;
  const exercises = {};
  if (isObject(entry.exercises)) {
    for (const [name, sets] of Object.entries(entry.exercises)) {
      if (Array.isArray(sets)) exercises[name] = sets.filter(isObject);
    }
  }
  const t = Date.parse(entry.date);
  const vol = Number(entry.totalVolume);
  return {
    ...entry,
    id: typeof entry.id === 'string' && entry.id ? entry.id : `h_${Number.isFinite(t) ? t : 0}_${index}`,
    routineName: typeof entry.routineName === 'string' && entry.routineName ? entry.routineName : 'Séance',
    exercises,
    totalVolume: Number.isFinite(vol) ? vol : calculateVolume(exercises),
  };
}

// Historique v2 : entrées valides, ids uniques, tri récent → ancien.
export function normalizeHistory(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  list.forEach((e, i) => {
    const n = normalizeHistoryEntry(e, i);
    if (!n) return;
    let id = n.id;
    for (let k = 1; seen.has(id); k++) id = `${n.id}_${k}`;
    seen.add(id);
    out.push(id === n.id ? n : { ...n, id });
  });
  return out
    .map((s, i) => ({ s, t: Date.parse(s.date), i }))
    .sort((a, b) => (Number.isFinite(b.t) ? b.t : -Infinity) - (Number.isFinite(a.t) ? a.t : -Infinity) || a.i - b.i)
    .map((x) => x.s);
}

const BACKUP_MAX_CHARS = 1_500_000;

/**
 * Migre le stockage vers SCHEMA_VERSION. Idempotent, ne supprime jamais l'historique :
 * sauvegarde brute v1 (si taille raisonnable), JSON corrompu mis de côté, pas écrasé.
 * → { from, to, changed: string[] }
 */
export function migrateStorage(store, { now = Date.now(), newId } = {}) {
  const from = Number(store.getItem(KEYS.schema)) || 1;
  const changed = [];
  if (from >= SCHEMA_VERSION) return { from, to: from, changed };

  // --- Historique : ids stables (reprise idempotente), structure normalisée ---
  const rawHistory = store.getItem(KEYS.history);
  let history = [];
  if (rawHistory !== null) {
    let parsed;
    try {
      parsed = JSON.parse(rawHistory);
    } catch {
      parsed = undefined;
    }
    if (Array.isArray(parsed)) {
      if (rawHistory.length <= BACKUP_MAX_CHARS && store.getItem(KEYS.historyBackup) === null) {
        try { store.setItem(KEYS.historyBackup, rawHistory); changed.push('historyBackup'); } catch { /* quota */ }
      }
      history = normalizeHistory(parsed);
      if (writeJSON(store, KEYS.history, history)) changed.push('history');
    } else {
      // Illisible : on garde la donnée brute à part au lieu de la perdre.
      try { store.setItem(KEYS.historyCorrupt, rawHistory); changed.push('historyCorrupt'); } catch { /* quota */ }
      writeJSON(store, KEYS.history, []);
    }
  }

  // --- Dernière séance terminée : rattachement à son entrée d'historique ---
  const last = readJSON(store, KEYS.lastFinished, null, isObject);
  if (last && !last.sessionId) {
    const match = history.find((h) =>
      h.routineName === last.activeRoutine?.name &&
      Math.abs(Date.parse(h.date) - Number(last.finishedAt)) < 60_000);
    if (match) {
      writeJSON(store, KEYS.lastFinished, { ...last, sessionId: match.id });
    } else {
      // Sans lien fiable, une reprise créerait un doublon : on retire l'offre de reprise.
      store.removeItem(KEYS.lastFinished);
    }
    changed.push('lastFinished');
  }

  // --- Séance active : identifiant de séance ---
  const active = readJSON(store, KEYS.activeSession, null, isObject);
  if (active && !active.sessionId) {
    const id = newId ? newId() : `s_${now.toString(36)}`;
    writeJSON(store, KEYS.activeSession, { ...active, sessionId: id });
    changed.push('activeSession');
  }

  store.setItem(KEYS.schema, String(SCHEMA_VERSION));
  return { from, to: SCHEMA_VERSION, changed };
}
