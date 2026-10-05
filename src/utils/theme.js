// Thème clair/sombre/système. Le 1er rendu est géré par public/theme-init.js (même logique).
import { KEYS } from './storage.core.js';

export const THEMES = [
  { key: 'dark', label: 'Sombre' },
  { key: 'light', label: 'Clair' },
  { key: 'system', label: 'Système' },
];

export function getThemePref() {
  try {
    const v = localStorage.getItem(KEYS.theme);
    return THEMES.some((t) => t.key === v) ? v : 'dark';
  } catch {
    return 'dark';
  }
}

const systemLight = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

export function applyTheme(pref = getThemePref()) {
  const light = pref === 'light' || (pref === 'system' && systemLight());
  document.documentElement.classList.toggle('theme-light', light);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', light ? '#f1f5f9' : '#0f172a');
  return light;
}

export function setThemePref(pref) {
  try { localStorage.setItem(KEYS.theme, pref); } catch { /* stockage indisponible */ }
  applyTheme(pref);
}

// Suit le thème système si la préférence est « system ». Retourne la fonction de désabonnement.
export function watchSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const onChange = () => { if (getThemePref() === 'system') applyTheme('system'); };
  mq.addEventListener?.('change', onChange);
  return () => mq.removeEventListener?.('change', onChange);
}
