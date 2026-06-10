// src/components/modals/ImportBackupModal.jsx
import { useState } from 'react';
import { X, Upload, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { readBackupFile, } from '../../utils/backup.js';
import { mergeBackup } from '../../utils/backup.core.js';

export default function ImportBackupModal({ isOpen, onClose, current, onConfirm }) {
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // { merged, stats }

  if (!isOpen) return null;

  const reset = () => { setError(''); setPreview(null); };
  const close = () => { reset(); onClose(); };

  const handleFile = async (e) => {
    setError('');
    setPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await readBackupFile(file);
      const merged = mergeBackup(current, imported);
      setPreview({ merged, stats: merged.stats });
    } catch (err) {
      setError(err.message);
    }
    e.target.value = '';
  };

  const confirm = () => {
    if (!preview) return;
    onConfirm(preview.merged);
    close();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 fade-in" onClick={close}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6 border border-slate-700" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Importer une sauvegarde</h3>
          <button onClick={close} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <label className="block bg-slate-900 border border-dashed border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
          <Upload size={28} className="mx-auto mb-2 text-blue-400" />
          <span className="text-sm text-slate-300">Choisir un fichier .json</span>
          <input type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
        </label>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {preview && (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-slate-300 bg-slate-900 rounded-lg p-3 space-y-1">
              <div>Séances ajoutées : <span className="font-bold text-green-400">{preview.stats.addedSessions}</span></div>
              <div>Programmes ajoutés : <span className="font-bold text-green-400">{preview.stats.addedRoutines}</span></div>
              <div>Programmes écrasés : <span className="font-bold text-amber-400">{preview.stats.overwrittenRoutines}</span></div>
            </div>
            <Button fullWidth onClick={confirm} className="bg-green-600 hover:bg-green-500">Fusionner</Button>
          </div>
        )}
      </div>
    </div>
  );
}
