import { normalizeCoachAnalysis, normalizeGeneratedProgram } from './coach.core.js';

const MESSAGES = {
  unavailable: 'Coach IA indisponible, réessaie plus tard.',
  ratelimit: 'Trop de tentatives, réessaie dans 1 min.',
  empty: "L'IA n'a pas pu produire de résultat, réessaie.",
};

export class CoachError extends Error {
  constructor(kind, message) { super(message); this.name = 'CoachError'; this.kind = kind; }
}

async function postJson(url, body) {
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch { throw new CoachError('unavailable', MESSAGES.unavailable); }
  if (res.status === 429) throw new CoachError('ratelimit', MESSAGES.ratelimit);
  if (!res.ok) throw new CoachError('unavailable', MESSAGES.unavailable);
  return res.json().catch(() => null);
}

export async function fetchCoachAnalysis(summary, bodyAnalysis) {
  const json = await postJson('/api/coach-analysis', { summary, bodyAnalysis: bodyAnalysis || null });
  const data = normalizeCoachAnalysis(json);
  if (!data.overview && !data.progression.length && !data.plateaus.length && !data.balance) {
    throw new CoachError('empty', MESSAGES.empty);
  }
  return data;
}

export async function generateProgram(objective, catalog, validNames) {
  const json = await postJson('/api/generate-program', { objective, catalog });
  const program = normalizeGeneratedProgram(json, validNames);
  if (!program.exercises.length) throw new CoachError('empty', MESSAGES.empty);
  return program;
}
