// Liaison navigateur de storage.core : localStorage réel + migration au démarrage.
import { KEYS, readJSON, writeJSON, migrateStorage, normalizeHistory, isArray, isObject } from './storage.core.js';
import { newId } from './session.core.js';

export { KEYS, isArray, isObject };

// Mode privé / stockage désactivé : on travaille en mémoire plutôt que de planter.
const memory = new Map();
const memoryStore = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
};

function getStore() {
  try {
    const t = '__mg_test__';
    window.localStorage.setItem(t, t);
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {
    return memoryStore;
  }
}

export const store = typeof window !== 'undefined' ? getStore() : memoryStore;
export const storageAvailable = store !== memoryStore;

export const load = (key, fallback, validate) => readJSON(store, key, fallback, validate);
export const save = (key, value) => writeJSON(store, key, value);
export const remove = (key) => {
  try { store.removeItem(key); } catch { /* ignore */ }
};
export const loadFlag = (key) => {
  try { return store.getItem(key); } catch { return null; }
};
export const saveFlag = (key, value) => {
  try { store.setItem(key, String(value)); return true; } catch { return false; }
};

export const loadHistory = () => normalizeHistory(load(KEYS.history, [], isArray));

let migrated = false;
// Idempotent, appelé une fois avant le 1er rendu (main.jsx).
export function runMigrations() {
  if (migrated) return null;
  migrated = true;
  try {
    return migrateStorage(store, { newId: () => newId('s') });
  } catch {
    return null; // une migration ratée ne doit jamais bloquer l'app
  }
}
