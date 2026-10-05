import { useState } from 'react';
import { ChevronLeft, ChevronUp, ChevronDown, X, Check } from 'lucide-react';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import { useToast } from '../components/ui/Toast';
import { mergedCatalog, loadCustomExercises } from '../data/customExercises';

export default function CreateRoutine({ setView, customRoutines, saveRoutines, editingRoutine = null }) {
  const showToast = useToast();
  const [newRoutineName, setNewRoutineName] = useState(() => (editingRoutine ? editingRoutine.name : ''));
  const [newRoutineExercises, setNewRoutineExercises] = useState(() =>
    editingRoutine
      ? editingRoutine.exercises.map((raw) => (typeof raw === 'string' ? { name: raw } : raw)).map((ex) => ({
          name: ex.name,
          targetSets: ex.targetSets ?? '',
          targetReps: ex.targetReps ?? '',
          startingWeight: ex.startingWeight ?? '',
          restSeconds: ex.restSeconds ?? '',
        }))
      : []
  );
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [catalog] = useState(() => mergedCatalog(loadCustomExercises()));

  const toggleExerciseSelection = (exerciseName) => {
    const existingIndex = newRoutineExercises.findIndex((ex) => ex.name === exerciseName);
    if (existingIndex >= 0) {
      setNewRoutineExercises(newRoutineExercises.filter((_, idx) => idx !== existingIndex));
    } else {
      setNewRoutineExercises([...newRoutineExercises, { name: exerciseName, targetSets: '', targetReps: '', startingWeight: '', restSeconds: '' }]);
    }
  };

  const removeAt = (idx) => {
    setNewRoutineExercises(newRoutineExercises.filter((_, i) => i !== idx));
  };

  const moveUp = (idx) => {
    if (idx <= 0) return;
    const updated = [...newRoutineExercises];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setNewRoutineExercises(updated);
  };

  const moveDown = (idx) => {
    if (idx >= newRoutineExercises.length - 1) return;
    const updated = [...newRoutineExercises];
    [updated[idx + 1], updated[idx]] = [updated[idx], updated[idx + 1]];
    setNewRoutineExercises(updated);
  };

  const updateFieldAt = (idx, field, value) => {
    const updated = newRoutineExercises.map((ex, i) => {
      if (i !== idx) return ex;
      if (field === 'startingWeight' || field === 'restSeconds') return { ...ex, [field]: value };
      return { ...ex, [field]: value === '' ? '' : Math.max(1, parseInt(value) || 1) };
    });
    setNewRoutineExercises(updated);
  };

  const saveCustomRoutine = () => {
    if (!newRoutineName.trim() || newRoutineExercises.length === 0) return;

    const normalizedExercises = newRoutineExercises.map((ex) => {
      const out = {
        name: ex.name,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        startingWeight: ex.startingWeight,
      };
      const rest = parseInt(ex.restSeconds);
      if (ex.restSeconds !== '' && ex.restSeconds != null && !isNaN(rest) && rest > 0) {
        out.restSeconds = rest;
      }
      return out;
    });

    let updatedRoutines;
    if (editingRoutine) {
      const updatedRoutine = {
        ...editingRoutine,
        name: newRoutineName,
        exercises: normalizedExercises,
        isCustom: true,
      };
      updatedRoutines = customRoutines.map((r) => (r.id === editingRoutine.id ? updatedRoutine : r));
    } else {
      const newRoutine = {
        id: 'custom_' + Date.now(),
        name: newRoutineName,
        desc: 'Programme personnalisé',
        exercises: normalizedExercises,
        isCustom: true,
      };
      updatedRoutines = [newRoutine, ...customRoutines];
    }

    saveRoutines(updatedRoutines);
    showToast(editingRoutine ? 'Programme mis à jour' : 'Programme créé');
    setView('dashboard');
  };

  const canSave = newRoutineName.trim() && newRoutineExercises.length > 0;

  return (
    <div className="pb-32 fade-in">
      <header className="sticky top-safe z-10 -mx-4 px-2 bg-slate-900/95 backdrop-blur-md py-2 border-b border-slate-800 flex items-center gap-2 mb-6">
        <IconButton label="Retour à l’accueil" onClick={() => setView('dashboard')}><ChevronLeft size={22} /></IconButton>
        <h1 className="font-bold text-lg text-white">{editingRoutine ? 'Modifier le programme' : 'Créer un programme'}</h1>
      </header>

      <div className="space-y-6">
        <div>
          <label htmlFor="routine-name" className="block text-xs text-slate-400 uppercase font-bold mb-2">Nom du programme</label>
          <input
            id="routine-name"
            enterKeyHint="done"
            maxLength={60}
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
              <button type="button" onClick={() => setNewRoutineExercises([])} className="min-h-11 px-2 text-xs text-red-400 hover:text-red-300">Tout effacer</button>
            )}
          </div>

          {newRoutineExercises.length > 0 ? (
            <div className="bg-slate-800 rounded-xl p-2 space-y-2">
              {newRoutineExercises.map((exObj, idx) => (
                <div key={idx} className="bg-slate-700/50 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm font-medium flex-1 truncate">{exObj.name}</span>
                    <IconButton label={`Monter ${exObj.name}`} tone="blue" onClick={() => moveUp(idx)} disabled={idx === 0} className="disabled:opacity-30">
                      <ChevronUp size={18} />
                    </IconButton>
                    <IconButton label={`Descendre ${exObj.name}`} tone="blue" onClick={() => moveDown(idx)} disabled={idx === newRoutineExercises.length - 1} className="disabled:opacity-30">
                      <ChevronDown size={18} />
                    </IconButton>
                    <IconButton label={`Retirer ${exObj.name}`} tone="danger" onClick={() => removeAt(idx)}>
                      <X size={18} />
                    </IconButton>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <label className="block">
                      <span className="text-slate-500">Séries</span>
                      <input type="text" inputMode="numeric" autoComplete="off" value={exObj.targetSets} onChange={(e) => updateFieldAt(idx, 'targetSets', e.target.value)} placeholder="0" className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded-lg px-1 text-center text-white focus:border-blue-500 outline-none" />
                    </label>
                    <label className="block">
                      <span className="text-slate-500">Reps</span>
                      <input type="text" inputMode="numeric" autoComplete="off" value={exObj.targetReps} onChange={(e) => updateFieldAt(idx, 'targetReps', e.target.value)} placeholder="0" className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded-lg px-1 text-center text-white focus:border-blue-500 outline-none" />
                    </label>
                    <label className="block">
                      <span className="text-slate-500">Poids (kg)</span>
                      <input type="text" inputMode="decimal" autoComplete="off" value={exObj.startingWeight} onChange={(e) => updateFieldAt(idx, 'startingWeight', e.target.value.replace(',', '.'))} placeholder="0" className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded-lg px-1 text-center text-white focus:border-blue-500 outline-none" />
                    </label>
                    <label className="block">
                      <span className="text-slate-500">Pause (s)</span>
                      <input type="text" inputMode="numeric" autoComplete="off" value={exObj.restSeconds} onChange={(e) => updateFieldAt(idx, 'restSeconds', e.target.value)} placeholder="0" className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded-lg px-1 text-center text-white focus:border-blue-500 outline-none" />
                    </label>
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
            {catalog.map(({ category, label, exercises }) => {
              const isExpanded = expandedCategory === category;
              return (
                <div key={category} className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/50">
                  <button type="button" aria-expanded={isExpanded} onClick={() => setExpandedCategory(isExpanded ? null : category)} className="w-full flex justify-between items-center p-4 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${isExpanded ? 'bg-blue-500' : 'bg-slate-600'}`}></div>
                      <span className="font-semibold text-white capitalize">{label}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>
                  {isExpanded && (
                    <div className="p-2 pt-0 bg-slate-900/50 border-t border-slate-700/50 grid grid-cols-1 gap-1">
                      {exercises.map((ex) => {
                        const isSelected = newRoutineExercises.some((item) => item.name === ex);
                        return (
                          <button
                            type="button"
                            key={ex}
                            aria-pressed={isSelected}
                            onClick={() => toggleExerciseSelection(ex)}
                            className={`min-h-11 flex justify-between items-center p-3 rounded-lg text-sm text-left transition-all ${
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
            disabled={!canSave}
          >
            {editingRoutine ? 'Mettre à jour' : 'Sauvegarder le programme'}
          </Button>
        </div>
      </div>
    </div>
  );
}
