// Logique pure de transformation feuille -> programme (sans I/O, testable en Node).

// A cell counts as numeric if it parses to a finite number (accepts "1,5" FR decimals).
export const isNumeric = (v) => {
  if (v == null || v === '') return false;
  const n = parseFloat(typeof v === 'string' ? v.replace(',', '.') : v);
  return !isNaN(n);
};

// Col B / C -> positive integer, or '' when empty/illisible.
export const toCount = (v) => {
  if (v == null || v === '') return '';
  const n = parseInt(typeof v === 'string' ? v.replace(',', '.') : v, 10);
  return isNaN(n) ? '' : Math.max(1, n);
};

// Col D (minutes) -> seconds, or null when empty/illisible (=> fallback 60s côté timer).
export const minutesToSeconds = (v) => {
  if (v == null || v === '') return null;
  const m = parseFloat(typeof v === 'string' ? v.replace(',', '.') : v);
  if (isNaN(m) || m <= 0) return null;
  return Math.round(m * 60);
};

// 1 feuille = 1 programme. A=nom, B=séries, C=reps, D=pause (minutes).
export function buildSheet(name, data) {
  const warnings = [];
  // On ne garde que les lignes ayant un nom d'exercice (col A).
  let rows = (data || []).filter((r) => r && r[0] != null && String(r[0]).trim() !== '');

  // Auto-détection en-tête : si B ET C de la 1ère ligne ne sont pas numériques, c'est l'en-tête.
  if (rows.length > 0 && !isNumeric(rows[0][1]) && !isNumeric(rows[0][2])) {
    rows = rows.slice(1);
  }

  const exercises = rows.map((r) => {
    const exName = String(r[0]).trim();
    const targetSets = toCount(r[1]);
    const targetReps = toCount(r[2]);
    const restSeconds = minutesToSeconds(r[3]);

    if (r[1] != null && r[1] !== '' && targetSets === '') warnings.push(`"${exName}" : séries illisibles, laissé vide`);
    if (r[2] != null && r[2] !== '' && targetReps === '') warnings.push(`"${exName}" : reps illisibles, laissé vide`);
    if (r[3] != null && r[3] !== '' && restSeconds == null) warnings.push(`"${exName}" : pause illisible, défaut 60s`);

    const ex = { name: exName, targetSets, targetReps, startingWeight: '' };
    if (restSeconds != null) ex.restSeconds = restSeconds;
    return ex;
  });

  return { sheetName: name, exercises, warnings };
}

// rawSheets: [{ sheet, data }] (format read-excel-file v9)
export function buildSheets(rawSheets) {
  if (!Array.isArray(rawSheets) || rawSheets.length === 0) {
    throw new Error('Fichier vide ou illisible.');
  }
  return rawSheets.map((s) => buildSheet(s.sheet, s.data));
}
