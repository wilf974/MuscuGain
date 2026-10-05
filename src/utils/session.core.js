// src/utils/session.core.js
// Machine de séance, logique pure : identifiants, ajout d'exercice idempotent, historique
// sans doublon à la reprise, timers basés sur des timestamps (fiables après arrière-plan iOS).
import { calculateVolume } from './format.js';

export const SESSION_VIEWS = ['setup', 'warmup', 'workout', 'cooldown'];
export const RESUME_WINDOW_MS = 2 * 60 * 60 * 1000;
export const DEFAULT_REST_SECONDS = 60;

export function newId(prefix = 's', now = Date.now(), rand = Math.random) {
  return `${prefix}_${now.toString(36)}_${Math.floor(rand() * 1e8).toString(36)}`;
}

export const exerciseName = (entry) => (typeof entry === 'string' ? entry : entry && entry.name) || '';

// Séries initiales d'un programme (poids : charge de départ, sinon dernier poids réalisé).
export function buildInitialWorkoutData(routine, getLastLog = () => null) {
  const data = {};
  for (const entry of (routine && routine.exercises) || []) {
    const name = exerciseName(entry);
    if (!name || data[name]) continue;
    const obj = typeof entry === 'object' ? entry : {};
    const targetSets = parseInt(obj.targetSets) || 4;
    const targetReps = parseInt(obj.targetReps) || 8;
    const last = getLastLog(name);
    const weight = obj.startingWeight || (last ? last.weight : '');
    data[name] = Array.from({ length: targetSets }, () => ({ weight, reps: targetReps, done: false }));
  }
  return data;
}

/**
 * Ajoute un exercice à la séance en cours. Idempotent : un exercice déjà présent
 * (casse ignorée) n'est ni dupliqué dans la routine ni réinitialisé dans les séries.
 * → { workoutData, routine, added, name }
 */
export function addExerciseToSession({ workoutData = {}, routine }, rawName, { sets = 4, lastLog = null } = {}) {
  const name = String(rawName || '').trim();
  const base = routine || { name: 'Séance libre', exercises: [] };
  if (!name) return { workoutData, routine: base, added: false, name };
  const exercises = Array.isArray(base.exercises) ? base.exercises : [];
  const lower = name.toLowerCase();
  const existing = exercises.map(exerciseName).find((n) => n.toLowerCase() === lower)
    || Object.keys(workoutData).find((n) => n.toLowerCase() === lower);
  if (existing) {
    // Répare une incohérence éventuelle (présent d'un côté seulement) sans toucher aux séries.
    const inRoutine = exercises.some((e) => exerciseName(e) === existing);
    return {
      workoutData: workoutData[existing] ? workoutData : { ...workoutData, [existing]: emptySets(sets, lastLog) },
      routine: inRoutine ? base : { ...base, exercises: [...exercises, existing] },
      added: false,
      name: existing,
    };
  }
  return {
    workoutData: { ...workoutData, [name]: emptySets(sets, lastLog) },
    routine: { ...base, exercises: [...exercises, name] },
    added: true,
    name,
  };
}

function emptySets(n, lastLog) {
  return Array.from({ length: n }, () => ({
    weight: lastLog && lastLog.weight ? lastLog.weight : '',
    reps: lastLog && lastLog.reps ? lastLog.reps : '',
    done: false,
  }));
}

// Durée en secondes entre deux timestamps (0 si incohérent).
export function durationSeconds(start, end) {
  const s = Number(start);
  const e = Number(end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return 0;
  return Math.floor((e - s) / 1000);
}

// Entrée d'historique d'une séance terminée.
export function buildHistoryEntry({ sessionId, routineName, workoutData, startTime, endTime, notes = '', now = Date.now() }) {
  return {
    id: sessionId || newId('h', now),
    date: new Date(now).toISOString(),
    routineName: routineName || 'Séance',
    exercises: workoutData || {},
    totalVolume: calculateVolume(workoutData || {}),
    durationSeconds: durationSeconds(startTime, endTime || now),
    notes: String(notes || '').trim(),
  };
}

/**
 * Insère ou REMPLACE (même id) une séance : reprendre une séance terminée puis
 * réenregistrer ne crée pas de doublon. Résultat trié récent → ancien.
 */
export function upsertHistoryEntry(history, entry) {
  const list = Array.isArray(history) ? history : [];
  const idx = entry.id ? list.findIndex((h) => h && h.id === entry.id) : -1;
  if (idx === -1) return [entry, ...list];
  const out = list.slice();
  // Une séance reprise garde sa date d'origine (pas de saut dans l'historique).
  out[idx] = { ...entry, date: list[idx].date || entry.date };
  return out;
}

// Secondes restantes d'un repos (arrondi supérieur : « 0:01 » jusqu'au bout).
export function restRemaining(restStartTime, restDuration, now = Date.now()) {
  const start = Number(restStartTime);
  const dur = Number(restDuration);
  if (!Number.isFinite(start) || !Number.isFinite(dur) || dur <= 0) return 0;
  return Math.max(0, Math.ceil((start + dur * 1000 - now) / 1000));
}

/**
 * État du repos au retour d'arrière-plan / rechargement. Si le repos s'est terminé
 * depuis plus de `graceMs`, on le clôt silencieusement (pas d'alarme surprise au réveil).
 * → { running, remaining, alarm }
 */
export function resolveRestState({ isRestTimerRunning, restStartTime, restInitialDuration }, now = Date.now(), graceMs = 15000) {
  if (!isRestTimerRunning || !restStartTime) return { running: false, remaining: 0, alarm: false };
  const remaining = restRemaining(restStartTime, restInitialDuration, now);
  if (remaining > 0) return { running: true, remaining, alarm: false };
  const endedAt = Number(restStartTime) + Number(restInitialDuration) * 1000;
  return { running: false, remaining: 0, alarm: now - endedAt <= graceMs };
}

export function canResume(lastFinished, now = Date.now(), windowMs = RESUME_WINDOW_MS) {
  if (!lastFinished || !lastFinished.activeRoutine || !lastFinished.sessionId) return false;
  const t = Number(lastFinished.finishedAt);
  // Tolère une horloge d'affichage en retard (rafraîchie toutes les 60 s) : -2 min admis.
  const age = now - t;
  return Number.isFinite(t) && age > -120000 && age < windowMs;
}

// Valide une séance active restaurée depuis le stockage ; null si inexploitable.
export function normalizeActiveSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw.activeRoutine;
  if (!r || typeof r !== 'object' || !Array.isArray(r.exercises)) return null;
  if (!SESSION_VIEWS.includes(raw.view)) return null;
  const workoutData = raw.workoutData && typeof raw.workoutData === 'object' && !Array.isArray(raw.workoutData)
    ? raw.workoutData : {};
  return { ...raw, workoutData, sessionId: raw.sessionId || newId() };
}
