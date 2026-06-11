import { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertTriangle, X, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';
import { generateProgram, CoachError } from '../../utils/coach';
import { EXERCISES_DB } from '../../data/exercises';

export default function GenerateProgramModal({ isOpen, onClose, onSave }) {
  const [objective, setObjective] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | preview | error
  const [error, setError] = useState('');
  const [program, setProgram] = useState(null);

  // Reset complet à chaque fermeture.
  useEffect(() => {
    if (!isOpen) {
      setObjective('');
      setStatus('idle');
      setError('');
      setProgram(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!objective.trim() || status === 'loading') return;
    setStatus('loading');
    setError('');
    try {
      const validNames = Object.values(EXERCISES_DB).flat();
      const result = await generateProgram(objective.trim(), EXERCISES_DB, validNames);
      setProgram(result);
      setStatus('preview');
    } catch (err) {
      setError(err instanceof CoachError ? err.message : "Coach IA indisponible, réessaie plus tard.");
      setStatus('error');
    }
  };

  const handleSave = () => {
    if (!program || !program.exercises.length) return;
    onSave(program);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-6 pb-4 border-b border-slate-700/50">
          <Sparkles size={24} className="text-blue-400 shrink-0" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white leading-tight">Générer par IA</h3>
            <p className="text-xs text-slate-400 mt-0.5">Un programme adapté à ton objectif</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="p-6 pt-4 overflow-y-auto">
          {/* Objectif */}
          {(status === 'idle' || status === 'loading' || status === 'error') && (
            <div>
              <label className="block text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">
                Ton objectif
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={4}
                disabled={status === 'loading'}
                placeholder="Ex: prise de masse, 3 séances/semaine, niveau débutant"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none disabled:opacity-60"
              />

              {status === 'loading' && (
                <div className="flex items-center justify-center gap-2 text-slate-400 mt-5 text-sm">
                  <Loader2 size={18} className="animate-spin text-blue-400" /> Génération en cours…
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-start gap-2 mt-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" /> {error}
                </div>
              )}
            </div>
          )}

          {/* Aperçu */}
          {status === 'preview' && program && (
            <div className="space-y-4 fade-in">
              <div>
                <label className="block text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">
                  Nom du programme
                </label>
                <input
                  type="text"
                  value={program.name}
                  onChange={(e) => setProgram((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Programme IA"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none font-bold"
                />
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">
                  {program.exercises.length} exercice{program.exercises.length > 1 ? 's' : ''}
                </div>
                <div className="space-y-2">
                  {program.exercises.map((ex, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-slate-900/40">
                      <span className="font-semibold text-white text-sm truncate pr-2">{ex.name}</span>
                      <span className="text-xs text-blue-400 font-bold shrink-0">
                        {ex.targetSets} × {ex.targetReps}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-4 border-t border-slate-700/50">
          {status === 'preview' ? (
            <>
              <Button onClick={handleGenerate} variant="ghost" fullWidth>
                <RotateCcw size={16} /> Régénérer
              </Button>
              <Button onClick={handleSave} variant="success" fullWidth>
                Enregistrer
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onClose} variant="ghost" fullWidth>Annuler</Button>
              <Button
                onClick={handleGenerate}
                fullWidth
                className={(!objective.trim() || status === 'loading') ? 'opacity-40 cursor-not-allowed' : ''}
              >
                <Sparkles size={16} /> Générer
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
