import { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, Upload, AlertTriangle, Check, Loader2, X } from 'lucide-react';
import Button from '../ui/Button';
import { parseWorkbook } from '../../utils/parseWorkbook';

export default function ImportRoutineModal({ isOpen, onClose, existingNames = [], onConfirm }) {
  const [sheets, setSheets] = useState([]);
  const [checked, setChecked] = useState({});
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  // Reset complet à chaque ouverture/fermeture.
  useEffect(() => {
    if (!isOpen) {
      setSheets([]);
      setChecked({});
      setParsing(false);
      setError('');
      setFileName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const existing = new Set(existingNames);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setParsing(true);
    setSheets([]);
    try {
      const parsed = await parseWorkbook(file);
      setSheets(parsed);
      // Par défaut, on coche les feuilles ayant au moins un exercice.
      const initial = {};
      parsed.forEach((s) => { initial[s.sheetName] = s.exercises.length > 0; });
      setChecked(initial);
    } catch (err) {
      setError(err?.message || 'Impossible de lire ce fichier. Vérifiez que c\'est bien un .xlsx.');
    } finally {
      setParsing(false);
    }
  };

  const toggle = (name) => setChecked((c) => ({ ...c, [name]: !c[name] }));

  const selectable = sheets.filter((s) => s.exercises.length > 0);
  const allSelected = selectable.length > 0 && selectable.every((s) => checked[s.sheetName]);
  const toggleAll = () => {
    const next = {};
    selectable.forEach((s) => { next[s.sheetName] = !allSelected; });
    setChecked((c) => ({ ...c, ...next }));
  };

  const selectedSheets = sheets.filter((s) => s.exercises.length > 0 && checked[s.sheetName]);
  const selectedCount = selectedSheets.length;

  const handleConfirm = () => {
    if (selectedCount === 0) return;
    onConfirm(selectedSheets.map((s) => ({ name: s.sheetName, exercises: s.exercises })));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-6 pb-4 border-b border-slate-700/50">
          <FileSpreadsheet size={24} className="text-blue-400 shrink-0" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white leading-tight">Importer depuis Excel</h3>
            <p className="text-xs text-slate-400 mt-0.5">1 feuille = 1 programme</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="p-6 pt-4 overflow-y-auto">
          {/* File picker */}
          <input ref={inputRef} type="file" accept=".xlsx" onChange={handleFile} className="hidden" />
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-5 flex flex-col items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors group"
          >
            <Upload size={26} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold">{fileName || 'Choisir un fichier .xlsx'}</span>
            <span className="text-[11px] text-slate-500">Colonnes : A=Exercice · B=Séries · C=Reps · D=Pause (min)</span>
          </button>

          {parsing && (
            <div className="flex items-center justify-center gap-2 text-slate-400 mt-5 text-sm">
              <Loader2 size={18} className="animate-spin" /> Lecture du fichier…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 mt-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Preview */}
          {sheets.length > 0 && !parsing && (
            <div className="mt-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                  {sheets.length} feuille{sheets.length > 1 ? 's' : ''} détectée{sheets.length > 1 ? 's' : ''}
                </span>
                {selectable.length > 0 && (
                  <button onClick={toggleAll} className="text-xs text-blue-400 hover:text-blue-300 font-semibold">
                    {allSelected ? 'Tout décocher' : 'Tout cocher'}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {sheets.map((s) => {
                  const empty = s.exercises.length === 0;
                  const overwrite = !empty && existing.has(s.sheetName);
                  const isChecked = !empty && !!checked[s.sheetName];
                  return (
                    <button
                      key={s.sheetName}
                      disabled={empty}
                      onClick={() => !empty && toggle(s.sheetName)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        empty
                          ? 'border-slate-700/50 bg-slate-900/30 cursor-not-allowed opacity-60'
                          : isChecked
                            ? 'border-blue-500/50 bg-blue-600/10'
                            : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md shrink-0 flex items-center justify-center border ${
                          isChecked ? 'bg-blue-500 border-blue-500' : 'border-slate-600 bg-slate-800'
                        }`}>
                          {isChecked && <Check size={13} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm truncate">{s.sheetName}</span>
                            {overwrite && (
                              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                Écrase l'existant
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {empty ? 'Aucun exercice' : `${s.exercises.length} exercice${s.exercises.length > 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </div>

                      {s.warnings.length > 0 && (
                        <div className="mt-2 pl-8 space-y-0.5">
                          {s.warnings.map((w, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-400/90">
                              <AlertTriangle size={11} className="shrink-0 mt-0.5" /> {w}
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-4 border-t border-slate-700/50">
          <Button onClick={onClose} variant="ghost" fullWidth>Annuler</Button>
          <Button
            onClick={handleConfirm}
            variant="success"
            fullWidth
            className={selectedCount === 0 ? 'opacity-40 cursor-not-allowed' : ''}
          >
            {selectedCount === 0 ? 'Créer' : `Créer ${selectedCount} programme${selectedCount > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
