import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import useAlarm from './hooks/useAlarm';
import useWorkoutSession from './hooks/useWorkoutSession';
import useNow from './hooks/useNow';
import { upsertMeasurement } from './utils/measurements.core';
import { buildHistoryEntry, upsertHistoryEntry, canResume, exerciseName } from './utils/session.core';
import { localDateKey } from './utils/dates.core';
import { KEYS, load, save, remove, loadFlag, saveFlag, loadHistory, isArray, isObject } from './utils/storage';
import { applyTheme, watchSystemTheme } from './utils/theme';
import InstallPrompt from './components/InstallPrompt';
import NavBar from './components/NavBar';
import OfflineBanner from './components/OfflineBanner';
import ConfirmationModal from './components/modals/ConfirmationModal';
import ScannerSheet from './components/scanner/ScannerSheet';
import SettingsSheet from './components/SettingsSheet';
import Onboarding from './components/Onboarding';
import Dashboard from './views/Dashboard';
import SessionSetup from './views/SessionSetup';
import Warmup from './views/Warmup';
import Workout from './views/Workout';
import Cooldown from './views/Cooldown';
import { useToast } from './components/ui/Toast';
import { requestPersistentStorage } from './utils/persistence';
import { daysSince, shouldRemind, fireReminder } from './utils/reminder';

// Vues/modales lourdes chargées à la demande (précachées par le service worker → dispo hors ligne).
const History = lazy(() => import('./views/History'));
const BodyAnalysis = lazy(() => import('./views/BodyAnalysis'));
const CreateRoutine = lazy(() => import('./views/CreateRoutine'));
const ImportRoutineModal = lazy(() => import('./components/modals/ImportRoutineModal'));
const GenerateProgramModal = lazy(() => import('./components/modals/GenerateProgramModal'));

// Raccourci d'icône (manifest) : /?action=scan ouvre directement le scanner.
const launchAction = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('action') : null;

const Loading = () => (
  <div role="status" className="flex items-center justify-center gap-2 py-16 text-slate-400">
    <Loader2 size={20} className="animate-spin" aria-hidden="true" /> Chargement…
  </div>
);

export default function App() {
  const showToast = useToast();
  const { playAlarmSound, unlock: unlockAlarm } = useAlarm();
  const onRestEnd = useCallback(() => {
    playAlarmSound();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }, [playAlarmSound]);
  const ws = useWorkoutSession({ onRestEnd });

  // view : 'dashboard' | 'history' | 'body' | 'create' | 'session' (étape = ws.phase)
  const [view, setView] = useState(() => (ws.phase ? 'session' : 'dashboard'));
  const [history, setHistory] = useState(loadHistory);
  const [customRoutines, setCustomRoutines] = useState(() => load(KEYS.routines, [], isArray));
  const [bodyAnalyses, setBodyAnalyses] = useState(() => load(KEYS.bodyAnalyses, [], isArray));
  const [measurements, setMeasurements] = useState(() => load(KEYS.measurements, [], isArray));
  const [coachAnalysis, setCoachAnalysis] = useState(() =>
    load(KEYS.coach, null, (v) => isObject(v) && v.date && v.data));
  const [lastFinishedSession, setLastFinishedSession] = useState(() => load(KEYS.lastFinished, null, isObject));
  const [editingRoutine, setEditingRoutine] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(() => launchAction === 'scan');
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Onboarding : 1er lancement uniquement (les utilisateurs existants ont déjà un historique).
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => !loadFlag(KEYS.onboarded) && loadHistory().length === 0 && launchAction !== 'scan');

  // Écriture + alerte si le stockage est plein (mode privé, quota iOS).
  const persist = useCallback((key, value) => {
    if (!save(key, value)) showToast('Stockage plein : donnée non sauvegardée', 'error');
  }, [showToast]);

  // --- Effets de démarrage (aucun setState) ---
  useEffect(() => {
    requestPersistentStorage();
    applyTheme();
    if (launchAction) window.history.replaceState(null, '', window.location.pathname);

    // Rappel de séance (opt-in) : vérifié à l'ouverture de l'app.
    if (loadFlag(KEYS.reminders) === '1' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const lastDateISO = loadHistory()[0]?.date;
      const today = localDateKey();
      const lastRemindedDate = loadFlag(KEYS.lastReminder);
      if (shouldRemind({ lastDateISO, enabled: true, lastRemindedDate, today, now: Date.now() })) {
        fireReminder(daysSince(lastDateISO));
        saveFlag(KEYS.lastReminder, today);
      }
    }
    return watchSystemTheme();
  }, []);

  // Haut de page à chaque changement d'onglet.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [view]);

  // --- Logique ---
  const getLastLog = useCallback((name) => {
    for (const session of history) {
      const sets = session.exercises && session.exercises[name];
      if (!Array.isArray(sets)) continue;
      for (let i = sets.length - 1; i >= 0; i--) {
        if (sets[i].weight && sets[i].done) return { weight: sets[i].weight, reps: sets[i].reps };
      }
    }
    return null;
  }, [history]);

  const triggerSetup = (routine) => {
    ws.startRoutine(routine, getLastLog);
    setView('session');
  };

  const startFreeSession = () => {
    ws.startFree();
    setView('session');
  };

  const performCancelSession = () => {
    ws.clear();
    setView('dashboard');
    showToast('Séance annulée', 'info');
  };

  // Enregistrement : idempotent (double tap, séance reprise → même id, entrée remplacée).
  const savingRef = useRef(false);
  const saveAndExit = (notes = '') => {
    const s = ws.session;
    if (!s || savingRef.current) return;
    savingRef.current = true;
    const previous = history.find((h) => h.id === s.sessionId);
    const now = Date.now();
    const entry = buildHistoryEntry({
      sessionId: s.sessionId,
      routineName: s.activeRoutine?.name,
      workoutData: s.workoutData,
      startTime: s.sessionStartTime,
      endTime: s.workoutEndTime || now,
      notes: notes || previous?.notes || '',
      now,
    });
    const newHistory = upsertHistoryEntry(history, entry);
    setHistory(newHistory);
    persist(KEYS.history, newHistory);

    const lastSession = {
      finishedAt: now,
      sessionId: s.sessionId,
      activeRoutine: s.activeRoutine,
      workoutData: s.workoutData,
      sessionStartTime: s.sessionStartTime,
      sessionDuration: entry.durationSeconds,
      targetWarmupTime: s.targetWarmupTime,
    };
    setLastFinishedSession(lastSession);
    persist(KEYS.lastFinished, lastSession);

    ws.clear();
    setView('dashboard');
    showToast(previous ? 'Séance mise à jour' : 'Séance enregistrée');
    setTimeout(() => { savingRef.current = false; }, 500);
  };

  // --- Scanner : ajout à la séance en cours, sinon séance libre ---
  const addFromScanner = (name) => {
    if (ws.session) {
      const r = ws.addExercise(name, getLastLog(name));
      showToast(r.added ? `${r.name} ajouté à ta séance` : `${r.name} est déjà dans ta séance`, r.added ? 'success' : 'info');
    } else {
      ws.startFree(name, getLastLog(name));
      showToast(`Séance libre démarrée avec ${name}`);
    }
    setView('session');
  };

  // --- Suppressions confirmées ---
  const requestDeleteRoutine = (id) => setConfirmModal({
    isOpen: true, type: 'routine', id,
    title: 'Supprimer ce programme ?',
    message: 'Cette action est irréversible. Le programme sera retiré de votre liste.',
  });
  const requestDeleteHistory = (id) => setConfirmModal({
    isOpen: true, type: 'history', id,
    title: 'Supprimer cette séance ?',
    message: 'Elle disparaîtra définitivement de votre historique et des statistiques.',
  });
  const requestDeleteMeasurement = (date) => setConfirmModal({
    isOpen: true, type: 'measurement', id: date,
    title: 'Supprimer cette mesure ?',
    message: 'Elle disparaîtra définitivement de vos courbes.',
  });

  const handleConfirmDelete = () => {
    if (confirmModal.type === 'routine') {
      const updated = customRoutines.filter((r) => r.id !== confirmModal.id);
      setCustomRoutines(updated);
      persist(KEYS.routines, updated);
      showToast('Programme supprimé');
    } else if (confirmModal.type === 'history') {
      const newHistory = history.filter((h) => h.id !== confirmModal.id);
      setHistory(newHistory);
      persist(KEYS.history, newHistory);
      // La séance supprimée ne doit plus être « reprenable » (sinon elle réapparaîtrait).
      if (lastFinishedSession?.sessionId === confirmModal.id) {
        setLastFinishedSession(null);
        remove(KEYS.lastFinished);
      }
      showToast('Séance supprimée');
    } else if (confirmModal.type === 'measurement') {
      const updated = measurements.filter((m) => m.date !== confirmModal.id);
      setMeasurements(updated);
      persist(KEYS.measurements, updated);
      showToast('Mesure supprimée');
    }
    setConfirmModal((m) => ({ ...m, isOpen: false }));
  };

  // --- Programmes ---
  const saveRoutines = (updated) => {
    setCustomRoutines(updated);
    persist(KEYS.routines, updated);
  };

  // incoming: [{ name, exercises }]. Écrase un programme existant de même nom.
  const importRoutines = (incoming) => {
    let updated = [...customRoutines];
    incoming.forEach((r, i) => {
      const routine = { id: 'custom_' + Date.now() + '_' + i, name: r.name, desc: 'Importé depuis Excel', exercises: r.exercises, isCustom: true };
      const idx = updated.findIndex((x) => x.name === r.name);
      if (idx >= 0) updated[idx] = routine;
      else updated = [routine, ...updated];
    });
    saveRoutines(updated);
    showToast(`${incoming.length} programme${incoming.length > 1 ? 's' : ''} importé${incoming.length > 1 ? 's' : ''}`);
  };

  const addGeneratedRoutine = (program) => {
    const routine = { id: 'custom_' + Date.now(), name: program.name || 'Programme IA', desc: 'Généré par IA', exercises: program.exercises, isCustom: true };
    saveRoutines([routine, ...customRoutines]);
    showToast('Programme généré');
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
    saveRoutines([{ ...routine, id: 'custom_' + Date.now(), name: `${routine.name} (copie)`, isCustom: true }, ...customRoutines]);
    showToast('Programme dupliqué');
  };

  // --- Analyse corporelle (résultat texte uniquement, jamais la photo) ---
  const addBodyAnalysis = (entry) => {
    const updated = [entry, ...bodyAnalyses];
    setBodyAnalyses(updated);
    persist(KEYS.bodyAnalyses, updated);
  };

  const addMeasurement = (entry) => {
    const updated = upsertMeasurement(measurements, entry);
    setMeasurements(updated);
    persist(KEYS.measurements, updated);
    showToast('Mesure enregistrée');
  };

  // --- Bilan Coach IA (cache 1/jour, jour LOCAL) ---
  const saveCoachAnalysis = (data) => {
    const entry = { date: localDateKey(), data };
    setCoachAnalysis(entry);
    persist(KEYS.coach, entry);
  };

  // --- Reprise d'une séance terminée (< 2 h) ---
  const nowTick = useNow(60_000);
  const resumable = !ws.session && canResume(lastFinishedSession, nowTick);
  const resumeLastSession = () => {
    if (!canResume(lastFinishedSession, Date.now())) return;
    ws.resume(lastFinishedSession);
    setView('session');
  };

  const sessionExercises = useMemo(
    () => (ws.activeRoutine?.exercises || []).map(exerciseName),
    [ws.activeRoutine],
  );

  const finishOnboarding = () => {
    saveFlag(KEYS.onboarded, '1');
    setOnboardingOpen(false);
  };

  const inSession = view === 'session' && !!ws.phase;
  const shownView = view === 'session' && !ws.phase ? 'dashboard' : view;

  return (
    <div className="min-h-screen-safe max-w-md mx-auto bg-slate-900 px-4 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] relative">
      {/* Bande derrière la barre d'état iOS (texte blanc en mode standalone « black-translucent ») */}
      <div className="fixed top-0 inset-x-0 h-safe-top bg-[#0f172a] z-[100] pointer-events-none" aria-hidden="true" />
      <OfflineBanner />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={confirmModal.title}
        message={confirmModal.message}
      />
      <ConfirmationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={performCancelSession}
        title="Annuler la séance ?"
        message="Les séries saisies seront perdues. Pour garder ta séance, utilise plutôt « Terminer la séance »."
        confirmLabel="Annuler la séance"
        cancelLabel="Continuer"
      />
      <Suspense fallback={null}>
        {importModalOpen && (
          <ImportRoutineModal
            isOpen
            onClose={() => setImportModalOpen(false)}
            existingNames={customRoutines.map((r) => r.name)}
            onConfirm={importRoutines}
          />
        )}
        {generateModalOpen && (
          <GenerateProgramModal isOpen onClose={() => setGenerateModalOpen(false)} onSave={addGeneratedRoutine} />
        )}
      </Suspense>
      <ScannerSheet
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        hasActiveSession={!!ws.session}
        sessionExercises={sessionExercises}
        onAdd={addFromScanner}
      />
      <SettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onReplayOnboarding={() => { setSettingsOpen(false); setOnboardingOpen(true); }}
        stats={{ sessions: history.length, routines: customRoutines.length, measurements: measurements.length, analyses: bodyAnalyses.length }}
      />
      <Onboarding isOpen={onboardingOpen} onClose={finishOnboarding} />

      <main id="main">
        {shownView === 'dashboard' && (
          <Dashboard
            history={history}
            customRoutines={customRoutines}
            activeRoutine={ws.activeRoutine}
            sessionPhase={ws.phase}
            sessionDuration={ws.sessionDuration}
            lastFinishedSession={lastFinishedSession}
            resumable={resumable}
            triggerSetup={triggerSetup}
            startFreeSession={startFreeSession}
            openSession={() => setView('session')}
            openScanner={() => setScannerOpen(true)}
            openSettings={() => setSettingsOpen(true)}
            requestDeleteRoutine={requestDeleteRoutine}
            resumeLastSession={resumeLastSession}
            onImportClick={() => setImportModalOpen(true)}
            onGenerateClick={() => setGenerateModalOpen(true)}
            onCreateClick={startCreateRoutine}
            onEditRoutine={startEditRoutine}
            onDuplicateRoutine={duplicateRoutine}
            coachAnalysis={coachAnalysis}
            onCoachAnalyzed={saveCoachAnalysis}
            bodyAnalyses={bodyAnalyses}
          />
        )}
        <Suspense fallback={<Loading />}>
          {shownView === 'create' && (
            <CreateRoutine
              setView={(v) => { setEditingRoutine(null); setView(v); }}
              customRoutines={customRoutines}
              saveRoutines={saveRoutines}
              editingRoutine={editingRoutine}
            />
          )}
          {shownView === 'history' && (
            <History history={history} requestDeleteHistory={requestDeleteHistory} />
          )}
          {shownView === 'body' && (
            <BodyAnalysis
              bodyAnalyses={bodyAnalyses}
              addBodyAnalysis={addBodyAnalysis}
              measurements={measurements}
              addMeasurement={addMeasurement}
              requestDeleteMeasurement={requestDeleteMeasurement}
              history={history}
            />
          )}
        </Suspense>
        {inSession && ws.phase === 'setup' && (
          <SessionSetup
            routineName={ws.activeRoutine?.name}
            exerciseCount={sessionExercises.length}
            cancelSession={() => setCancelModalOpen(true)}
            targetWarmupTime={ws.targetWarmupTime}
            setTargetWarmupTime={ws.setTargetWarmupTime}
            confirmSetupAndStart={ws.confirmSetup}
          />
        )}
        {inSession && ws.phase === 'warmup' && (
          <Warmup cancelSession={() => setCancelModalOpen(true)} phaseTimer={ws.phaseTimer} startMainWorkout={ws.startMainWorkout} />
        )}
        {inSession && ws.phase === 'workout' && (
          <Workout
            activeRoutine={ws.activeRoutine}
            workoutData={ws.workoutData}
            setWorkoutData={ws.setWorkoutData}
            sessionDuration={ws.sessionDuration}
            isRestTimerRunning={ws.isRestTimerRunning}
            skipRest={ws.skipRest}
            restTimer={ws.restTimer}
            addTimeRest={() => ws.addRestTime(30)}
            cancelSession={() => setCancelModalOpen(true)}
            leaveSession={() => setView('dashboard')}
            finishMainWorkout={ws.finishMainWorkout}
            getLastLog={getLastLog}
            startRestTimer={(sec) => { unlockAlarm(); ws.startRest(sec); }}
            addExercise={(name) => ws.addExercise(name, getLastLog(name))}
            openScanner={() => setScannerOpen(true)}
          />
        )}
        {inSession && ws.phase === 'cooldown' && (
          <Cooldown
            cancelSession={() => setCancelModalOpen(true)}
            backToWorkout={ws.startMainWorkout}
            phaseTimer={ws.phaseTimer}
            sessionDuration={ws.sessionDuration}
            workoutData={ws.workoutData}
            saveAndExit={saveAndExit}
            history={history}
            previousNotes={history.find((h) => h.id === ws.session?.sessionId)?.notes || ''}
          />
        )}
      </main>

      {!inSession && (
        <>
          <InstallPrompt />
          <NavBar
            view={shownView}
            setView={setView}
            hasActiveSession={!!ws.session}
            openSession={() => setView('session')}
            openScanner={() => setScannerOpen(true)}
          />
        </>
      )}
    </div>
  );
}
