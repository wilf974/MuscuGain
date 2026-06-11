import { EXERCISES_DB, MUSCLE_LABELS } from './exercises.js';

const KEY = 'muscuGainCustomExercises';
const VALID = ['chest', 'back', 'legs', 'shoulders', 'arms', 'abs'];

const GROUP_TO_CAT = {
  chest: 'chest', pectoraux: 'chest', pecs: 'chest', poitrine: 'chest',
  back: 'back', dos: 'back',
  legs: 'legs', jambes: 'legs', quadriceps: 'legs', quadris: 'legs', ischios: 'legs', fessiers: 'legs', mollets: 'legs',
  shoulders: 'shoulders', epaules: 'shoulders', 'épaules': 'shoulders', deltoides: 'shoulders', 'deltoïdes': 'shoulders',
  arms: 'arms', bras: 'arms', triceps: 'arms', biceps: 'arms', 'avant-bras': 'arms',
  abs: 'abs', abdos: 'abs', abdominaux: 'abs', core: 'abs', gainage: 'abs',
};

export function categoryFromGroup(group) {
  const k = String(group || '').toLowerCase().trim();
  return GROUP_TO_CAT[k] || (VALID.includes(k) ? k : 'other');
}

// Ajout pur, dédup insensible à la casse. Retourne la nouvelle liste.
export function dedupeAdd(list, name, category) {
  const n = String(name || '').trim();
  if (!n) return list;
  if (list.some((e) => e.name.toLowerCase() === n.toLowerCase())) return list;
  return [...list, { name: n, category: VALID.includes(category) ? category : 'other' }];
}

export function loadCustomExercises() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((e) => e && e.name) : [];
  } catch {
    return [];
  }
}

export function addCustomExercise(name, category) {
  const updated = dedupeAdd(loadCustomExercises(), name, category);
  try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch { /* quota */ }
  return updated;
}

// Tous les noms connus (catalogue + perso) — pour allowedExercises + détection "hors-liste".
export function allKnownNames(custom = loadCustomExercises()) {
  return [...Object.values(EXERCISES_DB).flat(), ...custom.map((e) => e.name)];
}

// Catalogue fusionné pour le picker : [{ category, label, exercises:[names] }] ; 'other' en dernier.
export function mergedCatalog(custom = loadCustomExercises()) {
  const out = Object.entries(EXERCISES_DB).map(([category, exercises]) => ({
    category,
    label: MUSCLE_LABELS[category] || category,
    exercises: [...exercises, ...custom.filter((e) => e.category === category).map((e) => e.name)],
  }));
  const others = custom.filter((e) => !VALID.includes(e.category)).map((e) => e.name);
  if (others.length) out.push({ category: 'other', label: 'Autres', exercises: others });
  return out;
}
