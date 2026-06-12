// src/utils/records.core.js
// PR = poids max sur une série validée (done) par exercice.

function bestDoneWeight(sets) {
  let best = null;
  for (const s of sets) {
    if (!s.done) continue;
    const w = Number(s.weight);
    if (!Number.isFinite(w) || w <= 0) continue;
    if (best === null || w > best) best = w;
  }
  return best;
}

export function computePRs(history) {
  const prs = {};
  for (const session of history || []) {
    for (const [exName, sets] of Object.entries(session.exercises || {})) {
      const w = bestDoneWeight(sets);
      if (w === null) continue;
      if (prs[exName] === undefined || w > prs[exName]) prs[exName] = w;
    }
  }
  return prs;
}

export function detectNewPRs(historyBefore, newEntry) {
  const prev = computePRs(historyBefore);
  const out = [];
  for (const [exName, sets] of Object.entries(newEntry.exercises || {})) {
    const w = bestDoneWeight(sets);
    if (w === null) continue;
    if (prev[exName] === undefined || w > prev[exName]) {
      out.push({ exercise: exName, weight: w });
    }
  }
  return out;
}

// --- P4 : 1RM estimé (Epley) + PR « force » (plus de reps au poids max) ---

export function epley1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(r) || r <= 0) return null;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 2) / 2;
}

export function compute1RMs(history) {
  const out = {};
  for (const session of history || []) {
    for (const [exName, sets] of Object.entries(session.exercises || {})) {
      for (const s of sets) {
        if (!s.done) continue;
        const rm = epley1RM(s.weight, s.reps);
        if (rm === null) continue;
        if (out[exName] === undefined || rm > out[exName]) out[exName] = rm;
      }
    }
  }
  return out;
}

function bestDoneRepsAtWeight(history, exName, weight) {
  let best = 0;
  for (const session of history || []) {
    const sets = (session.exercises || {})[exName];
    if (!sets) continue;
    for (const s of sets) {
      if (!s.done || Number(s.weight) !== weight) continue;
      const r = Number(s.reps);
      if (Number.isFinite(r) && r > best) best = r;
    }
  }
  return best;
}

// PR force : plus de reps que jamais réalisé AU poids max historique de l'exercice.
// Un poids strictement supérieur = PR poids (detectNewPRs), pas PR force.
export function detectRepPRs(historyBefore, newEntry) {
  const prevMax = computePRs(historyBefore);
  const out = [];
  for (const [exName, sets] of Object.entries(newEntry.exercises || {})) {
    const maxW = prevMax[exName];
    if (maxW === undefined) continue;
    const prevReps = bestDoneRepsAtWeight(historyBefore, exName, maxW);
    let bestNew = null;
    for (const s of sets) {
      if (!s.done || Number(s.weight) !== maxW) continue;
      const r = Number(s.reps);
      if (Number.isFinite(r) && r > prevReps && (bestNew === null || r > bestNew)) bestNew = r;
    }
    if (bestNew !== null) out.push({ exercise: exName, weight: maxW, reps: bestNew, prevReps });
  }
  return out;
}
