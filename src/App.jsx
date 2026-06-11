import { useState, useEffect, useCallback } from 'react';
import useAlarm from './hooks/useAlarm';
import { calculateVolume } from './utils/format';
import InstallPrompt from './components/InstallPrompt';
import NavBar from './components/NavBar';
import ConfirmationModal from './components/modals/ConfirmationModal';
import ImportRoutineModal from './components/modals/ImportRoutineModal';
import Dashboard from './views/Dashboard';
import CreateRoutine from './views/CreateRoutine';
import SessionSetup from './views/SessionSetup';
import Warmup from './views/Warmup';
import Workout from './views/Workout';
import Cooldown from './views/Cooldown';
import History from './views/History';
import BodyAnalysis from './views/BodyAnalysis';
import { useToast } from './components/ui/Toast';

export default function App() {
  const showToast = useToast();
  const [view, setView] = useState('dashboard');
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [workoutData, setWorkoutData] = useState({});
  const [history, setHistory] = useState([]);
  const [customRoutines, setCustomRoutines] = useState([]);
  const [bodyAnalyses, setBodyAnalyses] = useState([]);
  const [lastFinishedSession, setLastFinishedSession] = useState(null);
  const [editingRoutine, setEditingRoutine] = useState(null);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });
  // Cancel session modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  // Import routines modal
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Timer States
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [phaseStartTime, setPhaseStartTime] = useState(null);
  const [phaseInitialDuration, setPhaseInitialDuration] = useState(0);
  const [restStartTime, setRestStartTime] = useState(null);
  const [restInitialDuration, setRestInitialDuration] = useState(0);

  // Display values
  const [sessionDuration, setSessionDuration] = useState(0);
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);

  // Config
  const [targetWarmupTime, setTargetWarmupTime] = useState(600);
  const [restDuration] = useState(60);

  const playAlarmSound = useAlarm();

  // --- Init & Restore ---
  useEffect(() => {
    const savedHistory = localStorage.getItem('muscuGainHistory');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedRoutines = localStorage.getItem('muscuGainCustomRoutines');
    if (savedRoutines) setCustomRoutines(JSON.parse(savedRoutines));
    const savedBody = localStorage.getItem('muscuGainBodyAnalyses');
    if (savedBody) setBodyAnalyses(JSON.parse(savedBody));

    const savedSession = localStorage.getItem('muscuGainActiveSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.activeRoutine && session.view) {
          setActiveRoutine(session.activeRoutine);
          setWorkoutData(session.workoutData);
          setView(session.view);
          setSessionStartTime(session.sessionStartTime);
          setPhaseStartTime(session.phaseStartTime);
          setPhaseInitialDuration(session.phaseInitialDuration);
          setRestStartTime(session.restStartTime);
          setRestInitialDuration(session.restInitialDuration);
          setIsRestTimerRunning(session.isRestTimerRunning);
          setTargetWarmupTime(session.targetWarmupTime || 600);
        }
      } catch {
        localStorage.removeItem('muscuGainActiveSession');
      }
    }

    const savedLastSession = localStorage.getItem('muscuGainLastFinishedSession');
    if (savedLastSession) {
      try {
        setLastFinishedSession(JSON.parse(savedLastSession));
      } catch {
        localStorage.removeItem('muscuGainLastFinishedSession');
      }
    }
  }, []);

  // --- Auto-Save ---
  useEffect(() => {
    if (activeRoutine && ['setup', 'warmup', 'workout', 'cooldown'].includes(view)) {
      const sessionState = {
        view,
        activeRoutine,
        workoutData,
        sessionStartTime,
        phaseStartTime,
        phaseInitialDuration,
        restStartTime,
        restInitialDuration,
        isRestTimerRunning,
        targetWarmupTime,
        timestamp: Date.now(),
      };
      localStorage.setItem('muscuGainActiveSession', JSON.stringify(sessionState));
    }
  }, [view, activeRoutine, workoutData, sessionStartTime, phaseStartTime, restStartTime, isRestTimerRunning, targetWarmupTime, phaseInitialDuration, restInitialDuration]);

  // --- Rest Timer ---
  useEffect(() => {
    if (!isRestTimerRunning || !restStartTime) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - restStartTime) / 1000);
      const remaining = Math.max(0, restInitialDuration - elapsed);
      setRestTimer(remaining);
      if (remaining === 0) {
        setIsRestTimerRunning(false);
        playAlarmSound();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isRestTimerRunning, restStartTime, restInitialDuration, playAlarmSound]);

  // --- Session / Phase Timer ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (view === 'workout' && sessionStartTime) {
        setSessionDuration(Math.floor((now - sessionStartTime) / 1000));
      } else if (view === 'cooldown' && phaseStartTime) {
        setPhaseTimer(Math.floor((now - phaseStartTime) / 1000));
      } else if (view === 'warmup' && phaseStartTime) {
        const elapsed = Math.floor((now - phaseStartTime) / 1000);
        setPhaseTimer(Math.max(0, phaseInitialDuration - elapsed));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [view, sessionStartTime, phaseStartTime, phaseInitialDuration]);

  // --- Logic ---
  const getLastLog = useCallback((exerciseName) => {
    for (const session of history) {
      if (session.exercises && session.exercises[exerciseName]) {
        const sets = session.exercises[exerciseName];
        for (let i = sets.length - 1; i >= 0; i--) {
          if (sets[i].weight && sets[i].done) {
            return { weight: sets[i].weight, reps: sets[i].reps };
          }
        }
      }
    }
    return null;
  }, [history]);

  const triggerSetup = (routine) => {
    const initialData = {};
    routine.exercises.forEach((exEntry) => {
      const exName = typeof exEntry === 'string' ? exEntry : exEntry.name;
      const targetSets = typeof exEntry === 'string' ? 4 : (parseInt(exEntry.targetSets) || 4);
      const targetReps = typeof exEntry === 'string' ? 8 : (parseInt(exEntry.targetReps) || 8);
      const startingWeight = typeof exEntry === 'string' ? '' : (exEntry.startingWeight || '');
      const weight = startingWeight || (getLastLog(exName) ? getLastLog(exName).weight : '');
      initialData[exName] = [];
      for (let i = 0; i < targetSets; i++) {
        initialData[exName].push({ weight, reps: targetReps, done: false });
      }
    });
    setWorkoutData(initialData);
    setActiveRoutine(routine);
    setView('setup');
  };

  const startFreeSession = () => {
    setWorkoutData({});
    setActiveRoutine({ name: 'Séance libre', exercises: [], isCustom: false });
    setView('setup');
  };

  const cancelSession = () => {
    setCancelModalOpen(true);
  };

  const performCancelSession = () => {
    localStorage.removeItem('muscuGainActiveSession');
    setActiveRoutine(null);
    setWorkoutData({});
    setView('dashboard');
    setSessionStartTime(null);
    setPhaseStartTime(null);
    setRestStartTime(null);
    setIsRestTimerRunning(false);
  };

  const confirmSetupAndStart = () => {
    if (targetWarmupTime > 0) {
      setPhaseStartTime(Date.now());
      setPhaseInitialDuration(targetWarmupTime);
      setPhaseTimer(targetWarmupTime);
      setView('warmup');
    } else {
      startMainWorkout();
    }
  };

  const startMainWorkout = () => {
    setSessionStartTime(Date.now());
    setSessionDuration(0);
    setView('workout');
  };

  const finishMainWorkout = () => {
    setPhaseStartTime(Date.now());
    setPhaseTimer(0);
    setView('cooldown');
  };

  const saveAndExit = (notes = '') => {
    const newEntry = {
      date: new Date().toISOString(),
      routineName: activeRoutine.name,
      exercises: workoutData,
      totalVolume: calculateVolume(workoutData),
      durationSeconds: sessionDuration,
      notes: (notes || '').trim(),
    };
    const newHistory = [newEntry, ...history];
    setHistory(newHistory);
    localStorage.setItem('muscuGainHistory', JSON.stringify(newHistory));

    const lastSession = {
      finishedAt: Date.now(),
      activeRoutine,
      workoutData,
      sessionStartTime,
      sessionDuration,
      phaseStartTime,
      phaseInitialDuration,
      restStartTime,
      restInitialDuration,
      isRestTimerRunning,
      targetWarmupTime,
    };
    setLastFinishedSession(lastSession);
    localStorage.setItem('muscuGainLastFinishedSession', JSON.stringify(lastSession));

    localStorage.removeItem('muscuGainActiveSession');
    setView('dashboard');
    setActiveRoutine(null);
    setSessionStartTime(null);
    setPhaseStartTime(null);
    showToast('Séance enregistrée');
  };

  const startRestTimer = (seconds) => {
    const duration = seconds && seconds > 0 ? seconds : restDuration;
    setRestInitialDuration(duration);
    setRestStartTime(Date.now());
    setRestTimer(duration);
    setIsRestTimerRunning(true);
  };

  const addTimeRest = () => {
    setRestInitialDuration((prev) => prev + 30);
  };

  // --- Delete handlers ---
  const requestDeleteRoutine = (id) => {
    setConfirmModal({
      isOpen: true,
      type: 'routine',
      id,
      title: 'Supprimer ce programme ?',
      message: 'Cette action est irréversible. Le programme sera retiré de votre liste.',
    });
  };

  const requestDeleteHistory = (index) => {
    setConfirmModal({
      isOpen: true,
      type: 'history',
      id: index,
      title: 'Supprimer cette séance ?',
      message: 'Elle disparaîtra définitivement de votre historique et des statistiques.',
    });
  };

  const handleConfirmDelete = () => {
    if (confirmModal.type === 'routine') {
      const updated = customRoutines.filter((r) => r.id !== confirmModal.id);
      setCustomRoutines(updated);
      localStorage.setItem('muscuGainCustomRoutines', JSON.stringify(updated));
      showToast('Programme supprimé');
    } else if (confirmModal.type === 'history') {
      const newHistory = history.filter((_, i) => i !== confirmModal.id);
      setHistory(newHistory);
      localStorage.setItem('muscuGainHistory', JSON.stringify(newHistory));
      showToast('Séance supprimée');
    }
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  // --- Import routines (depuis .xlsx) ---
  // incoming: [{ name, exercises }]. Écrase un programme existant de même nom.
  const importRoutines = (incoming) => {
    let updated = [...customRoutines];
    incoming.forEach((r, i) => {
      const routine = {
        id: 'custom_' + Date.now() + '_' + i,
        name: r.name,
        desc: 'Importé depuis Excel',
        exercises: r.exercises,
        isCustom: true,
      };
      const idx = updated.findIndex((x) => x.name === r.name);
      if (idx >= 0) updated[idx] = routine;
      else updated = [routine, ...updated];
    });
    setCustomRoutines(updated);
    localStorage.setItem('muscuGainCustomRoutines', JSON.stringify(updated));
  };

  const startEditRoutine = (routine) => {
    setEditingRoutine(routine);
    setView('create');
  };

  const startCreateRoutine = () => {
    setEditingRoutine(null);
    setView('create');
  };

  const duplicateRoutine = (routine) => {
    const copy = {
      ...routine,
      id: 'custom_' + Date.now(),
      name: `${routine.name} (copie)`,
      isCustom: true,
    };
    const updated = [copy, ...customRoutines];
    setCustomRoutines(updated);
    localStorage.setItem('muscuGainCustomRoutines', JSON.stringify(updated));
  };

  // --- Analyse corporelle ---
  const addBodyAnalysis = (entry) => {
    const updated = [entry, ...bodyAnalyses];
    setBodyAnalyses(updated);
    localStorage.setItem('muscuGainBodyAnalyses', JSON.stringify(updated));
  };

  // --- Resume ---
  const canResumeSession = () => {
    if (!lastFinishedSession) return false;
    const timeSinceFinish = Date.now() - lastFinishedSession.finishedAt;
    return timeSinceFinish < 2 * 60 * 60 * 1000;
  };

  const resumeLastSession = () => {
    if (!canResumeSession()) return;
    const session = lastFinishedSession;
    setActiveRoutine(session.activeRoutine);
    setWorkoutData(session.workoutData);
    setSessionStartTime(session.sessionStartTime);
    setSessionDuration(session.sessionDuration || 0);
    setPhaseStartTime(session.phaseStartTime);
    setPhaseInitialDuration(session.phaseInitialDuration);
    setRestStartTime(session.restStartTime);
    setRestInitialDuration(session.restInitialDuration);
    setIsRestTimerRunning(session.isRestTimerRunning);
    setTargetWarmupTime(session.targetWarmupTime || 600);
    setView('workout');
  };

  const isSessionView = ['workout', 'warmup', 'cooldown', 'setup'].includes(view);

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-900 p-4 pb-0 relative">
      <InstallPrompt />

      {/* Delete confirmation modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      {/* Cancel session modal */}
      <ConfirmationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={performCancelSession}
        title="Annuler la séance ?"
        message="Votre progression actuelle sera perdue."
        confirmLabel="Annuler la séance"
      />

      {/* Import routines modal */}
      <ImportRoutineModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        existingNames={customRoutines.map((r) => r.name)}
        onConfirm={importRoutines}
      />

      {view === 'dashboard' && (
        <Dashboard
          history={history}
          customRoutines={customRoutines}
          activeRoutine={activeRoutine}
          lastFinishedSession={lastFinishedSession}
          setView={setView}
          triggerSetup={triggerSetup}
          startFreeSession={startFreeSession}
          requestDeleteRoutine={requestDeleteRoutine}
          resumeLastSession={resumeLastSession}
          canResumeSession={canResumeSession}
          onImportClick={() => setImportModalOpen(true)}
          onCreateClick={startCreateRoutine}
          onEditRoutine={startEditRoutine}
          onDuplicateRoutine={duplicateRoutine}
        />
      )}
      {view === 'create' && (
        <CreateRoutine
          setView={(v) => { setEditingRoutine(null); setView(v); }}
          customRoutines={customRoutines}
          setCustomRoutines={setCustomRoutines}
          editingRoutine={editingRoutine}
        />
      )}
      {view === 'setup' && (
        <SessionSetup
          cancelSession={cancelSession}
          targetWarmupTime={targetWarmupTime}
          setTargetWarmupTime={setTargetWarmupTime}
          confirmSetupAndStart={confirmSetupAndStart}
        />
      )}
      {view === 'warmup' && (
        <Warmup
          cancelSession={cancelSession}
          phaseTimer={phaseTimer}
          startMainWorkout={startMainWorkout}
        />
      )}
      {view === 'workout' && (
        <Workout
          activeRoutine={activeRoutine}
          setActiveRoutine={setActiveRoutine}
          workoutData={workoutData}
          setWorkoutData={setWorkoutData}
          sessionDuration={sessionDuration}
          isRestTimerRunning={isRestTimerRunning}
          setIsRestTimerRunning={setIsRestTimerRunning}
          restTimer={restTimer}
          addTimeRest={addTimeRest}
          cancelSession={cancelSession}
          finishMainWorkout={finishMainWorkout}
          getLastLog={getLastLog}
          startRestTimer={startRestTimer}
        />
      )}
      {view === 'cooldown' && (
        <Cooldown
          cancelSession={cancelSession}
          phaseTimer={phaseTimer}
          sessionDuration={sessionDuration}
          workoutData={workoutData}
          saveAndExit={saveAndExit}
          history={history}
        />
      )}
      {view === 'history' && (
        <History
          history={history}
          requestDeleteHistory={requestDeleteHistory}
        />
      )}
      {view === 'body' && (
        <BodyAnalysis bodyAnalyses={bodyAnalyses} addBodyAnalysis={addBodyAnalysis} />
      )}

      {!isSessionView && <NavBar view={view} setView={setView} activeRoutine={activeRoutine} />}
    </div>
  );
}
