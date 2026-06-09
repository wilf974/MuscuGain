import { useRef, useState } from 'react';
import { PlusCircle, Camera, Loader2, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import { EXERCISES_DB, MUSCLE_LABELS } from '../../data/exercises';
import { recognizeMachine, flattenExercises, RecognizeError } from '../../utils/recognizeMachine';

export default function AddExerciseModal({ isOpen, onClose, onSelect, existingExercises = [] }) {
  const fileInputRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | loading | results | error
  const [result, setResult] = useState(null); // { label, candidates }
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;
  const existingExerciseNames = existingExercises.map((ex) => (typeof ex === 'string' ? ex : ex.name));

  const resetReco = () => {
    setPhase('idle');
    setResult(null);
    setErrorMsg('');
  };

  const handleClose = () => {
    resetReco();
    onClose();
  };

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // permet de re-sélectionner le même fichier
    if (!file) return; // annulation -> no-op
    setPhase('loading');
    setErrorMsg('');
    try {
      const r = await recognizeMachine(file, flattenExercises(EXERCISES_DB));
      setResult(r);
      setPhase('results');
    } catch (err) {
      setErrorMsg(err instanceof RecognizeError ? err.message : 'Une erreur est survenue.');
      setPhase('error');
    }
  };

  const pickCandidate = (exerciseName) => {
    if (existingExerciseNames.includes(exerciseName)) return;
    resetReco();
    onSelect(exerciseName);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={handleClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4 text-blue-400">
          <PlusCircle size={24} />
          <h3 className="text-xl font-bold text-white">Ajouter un Exercice</h3>
        </div>

        {/* Reconnaissance par photo */}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

        {phase === 'idle' && (
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="w-full mb-4 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-blue-300 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 transition-colors"
          >
            <Camera size={18} /> Identifier par photo
          </button>
        )}

        {phase === 'loading' && (
          <div className="w-full mb-4 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-blue-300 bg-blue-600/10 border border-blue-500/20">
            <Loader2 size={18} className="animate-spin" /> Analyse de la machine…
          </div>
        )}

        {phase === 'error' && (
          <div className="mb-4 p-3 rounded-xl bg-amber-900/20 border border-amber-500/30">
            <div className="flex items-start gap-2 text-amber-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={resetReco} className="mt-2 text-xs font-bold text-amber-300 hover:text-amber-200 underline">Réessayer</button>
          </div>
        )}

        {phase === 'results' && result && (
          <div className="mb-4 p-3 rounded-xl bg-slate-900/60 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-blue-400">Exercices probables</h4>
              <button onClick={resetReco} className="text-xs text-slate-400 hover:text-white">✕ Annuler</button>
            </div>
            {result.label && <p className="text-[11px] text-slate-500 mb-2">Lu sur la machine : « {result.label} »</p>}
            <div className="space-y-2">
              {result.candidates.map((c) => {
                const added = existingExerciseNames.includes(c.exercise);
                const pct = c.confidence != null ? Math.round(c.confidence * 100) : null;
                return (
                  <button
                    key={c.exercise}
                    onClick={() => pickCandidate(c.exercise)}
                    disabled={added}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      added ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-blue-600/30 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span>{c.exercise} {added && <span className="text-xs text-slate-600 ml-1">✓ Ajouté</span>}</span>
                      {pct != null && <span className="text-[11px] text-slate-400 tabular-nums">{pct}%</span>}
                    </div>
                    {pct != null && (
                      <div className="mt-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Pas le bon ? Choisis dans la liste ci-dessous.</p>
          </div>
        )}

        {/* Liste manuelle (toujours dispo) */}
        <div className="space-y-3">
          {Object.entries(EXERCISES_DB).map(([category, exercises]) => (
            <div key={category}>
              <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">{MUSCLE_LABELS[category]}</h4>
              <div className="space-y-1">
                {exercises.map((exerciseName) => {
                  const isAlreadyAdded = existingExerciseNames.includes(exerciseName);
                  return (
                    <button
                      key={exerciseName}
                      onClick={() => !isAlreadyAdded && onSelect(exerciseName)}
                      disabled={isAlreadyAdded}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        isAlreadyAdded
                          ? 'text-slate-500 bg-slate-700/30 cursor-not-allowed'
                          : 'text-slate-200 hover:bg-blue-600/30 hover:text-blue-300 cursor-pointer'
                      }`}
                    >
                      {exerciseName} {isAlreadyAdded && <span className="text-xs text-slate-600 ml-2">✓ Ajouté</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Button onClick={handleClose} variant="ghost" fullWidth>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
