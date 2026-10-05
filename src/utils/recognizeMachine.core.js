// Logique pure (testable hors navigateur) pour la reconnaissance de machine.

// Aplati EXERCISES_DB { categorie: [noms] } en une liste plate de noms d'exercices.
export function flattenExercises(db) {
  return Object.values(db || {}).flat();
}

// Normalise la réponse du backend en { label, candidates: [{exercise, confidence}] } (max 3).
// Tolère un JSON malformé ou partiel.
export function normalizeResult(json) {
  const out = { label: null, candidates: [] };
  if (!json || typeof json !== 'object') return out;
  if (typeof json.label === 'string' && json.label.trim()) out.label = json.label.trim();
  const arr = Array.isArray(json.candidates) ? json.candidates : [];
  out.candidates = arr
    .filter((c) => c && c.exercise)
    .map((c) => ({
      exercise: String(c.exercise).trim(),
      confidence: Number.isFinite(Number(c.confidence)) ? Number(c.confidence) : null,
      muscleGroup: typeof c.muscleGroup === 'string' && c.muscleGroup.trim() ? c.muscleGroup.trim() : null,
      inList: c.inList === true,
    }))
    .slice(0, 3);
  return out;
}

// Messages utilisateur par type d'erreur (scanner + analyse).
export const RECOGNIZE_MESSAGES = {
  offline: 'Pas de connexion : le scanner a besoin d’internet. Choisis dans le catalogue.',
  timeout: 'L’analyse prend trop de temps. Réessaie ou choisis dans le catalogue.',
  cancelled: 'Analyse annulée.',
  unavailable: 'Reconnaissance indisponible, choisis manuellement.',
  ratelimit: 'Trop de tentatives, réessaie dans 1 min.',
  empty: 'Machine non reconnue, choisis manuellement.',
  image: 'Image illisible, réessaie avec une autre photo.',
  invalid: 'Photo refusée (format ou taille). Réessaie avec une autre photo.',
};

// Type d'erreur à partir du contexte d'échec. Pur → testable.
// { online, aborted, timedOut, status, networkError }
export function recognizeErrorKind({ online = true, aborted = false, timedOut = false, status = null, networkError = false } = {}) {
  if (timedOut) return 'timeout';
  if (aborted) return 'cancelled';
  if (online === false) return 'offline';
  if (networkError) return 'unavailable';
  if (status === 429) return 'ratelimit';
  if (status === 504) return 'timeout';
  if (status === 400 || status === 413 || status === 415) return 'invalid';
  if (status !== null && (status < 200 || status >= 300)) return 'unavailable';
  return null;
}
