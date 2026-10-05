import { flattenExercises, normalizeResult, recognizeErrorKind, RECOGNIZE_MESSAGES as MESSAGES } from './recognizeMachine.core.js';

export { flattenExercises };

// Au-delà, on abandonne côté client (backend ~45 s, nginx 90 s).
export const RECOGNIZE_TIMEOUT_MS = 60000;

export class RecognizeError extends Error {
  constructor(kind, message) {
    super(message || MESSAGES[kind] || MESSAGES.unavailable);
    this.name = 'RecognizeError';
    this.kind = kind;
  }
}

// File -> canvas (resize max px, ratio conservé) -> dataURL JPEG.
// La photo ne quitte la mémoire que pour l'appel IA : rien n'est écrit sur l'appareil.
export function fileToDataUrl(file, max = 768, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || (file.type && !file.type.startsWith('image/'))) {
      reject(new RecognizeError('image', MESSAGES.image));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > max || height > max) {
        const scale = max / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      // Libère le bitmap (mémoire limitée sur iPhone).
      canvas.width = 0;
      canvas.height = 0;
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new RecognizeError('image', MESSAGES.image));
    };
    img.src = url;
  });
}

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

// Reconnaît la machine sur la photo. Retourne { label, candidates } (>=1 candidat) ou lève RecognizeError.
// `signal` (optionnel) permet à l'UI d'annuler ; un délai max s'applique en plus.
export async function recognizeMachine(file, allowedExercises, { signal, timeoutMs = RECOGNIZE_TIMEOUT_MS } = {}) {
  if (!isOnline()) throw new RecognizeError('offline');
  let image = await fileToDataUrl(file, 1280, 0.85);
  if (signal && signal.aborted) throw new RecognizeError('cancelled');

  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutMs);
  const onAbort = () => ctrl.abort();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });

  let res;
  try {
    const body = JSON.stringify({ image, allowedExercises });
    image = null; // ne garde pas la photo en mémoire plus que nécessaire
    res = await fetch('/api/recognize-exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: ctrl.signal,
      cache: 'no-store',
    });
  } catch {
    const kind = recognizeErrorKind({ online: isOnline(), aborted: !!(signal && signal.aborted), timedOut, networkError: true });
    throw new RecognizeError(kind);
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
  const kind = recognizeErrorKind({ status: res.status });
  if (kind) throw new RecognizeError(kind);
  const json = await res.json().catch(() => null);
  const result = normalizeResult(json);
  if (!result.candidates.length) throw new RecognizeError('empty');
  return result;
}
