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
    }))
    .slice(0, 3);
  return out;
}
