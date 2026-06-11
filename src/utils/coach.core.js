// Fonctions pures pour le Coach IA : résumé d'historique, normalisations, suggestion de charge.
// Aucune dépendance (testable sous node --test).

const num = (v) => Number(v);
const roundHalf = (x) => Math.round(x * 2) / 2;

/**
 * Résumé compact et borné de l'historique d'entraînement.
 * @param {Array} history - séances [{ date, exercises: { name: [{ weight, reps, done }] } }]
 * @param {(name:string)=>string} categoryOf - mappe un nom d'exercice vers une catégorie
 */
export function buildHistorySummary(history, categoryOf) {
  const catOf = typeof categoryOf === 'function' ? categoryOf : () => 'other';
  const sessions = Array.isArray(history) ? history.slice(-30) : [];
  if (!sessions.length) {
    return { totalSessions: 0, perExercise: [], muscleVolume: {}, weeklyFrequency: 0 };
  }

  const dates = sessions
    .map((s) => s && s.date)
    .filter(Boolean)
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);
  const dateFrom = dates.length ? dates[0].toISOString() : '';
  const dateTo = dates.length ? dates[dates.length - 1].toISOString() : '';

  // perExercise : agrégation par nom
  const perEx = new Map(); // name -> { name, sessions, maxWeight, lastWeight, lastReps, firstMax, lastMax }
  const muscleVolume = {};

  for (const s of sessions) {
    const ex = s && s.exercises && typeof s.exercises === 'object' ? s.exercises : {};
    for (const [name, sets] of Object.entries(ex)) {
      if (!Array.isArray(sets)) continue;
      const doneSets = sets.filter((set) => set && set.done);
      if (!doneSets.length) continue;

      let entry = perEx.get(name);
      if (!entry) {
        entry = { name, sessions: 0, maxWeight: 0, lastWeight: 0, lastReps: 0, firstMax: null, lastMax: 0 };
        perEx.set(name, entry);
      }
      entry.sessions += 1;

      let sessionMax = 0;
      let lastWeight = 0;
      let lastReps = 0;
      for (const set of doneSets) {
        const w = num(set.weight);
        const r = num(set.reps);
        const wv = Number.isFinite(w) ? w : 0;
        const rv = Number.isFinite(r) ? r : 0;
        if (wv > entry.maxWeight) entry.maxWeight = wv;
        if (wv > sessionMax) sessionMax = wv;
        lastWeight = wv;
        lastReps = rv;
        const cat = catOf(name) || 'other';
        muscleVolume[cat] = (muscleVolume[cat] || 0) + wv * rv;
      }
      if (entry.firstMax === null) entry.firstMax = sessionMax;
      entry.lastMax = sessionMax;
      entry.lastWeight = lastWeight;
      entry.lastReps = lastReps;
    }
  }

  const perExercise = [...perEx.values()]
    .map((e) => {
      let trend = 'flat';
      const first = e.firstMax === null ? 0 : e.firstMax;
      if (e.lastMax > first) trend = 'up';
      else if (e.lastMax < first) trend = 'down';
      return {
        name: e.name,
        sessions: e.sessions,
        maxWeight: e.maxWeight,
        lastWeight: e.lastWeight,
        lastReps: e.lastReps,
        trend,
      };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 15);

  // weeklyFrequency : sessions / nb semaines couvertes
  let weeklyFrequency = 0;
  if (dates.length) {
    const spanMs = dates[dates.length - 1] - dates[0];
    const weeks = Math.max(1, spanMs / (7 * 24 * 60 * 60 * 1000));
    weeklyFrequency = Math.round((sessions.length / weeks) * 10) / 10;
  }

  return {
    totalSessions: sessions.length,
    dateFrom,
    dateTo,
    perExercise,
    muscleVolume,
    weeklyFrequency,
  };
}

/** Normalise la réponse d'analyse coach (null-safe, arrays cap 6, strings trim). */
export function normalizeCoachAnalysis(json) {
  const j = json && typeof json === 'object' ? json : {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const arr = (v) =>
    Array.isArray(v)
      ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()).slice(0, 6)
      : [];
  return {
    overview: str(j.overview),
    progression: arr(j.progression),
    plateaus: arr(j.plateaus),
    weeklyVolume: str(j.weeklyVolume),
    balance: str(j.balance),
    deload: str(j.deload),
    bodyCross: str(j.bodyCross),
  };
}

/** Normalise un programme généré ; ne garde que les exercices valides (cap 12). */
export function normalizeGeneratedProgram(json, validNames) {
  const j = json && typeof json === 'object' ? json : {};
  const valid = validNames instanceof Set ? validNames : new Set(Array.isArray(validNames) ? validNames : []);
  const name = typeof j.name === 'string' ? j.name.trim() : '';
  const list = Array.isArray(j.exercises) ? j.exercises : [];
  const exercises = list
    .filter((e) => e && valid.has(String(e.name).trim()))
    .map((e) => {
      const out = {
        name: String(e.name).trim(),
        targetSets: Math.max(1, parseInt(e.targetSets) || 3),
        targetReps: Math.max(1, parseInt(e.targetReps) || 10),
      };
      const rest = parseInt(e.restSeconds);
      if (rest > 0) out.restSeconds = rest;
      return out;
    })
    .slice(0, 12);
  return { name, exercises };
}

/** Suggestion de charge à partir du dernier log et des reps cible. */
export function suggestLoad(lastLog, targetReps) {
  if (!lastLog) return null;
  const w = num(lastLog.weight);
  if (!Number.isFinite(w)) return null;
  const reps = num(lastLog.reps);
  const target = num(targetReps) || 0;
  if (w > 0 && Number.isFinite(reps) && reps >= target) {
    return { weight: roundHalf(w + 2.5), bump: true };
  }
  return { weight: w, bump: false };
}
