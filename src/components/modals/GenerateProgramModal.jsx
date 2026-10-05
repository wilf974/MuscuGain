import { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, RotateCcw, WifiOff } from 'lucide-react';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import { generateProgram, CoachError } from '../../utils/coach';
import { EXERCISES_DB } from '../../data/exercises';
import useOnlineStatus from '../../hooks/useOnlineStatus';

// Le contenu est démonté à la fermeture → état réinitialisé sans effet.
export default function GenerateProgramModal({ isOpen, onClose, onSave }) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Générer par IA" icon={Sparkles}>
      {isOpen && <GenerateProgramBody onClose={onClose} onSave={onSave} />}
    </Sheet>
  );
}

function GenerateProgramBody({ onClose, onSave }) {
  const online = useOnlineStatus();
  const [objective, setObjective] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | preview | error
  const [error, setError] = useState('');
  const [program, setProgram] = useState(null);

  const handleGenerate = async () => {
    if (!objective.trim() || status === 'loading' || !online) return;
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
    <div>
        <p className="text-xs text-slate-400 -mt-1 mb-3">Un programme adapté à ton objectif, avec des exercices du catalogue.</p>
        {!online && (
          <div role="status" className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
            <WifiOff size={18} className="shrink-0 mt-0.5" /> Hors ligne : la génération par IA reviendra avec la connexion.
          </div>
        )}
        {/* Body */}
        <div>
          {/* Objectif */}
          {(status === 'idle' || status === 'loading' || status === 'error') && (
            <div>
              <label htmlFor="gen-objective" className="block text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">
                Ton objectif
              </label>
              <textarea
                id="gen-objective"
                maxLength={300}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={4}
                disabled={status === 'loading'}
                placeholder="Ex: prise de masse, 3 séances/semaine, niveau débutant"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none disabled:opacity-60"
              />

              {status === 'loading' && (
                <div role="status" className="flex items-center justify-center gap-2 text-slate-400 mt-5 text-sm">
                  <Loader2 size={18} className="animate-spin text-blue-400" /> Génération en cours…
                </div>
              )}

              {status === 'error' && (
                <div role="alert" className="flex items-start gap-2 mt-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
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
        <div className="flex gap-3 pt-4 mt-4 border-t border-slate-700/50">
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
                disabled={!objective.trim() || status === 'loading' || !online}
              >
                <Sparkles size={16} /> Générer
              </Button>
            </>
          )}
        </div>
    </div>
  );
}
