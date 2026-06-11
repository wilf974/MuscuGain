import { flattenExercises, normalizeResult } from './recognizeMachine.core.js';

export { flattenExercises };

const MESSAGES = {
  unavailable: 'Reconnaissance indisponible, choisis manuellement.',
  ratelimit: 'Trop de tentatives, réessaie dans 1 min.',
  empty: 'Machine non reconnue, choisis manuellement.',
  image: 'Image illisible, réessaie avec une autre photo.',
};

export class RecognizeError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'RecognizeError';
    this.kind = kind;
  }
}

// File -> canvas (resize max px, ratio conservé) -> dataURL JPEG.
export function fileToDataUrl(file, max = 768, quality = 0.72) {
  return new Promise((resolve, reject) => {
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
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new RecognizeError('image', MESSAGES.image));
    };
    img.src = url;
  });
}

// Reconnaît la machine sur la photo. Retourne { label, candidates } (>=1 candidat) ou lève RecognizeError.
export async function recognizeMachine(file, allowedExercises) {
  const image = await fileToDataUrl(file, 1280, 0.85);
  let res;
  try {
    res = await fetch('/api/recognize-exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, allowedExercises }),
    });
  } catch {
    throw new RecognizeError('unavailable', MESSAGES.unavailable);
  }
  if (res.status === 429) throw new RecognizeError('ratelimit', MESSAGES.ratelimit);
  if (!res.ok) throw new RecognizeError('unavailable', MESSAGES.unavailable);
  const json = await res.json().catch(() => null);
  const result = normalizeResult(json);
  if (!result.candidates.length) throw new RecognizeError('empty', MESSAGES.empty);
  return result;
}
