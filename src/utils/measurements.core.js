// src/utils/measurements.core.js
// Mesures corporelles : { date: 'YYYY-MM-DD', weight: kg, arms?/waist?/thighs?: cm }.
// 1 entrée par jour : upsert écrase l'entrée du même jour.

function num(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const CM_FIELDS = ['arms', 'waist', 'thighs'];

export function parseMeasurementInput(raw) {
  const { date } = raw || {};
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Date invalide.' };
  const weight = num(raw.weight);
  if (weight === null || Number.isNaN(weight)) return { ok: false, error: 'Poids requis (nombre en kg).' };
  if (weight < 20 || weight > 400) return { ok: false, error: 'Poids hors limites (20–400 kg).' };
  const entry = { date, weight };
  for (const f of CM_FIELDS) {
    const v = num(raw[f]);
    if (v === null) continue;
    if (Number.isNaN(v) || v < 10 || v > 300) return { ok: false, error: 'Mensuration hors limites (10–300 cm).' };
    entry[f] = v;
  }
  return { ok: true, entry };
}

export function upsertMeasurement(list, entry) {
  const out = (list || []).filter((m) => m.date !== entry.date);
  out.push(entry);
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}

// Points pour LineChart : [{x: date, y}] sur un champ donné, entrées sans le champ ignorées.
export function toPoints(list, field = 'weight') {
  return (list || [])
    .filter((m) => Number.isFinite(m[field]))
    .map((m) => ({ x: m.date, y: m[field] }));
}
