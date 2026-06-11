// src/utils/analyzeBody.js
import { fileToDataUrl } from './recognizeMachine.js';
import { normalizeBodyAnalysis } from './analyzeBody.core.js';

const MESSAGES = {
  unavailable: 'Analyse indisponible, réessaie plus tard.',
  ratelimit: 'Trop de tentatives, réessaie dans 1 min.',
  empty: "L'IA n'a pas pu analyser cette photo, réessaie avec une autre.",
  image: 'Image illisible, réessaie avec une autre photo.',
};

export class AnalyzeBodyError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'AnalyzeBodyError';
    this.kind = kind;
  }
}

// Envoie la photo à l'IA. La dataURL reste locale et n'est pas conservée après l'appel.
export async function analyzeBody(file, previousAnalysis) {
  let image;
  try {
    image = await fileToDataUrl(file);
  } catch {
    throw new AnalyzeBodyError('image', MESSAGES.image);
  }
  let res;
  try {
    res = await fetch('/api/analyze-body', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, previousAnalysis: previousAnalysis || null }),
    });
  } catch {
    throw new AnalyzeBodyError('unavailable', MESSAGES.unavailable);
  }
  if (res.status === 429) throw new AnalyzeBodyError('ratelimit', MESSAGES.ratelimit);
  if (!res.ok) throw new AnalyzeBodyError('unavailable', MESSAGES.unavailable);
  const json = await res.json().catch(() => null);
  const result = normalizeBodyAnalysis(json);
  const hasContent = result.morphotype || result.balance || result.bodyFatRange ||
    result.strengths.length || result.weaknesses.length || result.trainingAdvice.length;
  if (!hasContent) throw new AnalyzeBodyError('empty', MESSAGES.empty);
  return result;
}
