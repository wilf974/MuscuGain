// src/utils/dates.core.js
// Dates LOCALES (fuseau de l'appareil), jamais `toISOString().slice(0,10)` qui donne
// le jour UTC : à Paris, une séance à 00h30 tombait sur la veille.
// Les instants restent stockés en ISO (UTC) ; seuls les « jours » sont calculés en local.

const pad = (n) => String(n).padStart(2, '0');

function toDate(input) {
  if (input instanceof Date) return new Date(input.getTime());
  if (typeof input === 'number') return new Date(input);
  if (typeof input === 'string') {
    // 'YYYY-MM-DD' seul = jour local (et non minuit UTC comme le ferait Date.parse).
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date(input);
  }
  return new Date(NaN);
}

// Timestamp (ms) d'une date ISO ou d'un jour 'YYYY-MM-DD' (interprété en LOCAL). NaN si invalide.
export function toTime(input) {
  return toDate(input).getTime();
}

export function isValidDate(input) {
  return Number.isFinite(toDate(input).getTime());
}

// 'YYYY-MM-DD' du jour local de `input` (défaut : maintenant). null si invalide.
export function localDateKey(input = new Date()) {
  const d = toDate(input);
  if (!Number.isFinite(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Lundi 00:00 local de la semaine de `input`.
export function startOfLocalWeek(input) {
  const d = toDate(input);
  if (!Number.isFinite(d.getTime())) return null;
  const day = d.getDay(); // 0=dim … 6=sam
  const diff = day === 0 ? 6 : day - 1;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
}

// Clé de semaine = 'YYYY-MM-DD' du lundi local.
export function localWeekKey(input) {
  const monday = startOfLocalWeek(input);
  return monday ? localDateKey(monday) : null;
}

// Nombre de jours calendaires (locaux) entre `from` et `to` (to - from). Robuste au changement d'heure.
export function calendarDaysBetween(from, to = new Date()) {
  const a = toDate(from);
  const b = toDate(to);
  if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime())) return null;
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000);
}

// « aujourd'hui », « hier », « il y a 3 jours »… (now injectable pour les tests).
export function relativeDayLabel(input, now = new Date()) {
  const days = calendarDaysBetween(input, now);
  if (days === null) return '';
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  if (days < 14) return 'il y a 1 semaine';
  if (days < 60) return `il y a ${Math.floor(days / 7)} semaines`;
  return `il y a ${Math.floor(days / 30)} mois`;
}
