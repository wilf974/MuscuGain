// src/utils/backup.js
import { buildBackup, validateBackup } from './backup.core.js';

export function downloadBackup({ history, customRoutines }) {
  const backup = buildBackup({ history, customRoutines });
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `muscugain-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        validateBackup(obj);
        resolve(obj);
      } catch (e) {
        reject(new Error(e.message || 'Fichier illisible.'));
      }
    };
    reader.onerror = () => reject(new Error('Lecture du fichier échouée.'));
    reader.readAsText(file);
  });
}
