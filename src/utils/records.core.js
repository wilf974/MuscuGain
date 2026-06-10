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
