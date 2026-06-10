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
