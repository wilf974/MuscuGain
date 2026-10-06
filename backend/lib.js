// Logique pure du backend (validation des entrées, normalisation des sorties modèle).
// Aucune dépendance, aucun IO : testable sous `node --test` (cf. lib.test.js).

export const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'abs'];
const VALID_GROUPS = new Set(MUSCLE_GROUPS);

// Taille max de l'image décodée (~6 Mo ; en base64 ≈ 8 Mo, aligné sur le bodyLimit global).
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_SUMMARY_CHARS = 20000;
export const MAX_OBJECTIVE_CHARS = 300;
export const DEFAULT_TIMEOUT_MS = 45000;

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
// Caractères de contrôle (sauts de ligne inclus) : remplacés par un espace avant injection dans un prompt.
const CONTROL_RE = /[\u0000-\u001f\u007f]+/g;

// ---------- Utilitaires texte ----------

// Chaîne nettoyée (trim, sans caractères de contrôle) et tronquée ; '' si pas une chaîne.
export function cleanStr(v, max = 600) {
  if (typeof v !== 'string') return '';
  return v.replace(CONTROL_RE, ' ').trim().slice(0, max).trim();
}

// Tableau de chaînes non vides, nettoyées et tronquées ; [] si pas un tableau.
export function cleanStrArray(v, maxItems = 6, maxLen = 300) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => cleanStr(x, maxLen)).filter(Boolean).slice(0, maxItems);
}

// ---------- Extraction JSON ----------

// Extrait le premier objet JSON d'une réponse modèle (texte autour, blocs ```json, etc.).
// 1) tentative gloutonne du premier '{' au dernier '}' ; 2) sinon parcours des objets équilibrés.
export function extractJson(text) {
  if (typeof text !== 'string' || !text) return null;
  const src = text.length > 50000 ? text.slice(0, 50000) : text;
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

  const greedy = src.match(/\{[\s\S]*\}/);
  if (!greedy) return null;
  try {
    const v = JSON.parse(greedy[0]);
    if (isObj(v)) return v;
  } catch { /* on tente le parcours équilibré */ }

  // Parcours : pour chaque '{', cherche l'accolade fermante correspondante (en ignorant les chaînes).
  let tries = 0;
  for (let start = src.indexOf('{'); start !== -1 && tries < 20; start = src.indexOf('{', start + 1), tries++) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < src.length; i++) {
      const ch = src[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) {
        try {
          const v = JSON.parse(src.slice(start, i + 1));
          if (isObj(v)) return v;
        } catch { /* objet suivant */ }
        break;
      }
    }
  }
  return null;
}

// ---------- Validation des entrées ----------

// Valide une image (dataURL jpeg/png/webp en base64, ou base64 brut traité comme jpeg).
// Retour : { ok: true, dataUrl } normalisée, ou { ok: false, status: 400|413, error } (jamais l'entrée).
export function validateImage(image, maxBytes = MAX_IMAGE_BYTES) {
  if (typeof image !== 'string' || !image.trim()) {
    return { ok: false, status: 400, error: 'image manquante' };
  }
  let mime = 'image/jpeg';
  let b64 = image.trim();
  if (b64.startsWith('data:')) {
    const comma = b64.indexOf(',');
    // En-tête borné : évite de traiter une "dataURL" absurde.
    if (comma === -1 || comma > 64) return { ok: false, status: 400, error: 'Image mal encodée' };
    const header = b64.slice(5, comma).toLowerCase();
    const m = header.match(/^([a-z0-9.+-]+\/[a-z0-9.+-]+);base64$/);
    if (!m) return { ok: false, status: 400, error: 'Image mal encodée' };
    mime = m[1] === 'image/jpg' ? 'image/jpeg' : m[1];
    if (!IMAGE_MIMES.has(mime)) {
      return { ok: false, status: 400, error: "Format d'image non supporté (jpeg, png ou webp)" };
    }
    b64 = b64.slice(comma + 1);
  }
  // Contrôle de taille avant la regex (coût linéaire, mais inutile sur un énorme payload).
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const bytes = Math.floor((b64.length * 3) / 4) - padding;
  if (bytes > maxBytes) return { ok: false, status: 413, error: 'Image trop volumineuse' };
  if (!b64 || b64.length % 4 === 1 || !BASE64_RE.test(b64)) {
    return { ok: false, status: 400, error: 'Image mal encodée' };
  }
  return { ok: true, dataUrl: `data:${mime};base64,${b64}` };
}

// Liste de noms (exercices) : chaînes non vides uniquement, nettoyées, <= maxLen, dédupliquées
// (insensible à la casse, 1re occurrence gardée), au plus maxItems.
export function sanitizeNameList(list, maxItems = 400, maxLen = 100) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const x of list) {
    if (out.length >= maxItems) break;
    if (typeof x !== 'string') continue;
    const name = cleanStr(x, Infinity);
    if (!name || name.length > maxLen) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

// Contexte d'analyse corporelle injecté dans un prompt (previousAnalysis / bodyAnalysis) :
// uniquement des champs courts connus. null si absent/invalide ou vide.
export function sanitizeAnalysisContext(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const ctx = {
    morphotype: cleanStr(v.morphotype, 120),
    balance: cleanStr(v.balance, 120),
    bodyFatRange: cleanStr(v.bodyFatRange, 40),
    weaknesses: cleanStrArray(v.weaknesses, 6, 200),
  };
  const empty = !ctx.morphotype && !ctx.balance && !ctx.bodyFatRange && !ctx.weaknesses.length;
  return empty ? null : ctx;
}

// Résumé d'historique (coach) : objet non vide, JSON borné à maxChars.
// Retour : { ok: true, json } ou { ok: false, status: 400|413, error }.
export function validateSummary(summary, maxChars = MAX_SUMMARY_CHARS) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    return { ok: false, status: 400, error: 'résumé manquant' };
  }
  let json;
  try { json = JSON.stringify(summary); } catch { return { ok: false, status: 400, error: 'résumé invalide' }; }
  if (json.length > maxChars) return { ok: false, status: 413, error: 'résumé trop volumineux' };
  return { ok: true, json };
}

// Objectif utilisateur (generate-program) : nettoyé, tronqué à maxChars ; '' si invalide.
export function sanitizeObjective(v, maxChars = MAX_OBJECTIVE_CHARS) {
  return cleanStr(v, maxChars).replace(/"/g, "'");
}

// Catalogue { groupe: [noms] } (ou tableau) -> liste de noms assainie.
export function catalogNames(catalog) {
  if (!catalog || typeof catalog !== 'object') return [];
  return sanitizeNameList(Object.values(catalog).flat());
}

// Timeout de l'appel modèle (ms) depuis l'env : entier borné [1000, 85000] (sous le proxy_read_timeout nginx de 90s).
export function parseTimeoutMs(v, fallback = DEFAULT_TIMEOUT_MS) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(85000, Math.max(1000, n));
}

// Clé de rate-limit : IP réelle posée par le reverse proxy VPS (X-Real-IP = $remote_addr, non falsifiable
// par le client car écrasée par le proxy), sinon req.ip. Le backend n'est joignable que via le réseau interne.
export function rateLimitKey(req) {
  const h = req?.headers?.['x-real-ip'];
  if (typeof h === 'string' && /^[0-9a-fA-F:.]{2,45}$/.test(h.trim())) return h.trim();
  return req?.ip || 'unknown';
}

// ---------- Normalisation des sorties modèle ----------

// Confiance -> bornée à [0,1], ou null si non numérique (l'ordre des candidats prime sur la valeur).
export function clampConfidence(v) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(1, Math.max(0, n));
}

// Index insensible à la casse : nom en minuscules -> nom canonique.
const canonIndex = (names) => new Map(names.map((n) => [n.toLowerCase(), n]));

// /recognize-exercise -> { label, candidates: [{ exercise, confidence, muscleGroup, inList }] } (max 3).
export function normalizeRecognition(parsed, allowedList) {
  if (parsed?.isGymEquipment === false) return { label: null, candidates: [] };
  if (!parsed || typeof parsed !== 'object') return { label: null, candidates: [] };
  const index = allowedList && allowedList.length ? canonIndex(allowedList) : null;
  const raw = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  const candidates = raw
    .filter((c) => c && typeof c === 'object')
    .map((c) => {
      let exercise = cleanStr(typeof c.exercise === 'number' ? String(c.exercise) : c.exercise, 100);
      if (!exercise) return null;
      const canonical = index ? index.get(exercise.toLowerCase()) : undefined;
      if (canonical) exercise = canonical;
      const g = cleanStr(c.muscleGroup, 20).toLowerCase();
      return {
        exercise,
        confidence: clampConfidence(c.confidence),
        muscleGroup: VALID_GROUPS.has(g) ? g : null,
        inList: !!canonical,
      };
    })
    .filter(Boolean)
    .slice(0, 3);
  const label = cleanStr(parsed.label, 200) || null;
  return { label, candidates };
}

// /analyze-body -> forme stable (chaînes + tableaux de chaînes).
export function normalizeBodyAnalysis(parsed) {
  const p = parsed && typeof parsed === 'object' ? parsed : {};
  return {
    morphotype: cleanStr(p.morphotype, 200),
    balance: cleanStr(p.balance, 300),
    bodyFatRange: cleanStr(p.bodyFatRange, 40),
    strengths: cleanStrArray(p.strengths),
    weaknesses: cleanStrArray(p.weaknesses),
    trainingAdvice: cleanStrArray(p.trainingAdvice),
    evolutionNote: cleanStr(p.evolutionNote),
  };
}

// /coach-analysis -> forme stable.
export function normalizeCoachAnalysis(parsed) {
  const p = parsed && typeof parsed === 'object' ? parsed : {};
  return {
    overview: cleanStr(p.overview, 800),
    progression: cleanStrArray(p.progression),
    plateaus: cleanStrArray(p.plateaus),
    weeklyVolume: cleanStr(p.weeklyVolume, 300),
    balance: cleanStr(p.balance, 300),
    deload: cleanStr(p.deload, 300),
    bodyCross: cleanStr(p.bodyCross),
  };
}

const intIn = (v, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= min ? Math.min(max, n) : null;
};

// /generate-program -> { name, exercises: [{ name, targetSets, targetReps, restSeconds? }] } (max 12),
// noms validés contre le catalogue (casse tolérée, nom canonique renvoyé).
export function normalizeGeneratedProgram(parsed, names) {
  if (!parsed || typeof parsed !== 'object') return { name: '', exercises: [] };
  const index = canonIndex(Array.isArray(names) ? names : []);
  const exercises = (Array.isArray(parsed.exercises) ? parsed.exercises : [])
    .filter((e) => e && typeof e === 'object' && typeof e.name === 'string')
    .map((e) => {
      const name = index.get(cleanStr(e.name, 100).toLowerCase());
      if (!name) return null;
      const rest = intIn(e.restSeconds, 1, 600);
      return {
        name,
        targetSets: intIn(e.targetSets, 1, 10) ?? 3,
        targetReps: intIn(e.targetReps, 1, 100) ?? 10,
        ...(rest ? { restSeconds: rest } : {}),
      };
    })
    .filter(Boolean)
    .slice(0, 12);
  return { name: cleanStr(parsed.name, 80), exercises };
}
