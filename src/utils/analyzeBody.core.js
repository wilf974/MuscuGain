// src/utils/analyzeBody.core.js
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const arr = (v) =>
  Array.isArray(v)
    ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()).slice(0, 6)
    : [];

export function normalizeBodyAnalysis(json) {
  const j = json && typeof json === 'object' ? json : {};
  return {
    morphotype: str(j.morphotype),
    balance: str(j.balance),
    bodyFatRange: str(j.bodyFatRange),
    strengths: arr(j.strengths),
    weaknesses: arr(j.weaknesses),
    trainingAdvice: arr(j.trainingAdvice),
    evolutionNote: str(j.evolutionNote),
  };
}
