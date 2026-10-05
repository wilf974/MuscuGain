import { useState } from 'react';
import { X, Plus, Check, Play, Dumbbell, Trash2, TrendingUp, ScanLine, ChevronLeft, ListPlus } from 'lucide-react';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import VideoModal from '../components/modals/VideoModal';
import AddExerciseModal from '../components/modals/AddExerciseModal';
import { formatTime } from '../utils/format';
import { suggestLoad } from '../utils/coach.core';
import { videoIdFor } from '../utils/scanner.core';
import { exerciseName, sanitizeWeightInput, sanitizeRepsInput } from '../utils/session.core';


export default function Workout({
  activeRoutine,
  workoutData,
  setWorkoutData,
  sessionDuration,
  isRestTimerRunning,
  skipRest,
  restTimer,
  addTimeRest,
  cancelSession,
  leaveSession,
  finishMainWorkout,
  getLastLog,
  startRestTimer,
  addExercise,
  openScanner,
}) {
  const [showVideoFor, setShowVideoFor] = useState(null);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);

  const updateSet = (exercise, index, field, value) => {
    setWorkoutData((data) => {
      const sets = [...(data[exercise] || [])];
      sets[index] = { ...sets[index], [field]: value };
      return { ...data, [exercise]: sets };
    });
  };

  // Remplit le poids de toutes les séries non terminées d'un exercice avec la charge suggérée.
  const fillSuggestedWeight = (exercise, weight) => {
    setWorkoutData((data) => {
      const sets = data[exercise];
      if (!Array.isArray(sets)) return data;
      return { ...data, [exercise]: sets.map((set) => (set.done ? set : { ...set, weight: String(weight) })) };
    });
  };

  const addSet = (exercise) => {
    setWorkoutData((data) => {
      const sets = data[exercise] || [];
      const prev = sets[sets.length - 1];
      return { ...data, [exercise]: [...sets, { weight: prev ? prev.weight : '', reps: prev ? prev.reps : '', done: false }] };
    });
  };

  const removeSet = (exercise, index) => {
    setWorkoutData((data) => {
      if (!data[exercise] || data[exercise].length <= 1) return data;
      return { ...data, [exercise]: data[exercise].filter((_, i) => i !== index) };
    });
  };

  // Temps de pause spécifique à l'exercice (col D du xlsx), sinon null -> défaut global.
  const getRestSeconds = (exName) => {
    const entry = activeRoutine?.exercises?.find((e) => exerciseName(e) === exName);
    return entry && typeof entry === 'object' && entry.restSeconds > 0 ? entry.restSeconds : null;
  };

  const toggleSetDone = (exercise, index) => {
    const wasDone = !!workoutData[exercise]?.[index]?.done;
    updateSet(exercise, index, 'done', !wasDone);
    if (!wasDone) {
      startRestTimer(getRestSeconds(exercise));
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  const pickExercise = (name) => {
    addExercise(name);
    setShowAddExerciseModal(false);
  };

  // Dédoublonnage par nom (routines importées/anciennes pouvant lister 2× le même exercice).
  const exercises = (activeRoutine.exercises || []).filter(
    (e, i, arr) => arr.findIndex((x) => exerciseName(x) === exerciseName(e)) === i,
  );
  const doneSets = Object.values(workoutData).flat().filter((s) => s && s.done).length;
  const totalSets = Object.values(workoutData).flat().length;

  return (
    <div className="pb-32 fade-in">
      <VideoModal exerciseName={showVideoFor} onClose={() => setShowVideoFor(null)} />
      <AddExerciseModal
        isOpen={showAddExerciseModal}
        onClose={() => setShowAddExerciseModal(false)}
        onSelect={pickExercise}
        onScan={() => { setShowAddExerciseModal(false); openScanner(); }}
        existingExercises={exercises}
      />

      <header className="sticky top-safe z-20 -mx-4 px-2 bg-slate-900/95 backdrop-blur-md py-2 border-b border-slate-800 flex justify-between items-center mb-5">
        <div className="flex">
          <IconButton label="Revenir à l’accueil (la séance continue)" onClick={leaveSession}><ChevronLeft size={22} /></IconButton>
          <IconButton label="Annuler la séance" tone="danger" onClick={cancelSession}><X size={20} /></IconButton>
        </div>
        <div className="flex flex-col items-center min-w-0 px-1">
          <h1 className="font-bold text-sm text-slate-300 truncate max-w-[45vw]">{activeRoutine.name}</h1>
          <div className="font-mono text-xl font-bold text-blue-400 tabular-nums leading-none mt-1" aria-label={`Durée ${formatTime(sessionDuration)}`}>{formatTime(sessionDuration)}</div>
          {totalSets > 0 && <span className="text-[11px] text-slate-500 mt-0.5">{doneSets}/{totalSets} séries</span>}
        </div>
        <div className="flex">
          <IconButton label="Ajouter un exercice" tone="blue" onClick={() => setShowAddExerciseModal(true)}><ListPlus size={20} /></IconButton>
          <IconButton label="Scanner une machine" tone="blue" onClick={openScanner}><ScanLine size={20} /></IconButton>
        </div>
      </header>

      {/* Minuteur de repos (basé sur l'heure : juste même après verrouillage de l'iPhone) */}
      {isRestTimerRunning && (
        <div role="dialog" aria-modal="true" aria-label="Repos" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-slate-900/70 backdrop-blur-sm px-6">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-300">Repos</p>
          <div role="timer" aria-live="off" className="bg-slate-800 border-2 border-blue-500 shadow-2xl shadow-blue-900/50 rounded-full w-44 h-44 flex flex-col items-center justify-center">
            <span className="font-mono font-bold text-6xl text-blue-400 tabular-nums">{formatTime(restTimer)}</span>
          </div>
          <div className="flex gap-3 w-full max-w-xs">
            <Button variant="secondary" fullWidth onClick={addTimeRest}><Plus size={16} aria-hidden="true" /> 30 s</Button>
            <Button fullWidth onClick={skipRest}>Passer</Button>
          </div>
          <p className="text-xs text-slate-500 text-center">Une alarme sonne à la fin si l’app est ouverte (à valider sur iPhone : pas de son écran verrouillé).</p>
        </div>
      )}

      {exercises.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center space-y-4">
          <Dumbbell size={36} className="mx-auto text-slate-500" aria-hidden="true" />
          <div>
            <h2 className="text-white font-bold">Séance libre</h2>
            <p className="text-sm text-slate-400 mt-1">Ajoute ton premier exercice : scanne la machine devant toi ou choisis dans le catalogue.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={openScanner}><ScanLine size={18} aria-hidden="true" /> Scanner</Button>
            <Button variant="secondary" onClick={() => setShowAddExerciseModal(true)}><ListPlus size={18} aria-hidden="true" /> Catalogue</Button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {exercises.map((exerciseEntry, exIndex) => {
          const exName = exerciseName(exerciseEntry);
          const lastLog = getLastLog(exName);
          const videoId = videoIdFor(exName);
          const sets = workoutData[exName] || [];

          // Reps cible : entrée de routine, sinon reps de la 1ère série, sinon 8.
          const routineReps = exerciseEntry && typeof exerciseEntry === 'object' ? exerciseEntry.targetReps : undefined;
          const targetReps = Number(routineReps) || Number(sets[0]?.reps) || 8;
          const suggestion = suggestLoad(lastLog, targetReps);
          // N'afficher que si la suggestion diffère d'un poids déjà saisi (1ère série non terminée).
          const firstActive = sets.find((s) => !s.done);
          const showSuggestion = suggestion && (!firstActive || String(firstActive.weight) !== String(suggestion.weight));

          return (
            <section key={exName} aria-label={exName} className="fade-in">
              <div className="flex items-start gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setShowVideoFor(exName)}
                  aria-label={`Fiche et vidéo : ${exName}`}
                  className="shrink-0 relative overflow-hidden rounded-xl bg-slate-800 border border-slate-700 w-20 h-16 flex items-center justify-center"
                >
                  {videoId ? (
                    <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} alt="" loading="lazy" className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <Dumbbell className="text-slate-500" size={24} aria-hidden="true" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20" aria-hidden="true">
                    <span className="bg-black/50 rounded-full p-1.5">
                      <Play size={12} className="text-onaccent fill-onaccent" />
                    </span>
                  </span>
                </button>

                <div className="flex-1 min-w-0">
                  <h2 className="text-blue-400 font-semibold text-base leading-tight mb-1.5">
                    <span className="text-slate-500 mr-1.5">#{exIndex + 1}</span>
                    {exName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {lastLog && (
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
                        Dernier : {lastLog.weight} kg × {lastLog.reps}
                      </span>
                    )}
                    {showSuggestion && (
                      <button
                        type="button"
                        onClick={() => fillSuggestedWeight(exName, suggestion.weight)}
                        className={`min-h-9 text-xs font-semibold px-2.5 rounded-full inline-flex items-center gap-1 border transition-colors active:scale-95 ${
                          suggestion.bump
                            ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                        }`}
                        aria-label={`Appliquer ${suggestion.weight} kg aux séries restantes`}
                      >
                        <TrendingUp size={12} aria-hidden="true" /> Suggéré : {suggestion.weight} kg
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 text-xs text-slate-500 uppercase text-center px-1" aria-hidden="true">
                  <div>Série</div>
                  <div>kg</div>
                  <div>Reps</div>
                  <div>OK</div>
                </div>
                {sets.map((set, setIndex) => (
                  <div
                    key={setIndex}
                    className={`grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 items-center rounded-xl p-1.5 transition-colors ${set.done ? 'bg-green-900/20 border border-green-900/40' : 'bg-slate-800/50 border border-transparent'}`}
                  >
                    <div className="flex items-center justify-center">
                      {sets.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeSet(exName, setIndex)}
                          aria-label={`Supprimer la série ${setIndex + 1}`}
                          className="min-w-11 min-h-11 flex flex-col items-center justify-center rounded-lg text-slate-400 hover:text-red-400 font-mono"
                        >
                          <span className="text-sm leading-none">{setIndex + 1}</span>
                          <Trash2 size={11} className="mt-1 opacity-60" aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="font-mono text-slate-400">{setIndex + 1}</span>
                      )}
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="next"
                      autoComplete="off"
                      placeholder="0"
                      value={set.weight}
                      onChange={(e) => updateSet(exName, setIndex, 'weight', sanitizeWeightInput(e.target.value))}
                      aria-label={`${exName}, série ${setIndex + 1}, poids en kg`}
                      className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded-lg px-2 text-center text-white focus:border-blue-500 outline-none font-bold tabular-nums"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      enterKeyHint="done"
                      autoComplete="off"
                      placeholder="0"
                      value={set.reps}
                      onChange={(e) => updateSet(exName, setIndex, 'reps', sanitizeRepsInput(e.target.value))}
                      aria-label={`${exName}, série ${setIndex + 1}, répétitions`}
                      className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded-lg px-2 text-center text-white focus:border-blue-500 outline-none tabular-nums"
                    />
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => toggleSetDone(exName, setIndex)}
                        aria-pressed={!!set.done}
                        aria-label={`${set.done ? 'Annuler' : 'Valider'} la série ${setIndex + 1}`}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${set.done ? 'bg-green-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}
                      >
                        <Check size={20} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full text-sm border border-dashed border-slate-700" onClick={() => addSet(exName)}>
                  <Plus size={16} aria-hidden="true" /> Ajouter une série
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-8 space-y-3 pb-safe">
        {exercises.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="soft" onClick={() => setShowAddExerciseModal(true)}><Plus size={16} aria-hidden="true" /> Exercice</Button>
            <Button variant="soft" onClick={openScanner}><ScanLine size={16} aria-hidden="true" /> Scanner</Button>
          </div>
        )}
        <Button variant="success" fullWidth onClick={finishMainWorkout} disabled={exercises.length === 0}>
          Terminer la séance
        </Button>
      </div>
    </div>
  );
}
