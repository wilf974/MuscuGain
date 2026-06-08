import { useState } from 'react';
import { X, Plus, Check, Play, Dumbbell } from 'lucide-react';
import Button from '../components/ui/Button';
import VideoModal from '../components/modals/VideoModal';
import AddExerciseModal from '../components/modals/AddExerciseModal';
import { VIDEO_MAPPING } from '../data/videos';
import { EXERCISES_DB } from '../data/exercises';
import { formatTime } from '../utils/format';

export default function Workout({
  activeRoutine,
  setActiveRoutine,
  workoutData,
  setWorkoutData,
  sessionDuration,
  isRestTimerRunning,
  setIsRestTimerRunning,
  restTimer,
  addTimeRest,
  cancelSession,
  finishMainWorkout,
  getLastLog,
  startRestTimer,
}) {
  const [showVideoFor, setShowVideoFor] = useState(null);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);

  const updateSet = (exercise, index, field, value) => {
    const newData = { ...workoutData };
    newData[exercise] = [...newData[exercise]];
    newData[exercise][index] = { ...newData[exercise][index], [field]: value };
    setWorkoutData(newData);
  };

  const addSet = (exercise) => {
    const newData = { ...workoutData };
    const prevSet = newData[exercise][newData[exercise].length - 1];
    newData[exercise] = [...newData[exercise], { weight: prevSet ? prevSet.weight : '', reps: prevSet ? prevSet.reps : '', done: false }];
    setWorkoutData(newData);
  };

  // Temps de pause spécifique à l'exercice (col D du xlsx), sinon null -> défaut global.
  const getRestSeconds = (exName) => {
    const entry = activeRoutine?.exercises?.find((e) => (typeof e === 'string' ? e : e.name) === exName);
    return entry && typeof entry === 'object' && entry.restSeconds > 0 ? entry.restSeconds : null;
  };

  const toggleSetDone = (exercise, index) => {
    const newData = { ...workoutData };
    newData[exercise] = [...newData[exercise]];
    newData[exercise][index] = { ...newData[exercise][index], done: !newData[exercise][index].done };
    setWorkoutData(newData);
    if (newData[exercise][index].done) startRestTimer(getRestSeconds(exercise));
  };

  const addExerciseToSession = (exerciseName) => {
    const newData = { ...workoutData };
    if (!newData[exerciseName]) {
      newData[exerciseName] = [
        { weight: '', reps: '', done: false },
        { weight: '', reps: '', done: false },
        { weight: '', reps: '', done: false },
        { weight: '', reps: '', done: false },
      ];
      setWorkoutData(newData);
      const updatedRoutine = { ...activeRoutine };
      if (!updatedRoutine.exercises.includes(exerciseName)) {
        updatedRoutine.exercises = [...updatedRoutine.exercises, exerciseName];
        setActiveRoutine(updatedRoutine);
      }
      setShowAddExerciseModal(false);
    }
  };

  return (
    <div className="pb-32 fade-in">
      {showVideoFor && <VideoModal exerciseName={showVideoFor} onClose={() => setShowVideoFor(null)} />}
      <AddExerciseModal
        isOpen={showAddExerciseModal}
        onClose={() => setShowAddExerciseModal(false)}
        onSelect={addExerciseToSession}
        exerciseDb={EXERCISES_DB}
        existingExercises={activeRoutine?.exercises || []}
      />

      <header className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md py-4 border-b border-slate-800 flex justify-between items-center mb-6">
        <button onClick={cancelSession} className="text-slate-400 hover:text-white"><X size={20} /></button>
        <div className="flex flex-col items-center">
          <h2 className="font-bold text-sm text-slate-300">{activeRoutine.name}</h2>
          <div className="font-mono text-xl font-bold text-blue-400 tabular-nums leading-none mt-1">{formatTime(sessionDuration)}</div>
        </div>
        <div className="w-6"></div>
      </header>

      {/* Rest Timer Overlay */}
      {isRestTimerRunning && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-slate-900/40 backdrop-blur-sm">
          <button onClick={(e) => { e.stopPropagation(); addTimeRest(); }} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-slate-600 transition-transform active:scale-95 flex items-center gap-1">
            <Plus size={12} /> 30s
          </button>
          <div
            className="bg-slate-800 border-2 border-blue-500 shadow-2xl shadow-blue-900/50 rounded-full w-32 h-32 flex flex-col items-center justify-center cursor-pointer backdrop-blur-md relative overflow-hidden"
            onClick={() => setIsRestTimerRunning(false)}
          >
            <span className="font-mono font-bold text-5xl text-blue-400">{formatTime(restTimer)}</span>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">Passer</span>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {activeRoutine.exercises.map((exerciseEntry, exIndex) => {
          const exName = typeof exerciseEntry === 'string' ? exerciseEntry : exerciseEntry.name;
          const lastLog = getLastLog(exName);
          const videoId = VIDEO_MAPPING[exName];

          return (
            <div key={exIndex} className="fade-in">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="shrink-0 cursor-pointer relative group overflow-hidden rounded-lg bg-slate-800 border border-slate-700 w-20 h-16 flex items-center justify-center"
                  onClick={() => setShowVideoFor(exName)}
                >
                  {videoId ? (
                    <img
                      src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
                      alt={exName}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <Dumbbell className="text-slate-600" size={24} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-all">
                    <div className="bg-black/50 rounded-full p-1 backdrop-blur-sm">
                      <Play size={12} className="text-white fill-white" />
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-blue-400 font-semibold text-sm leading-tight mb-1">
                      <span className="text-slate-500 mr-2">#{exIndex + 1}</span>
                      {exName}
                    </h3>
                  </div>
                  {lastLog && (
                    <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full inline-block">
                      Dernier: {lastLog.weight}kg x {lastLog.reps}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 pl-2">
                <div className="grid grid-cols-10 gap-2 text-xs text-slate-500 uppercase text-center mb-1 px-2">
                  <div className="col-span-2">Set</div>
                  <div className="col-span-3">kg</div>
                  <div className="col-span-3">Reps</div>
                  <div className="col-span-2"></div>
                </div>
                {workoutData[exName] && workoutData[exName].map((set, setIndex) => (
                  <div key={setIndex} className={`grid grid-cols-10 gap-2 items-center bg-slate-800/50 rounded-lg p-2 transition-colors ${set.done ? 'bg-green-900/20 border border-green-900/30' : ''}`}>
                    <div className="col-span-2 text-center font-mono text-slate-400">{setIndex + 1}</div>
                    <div className="col-span-3">
                      <input type="number" step="any" placeholder="0" value={set.weight} onChange={(e) => updateSet(exName, setIndex, 'weight', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-center text-white focus:border-blue-500 outline-none font-bold" />
                    </div>
                    <div className="col-span-3">
                      <input type="number" placeholder="0" value={set.reps} onChange={(e) => updateSet(exName, setIndex, 'reps', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-center text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button onClick={() => toggleSetDone(exName, setIndex)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${set.done ? 'bg-green-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}>
                        <Check size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full py-2 text-sm mt-2 border border-dashed border-slate-700" onClick={() => addSet(exName)}>
                  + Ajouter Série
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 space-y-3">
        <Button fullWidth onClick={() => setShowAddExerciseModal(true)} className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30">
          <Plus size={16} /> Ajouter un Exercice
        </Button>
        <Button fullWidth onClick={finishMainWorkout} className="bg-green-600 hover:bg-green-500 shadow-green-900/50">
          Terminer la séance
        </Button>
      </div>
    </div>
  );
}
