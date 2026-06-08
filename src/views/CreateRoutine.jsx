import { useState } from 'react';
import { ChevronLeft, ChevronUp, ChevronDown, X, Check } from 'lucide-react';
import Button from '../components/ui/Button';
import { EXERCISES_DB, MUSCLE_LABELS } from '../data/exercises';

export default function CreateRoutine({ setView, customRoutines, setCustomRoutines }) {
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineExercises, setNewRoutineExercises] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);

  const toggleExerciseSelection = (exerciseName) => {
    const existingIndex = newRoutineExercises.findIndex((ex) => ex.name === exerciseName);
    if (existingIndex >= 0) {
      setNewRoutineExercises(newRoutineExercises.filter((_, idx) => idx !== existingIndex));
    } else {
      setNewRoutineExercises([...newRoutineExercises, { name: exerciseName, targetSets: '', targetReps: '', startingWeight: '' }]);
    }
  };

  const updateField = (exerciseName, field, value) => {
    const updated = newRoutineExercises.map((ex) => {
      if (ex.name !== exerciseName) return ex;
      if (field === 'startingWeight') return { ...ex, startingWeight: value };
      return { ...ex, [field]: value === '' ? '' : Math.max(1, parseInt(value) || 1) };
    });
    setNewRoutineExercises(updated);
  };

  const saveCustomRoutine = () => {
    if (!newRoutineName.trim() || newRoutineExercises.length === 0) return;
    const newRoutine = {
      id: 'custom_' + Date.now(),
      name: newRoutineName,
      desc: 'Programme personnalisé',
      exercises: newRoutineExercises,
      isCustom: true,
    };
    const updatedRoutines = [newRoutine, ...customRoutines];
    setCustomRoutines(updatedRoutines);
    localStorage.setItem('muscuGainCustomRoutines', JSON.stringify(updatedRoutines));
    setView('dashboard');
  };

  const canSave = newRoutineName.trim() && newRoutineExercises.length > 0;

  return (
    <div className="pb-32 fade-in">
      <header className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md py-4 border-b border-slate-800 flex items-center gap-4 mb-6">
        <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-white"><ChevronLeft size={20} /></button>
        <h2 className="font-bold text-lg text-white">Créer un programme</h2>
      </header>

      <div className="space-y-6">
        <div>
          <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Nom du programme</label>
          <input
            type="text"
            placeholder="Ex: Pectoraux / Biceps"
            value={newRoutineName}
            onChange={(e) => setNewRoutineName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs text-slate-400 uppercase font-bold">Exercices ({newRoutineExercises.length})</label>
            {newRoutineExercises.length > 0 && (
              <button onClick={() => setNewRoutineExercises([])} className="text-xs text-red-400 hover:text-red-300">Tout effacer</button>
            )}
          </div>

          {newRoutineExercises.length > 0 ? (
            <div className="bg-slate-800 rounded-xl p-2 space-y-2">
              {newRoutineExercises.map((exObj, idx) => (
                <div key={idx} className="bg-slate-700/50 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex-1 truncate">{exObj.name}</span>
                    <button onClick={() => toggleExerciseSelection(exObj.name)} className="text-slate-400 hover:text-red-400">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-slate-500">Séries</label>
                      <input type="number" value={exObj.targetSets} onChange={(e) => updateField(exObj.name, 'targetSets', e.target.value)} placeholder="0" className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-center text-white text-xs focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-slate-500">Reps</label>
                      <input type="number" value={exObj.targetReps} onChange={(e) => updateField(exObj.name, 'targetReps', e.target.value)} placeholder="0" className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-center text-white text-xs focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-slate-500">Poids (kg)</label>
                      <input type="number" step="any" value={exObj.startingWeight} onChange={(e) => updateField(exObj.name, 'startingWeight', e.target.value)} placeholder="0" className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-center text-white text-xs focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-6 text-center text-slate-500 text-sm">Sélectionnez des exercices ci-dessous</div>
          )}
        </div>

        <div>
          <label className="block text-xs text-slate-400 uppercase font-bold mb-3">Ajouter des exercices</label>
          <div className="space-y-3">
            {Object.entries(EXERCISES_DB).map(([category, exercises]) => {
              const isExpanded = expandedCategory === category;
              return (
                <div key={category} className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/50">
                  <button onClick={() => setExpandedCategory(isExpanded ? null : category)} className="w-full flex justify-between items-center p-4 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${isExpanded ? 'bg-blue-500' : 'bg-slate-600'}`}></div>
                      <span className="font-semibold text-white capitalize">{MUSCLE_LABELS[category]}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>
                  {isExpanded && (
                    <div className="p-2 pt-0 bg-slate-900/50 border-t border-slate-700/50 grid grid-cols-1 gap-1">
                      {exercises.map((ex) => {
                        const isSelected = newRoutineExercises.some((item) => item.name === ex);
                        return (
                          <button
                            key={ex}
                            onClick={() => toggleExerciseSelection(ex)}
                            className={`flex justify-between items-center p-3 rounded-lg text-sm text-left transition-all ${
                              isSelected ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'hover:bg-slate-700/50 text-slate-300'
                            }`}
                          >
                            {ex} {isSelected && <Check size={14} className="text-blue-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4">
          <Button
            fullWidth
            variant={canSave ? 'success' : 'secondary'}
            onClick={saveCustomRoutine}
            className={!canSave ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Sauvegarder le programme
          </Button>
        </div>
      </div>
    </div>
  );
}
