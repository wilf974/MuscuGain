// src/utils/scanner.core.js
// Logique pure du scanner de machine : niveau de confiance, choix à confirmer,
// fiche exercice (muscles, vidéo validée, sécurité). Aucune donnée inventée :
// on n'affiche que des candidats renvoyés par l'IA ou des exercices du catalogue.
import { EXERCISES_DB, MUSCLE_LABELS } from '../data/exercises.js';
import { VIDEO_MAPPING } from '../data/videos.js';
import { GENERAL_SAFETY, SAFETY_BY_CATEGORY } from '../data/safety.js';
import { categoryFromGroup } from '../data/customExercises.js';

// Seuil « confiance haute » sur le candidat n°1. Les confiances des candidats 2/3 sont
// mal calibrées (cf. benchmark 09/06) → seul le n°1 compte, les autres valent par leur rang.
export const HIGH_CONFIDENCE = 0.75;

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
export const isValidYoutubeId = (id) => typeof id === 'string' && YT_ID.test(id);

// ID YouTube du mapping existant, uniquement s'il est bien formé (sinon pas de faux lien).
export function videoIdFor(name, mapping = VIDEO_MAPPING) {
  const id = mapping[name];
  return isValidYoutubeId(id) ? id : null;
}

const BUILTIN = Object.entries(EXERCISES_DB).flatMap(([category, list]) => list.map((name) => ({ name, category })));

// Index nom (minuscule) → { name canonique, category } sur catalogue intégré + perso.
export function buildCatalogIndex(customExercises = []) {
  const idx = new Map();
  for (const e of BUILTIN) idx.set(e.name.toLowerCase(), e);
  for (const e of customExercises || []) {
    if (!e || !e.name) continue;
    const k = String(e.name).trim().toLowerCase();
    if (!idx.has(k)) idx.set(k, { name: String(e.name).trim(), category: e.category || 'other' });
  }
  return idx;
}

/**
 * Classe le résultat de reconnaissance.
 * → { level: 'high'|'low'|'none', label, primary, choices }
 *   - candidat : { exercise, confidence, known, category, muscleGroupLabel }
 *   - high : n°1 connu du catalogue ET confiance ≥ seuil → fiche directe
 *   - low  : 1 à 3 choix à confirmer explicitement par l'utilisateur
 *   - none : aucun candidat exploitable → catalogue manuel
 */
export function classifyRecognition(result, catalogIndex = buildCatalogIndex(), threshold = HIGH_CONFIDENCE) {
  const label = result && typeof result.label === 'string' && result.label.trim() ? result.label.trim() : null;
  const raw = (result && Array.isArray(result.candidates)) ? result.candidates : [];
  const seen = new Set();
  const choices = [];
  for (const c of raw) {
    const n = c && typeof c.exercise === 'string' ? c.exercise.trim() : '';
    if (!n || n.length > 100) continue;
    const hit = catalogIndex.get(n.toLowerCase());
    const exercise = hit ? hit.name : n;
    const key = exercise.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const conf = Number(c.confidence);
    const category = hit ? hit.category : categoryFromGroup(c.muscleGroup);
    choices.push({
      exercise,
      confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : null,
      known: !!hit,
      category,
      muscleGroupLabel: MUSCLE_LABELS[category] || null,
    });
    if (choices.length === 3) break;
  }
  if (!choices.length) return { level: 'none', label, primary: null, choices: [] };
  const top = choices[0];
  const level = top.known && top.confidence !== null && top.confidence >= threshold ? 'high' : 'low';
  return { level, label, primary: top, choices };
}

// Libellé de confiance lisible (pas de pourcentage trompeur pour les rangs 2/3).
export function confidenceLabel(choice, rank = 0) {
  if (!choice || choice.confidence === null) return rank === 0 ? 'Confiance inconnue' : 'Autre possibilité';
  if (rank > 0) return 'Autre possibilité';
  if (choice.confidence >= HIGH_CONFIDENCE) return 'Confiance élevée';
  if (choice.confidence >= 0.5) return 'Confiance moyenne';
  return 'Confiance faible';
}

/**
 * Fiche exercice : muscles, vidéo (ID validé du mapping existant ou null), conseils sécurité.
 */
export function exerciseInfo(name, catalogIndex = buildCatalogIndex(), { fallbackCategory } = {}) {
  const n = String(name || '').trim();
  const hit = catalogIndex.get(n.toLowerCase());
  const exercise = hit ? hit.name : n;
  const category = hit ? hit.category : (fallbackCategory || 'other');
  const specific = SAFETY_BY_CATEGORY[category];
  return {
    exercise,
    known: !!hit,
    category,
    muscleLabel: MUSCLE_LABELS[category] || 'Groupe musculaire non précisé',
    videoId: videoIdFor(exercise),
    safetyTips: specific ? [specific, ...GENERAL_SAFETY] : [...GENERAL_SAFETY],
  };
}

// Filtre de recherche du catalogue manuel (insensible casse/accents).
export function normalizeSearch(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function filterCatalog(catalog, query) {
  const q = normalizeSearch(query);
  if (!q) return catalog;
  return catalog
    .map((g) => ({ ...g, exercises: g.exercises.filter((n) => normalizeSearch(n).includes(q)) }))
    .filter((g) => g.exercises.length);
}
