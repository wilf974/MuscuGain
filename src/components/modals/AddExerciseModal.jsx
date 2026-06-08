import { PlusCircle } from 'lucide-react';
import Button from '../ui/Button';
import { EXERCISES_DB, MUSCLE_LABELS } from '../../data/exercises';

export default function AddExerciseModal({ isOpen, onClose, onSelect, existingExercises = [] }) {
  if (!isOpen) return null;
  const existingExerciseNames = existingExercises.map((ex) => (typeof ex === 'string' ? ex : ex.name));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4 text-blue-400">
          <PlusCircle size={24} />
          <h3 className="text-xl font-bold text-white">Ajouter un Exercice</h3>
        </div>
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
          <Button onClick={onClose} variant="ghost" fullWidth>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
