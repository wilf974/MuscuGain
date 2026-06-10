// src/utils/backup.core.js
export function buildBackup({ history, customRoutines }) {
  return {
    app: 'MuscuGain',
    version: 1,
    exportedAt: new Date().toISOString(),
    history: history || [],
    customRoutines: customRoutines || [],
  };
}

export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Fichier invalide.');
  if (obj.app !== 'MuscuGain') throw new Error("Ce fichier n'est pas une sauvegarde MuscuGain.");
  if (typeof obj.version !== 'number') throw new Error('Version de sauvegarde manquante.');
  if (!Array.isArray(obj.history)) throw new Error('Historique invalide dans la sauvegarde.');
  if (!Array.isArray(obj.customRoutines)) throw new Error('Programmes invalides dans la sauvegarde.');
  return true;
}

export function mergeBackup(current, imported) {
  const curHistory = current.history || [];
  const curRoutines = current.customRoutines || [];
  const seenDates = new Set(curHistory.map((h) => h.date));
  let addedSessions = 0;
  const mergedHistory = [...curHistory];
  for (const s of imported.history || []) {
    if (!seenDates.has(s.date)) {
      mergedHistory.push(s);
      seenDates.add(s.date);
      addedSessions += 1;
    }
  }
  mergedHistory.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const routines = [...curRoutines];
  let overwrittenRoutines = 0;
  let addedRoutines = 0;
  for (const r of imported.customRoutines || []) {
    const idx = routines.findIndex((x) => x.name === r.name);
    if (idx >= 0) {
      routines[idx] = r;
      overwrittenRoutines += 1;
    } else {
      routines.push(r);
      addedRoutines += 1;
    }
  }
  return {
    history: mergedHistory,
    customRoutines: routines,
    stats: { addedSessions, overwrittenRoutines, addedRoutines },
  };
}
