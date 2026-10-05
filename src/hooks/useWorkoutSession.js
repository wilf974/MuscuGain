// Machine de séance (setup → échauffement → séance → récup) : état unique persistant,
// timers dérivés de timestamps (justes après arrière-plan / verrouillage iPhone),
// sauvegarde immédiate à chaque changement. Format de stockage compatible avec l'ancienne version.
import { useCallback, useEffect, useRef, useState } from 'react';
import { KEYS, load, save, remove, isObject } from '../utils/storage';
import {
  newId, buildInitialWorkoutData, addExerciseToSession, durationSeconds, restRemaining,
  resolveRestState, normalizeActiveSession, DEFAULT_REST_SECONDS,
} from '../utils/session.core';

const EMPTY_TIMERS = {
  sessionStartTime: null,
  workoutEndTime: null,
  phaseStartTime: null,
  phaseInitialDuration: 0,
  restStartTime: null,
  restInitialDuration: 0,
  isRestTimerRunning: false,
};

function restore() {
  const raw = normalizeActiveSession(load(KEYS.activeSession, null, isObject));
  if (!raw) return null;
  const rest = resolveRestState(raw, Date.now());
  return {
    ...EMPTY_TIMERS,
    ...raw,
    isRestTimerRunning: rest.running,
    targetWarmupTime: Number.isFinite(raw.targetWarmupTime) ? raw.targetWarmupTime : 600,
  };
}

export default function useWorkoutSession({ onRestEnd } = {}) {
  const [session, setSession] = useState(restore);
  const [now, setNow] = useState(() => Date.now());
  const onRestEndRef = useRef(onRestEnd);
  useEffect(() => { onRestEndRef.current = onRestEnd; }, [onRestEnd]);

  // --- Sauvegarde immédiate (chaque série cochée, chaque poids saisi) ---
  useEffect(() => {
    if (session) save(KEYS.activeSession, { ...session, timestamp: Date.now() });
    else remove(KEYS.activeSession);
  }, [session]);

  // --- Horloge : tick tant qu'une séance est active ---
  const active = !!session;
  useEffect(() => {
    if (!active) return undefined;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 250);
    // Retour au premier plan (iOS suspend les timers en arrière-plan) : recalcul immédiat.
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', tick);
    };
  }, [active]);

  // --- Fin du repos : arrêt + alarme (sauf si terminé depuis longtemps) ---
  const restRunning = !!session?.isRestTimerRunning;
  useEffect(() => {
    if (!restRunning || !session) return;
    const st = resolveRestState(session, now);
    if (st.running) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fin de repos dérivée de l'horloge
    setSession((s) => (s ? { ...s, isRestTimerRunning: false } : s));
    if (st.alarm) onRestEndRef.current?.();
  }, [restRunning, now, session]);

  const update = useCallback((patch) => {
    setSession((s) => (s ? { ...s, ...(typeof patch === 'function' ? patch(s) : patch) } : s));
  }, []);

  // --- Démarrages ---
  const startRoutine = useCallback((routine, getLastLog) => {
    setSession({
      ...EMPTY_TIMERS,
      sessionId: newId('s'),
      view: 'setup',
      activeRoutine: routine,
      workoutData: buildInitialWorkoutData(routine, getLastLog),
      targetWarmupTime: 600,
    });
  }, []);

  const startFree = useCallback((firstExercise, lastLog) => {
    let routine = { name: 'Séance libre', exercises: [], isCustom: false };
    let workoutData = {};
    if (firstExercise) ({ routine, workoutData } = addExerciseToSession({ workoutData, routine }, firstExercise, { lastLog }));
    setSession({ ...EMPTY_TIMERS, sessionId: newId('s'), view: 'setup', activeRoutine: routine, workoutData, targetWarmupTime: 600 });
  }, []);

  const setTargetWarmupTime = useCallback((sec) => update({ targetWarmupTime: sec }), [update]);

  const startMainWorkout = useCallback(() => {
    update((s) => ({ view: 'workout', sessionStartTime: s.sessionStartTime || Date.now(), workoutEndTime: null }));
  }, [update]);

  const confirmSetup = useCallback(() => {
    update((s) => (s.targetWarmupTime > 0
      ? { view: 'warmup', phaseStartTime: Date.now(), phaseInitialDuration: s.targetWarmupTime }
      : { view: 'workout', sessionStartTime: s.sessionStartTime || Date.now() }));
  }, [update]);

  const finishMainWorkout = useCallback(() => {
    const t = Date.now();
    update({ view: 'cooldown', phaseStartTime: t, workoutEndTime: t, isRestTimerRunning: false });
  }, [update]);

  // --- Données de séance ---
  const setWorkoutData = useCallback((next) => {
    update((s) => ({ workoutData: typeof next === 'function' ? next(s.workoutData) : next }));
  }, [update]);

  const setActiveRoutine = useCallback((next) => {
    update((s) => ({ activeRoutine: typeof next === 'function' ? next(s.activeRoutine) : next }));
  }, [update]);

  // Ajout idempotent (scanner, catalogue). Calculé sur le dernier état validé → { added, name }.
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  const addExercise = useCallback((name, lastLog) => {
    const s = sessionRef.current;
    if (!s) return { added: false, name };
    const r = addExerciseToSession({ workoutData: s.workoutData, routine: s.activeRoutine }, name, { lastLog });
    if (r.routine !== s.activeRoutine || r.workoutData !== s.workoutData) {
      const next = { ...s, workoutData: r.workoutData, activeRoutine: r.routine };
      sessionRef.current = next;
      setSession(next);
    }
    return { added: r.added, name: r.name };
  }, []);

  // --- Repos ---
  const startRest = useCallback((seconds) => {
    const duration = seconds && seconds > 0 ? seconds : DEFAULT_REST_SECONDS;
    update({ restStartTime: Date.now(), restInitialDuration: duration, isRestTimerRunning: true });
  }, [update]);
  const addRestTime = useCallback((sec = 30) => update((s) => ({ restInitialDuration: s.restInitialDuration + sec })), [update]);
  const skipRest = useCallback(() => update({ isRestTimerRunning: false }), [update]);

  // --- Fin / annulation ---
  const clear = useCallback(() => setSession(null), []);

  // Reprise d'une séance terminée (< 2 h) : même sessionId → l'enregistrement remplacera l'entrée.
  const resume = useCallback((last) => {
    setSession({
      ...EMPTY_TIMERS,
      sessionId: last.sessionId,
      view: 'workout',
      activeRoutine: last.activeRoutine,
      workoutData: last.workoutData || {},
      sessionStartTime: last.sessionStartTime || Date.now(),
      targetWarmupTime: last.targetWarmupTime || 600,
    });
  }, []);

  // --- Valeurs affichées (dérivées de l'horloge) ---
  const phase = session?.view || null;
  const sessionDuration = session ? durationSeconds(session.sessionStartTime, session.workoutEndTime || now) : 0;
  let phaseTimer = 0;
  if (session && phase === 'warmup') {
    phaseTimer = Math.max(0, session.phaseInitialDuration - durationSeconds(session.phaseStartTime, now));
  } else if (session && phase === 'cooldown') {
    phaseTimer = durationSeconds(session.phaseStartTime, now);
  }
  const restTimer = session?.isRestTimerRunning ? restRemaining(session.restStartTime, session.restInitialDuration, now) : 0;

  return {
    session,
    phase,
    activeRoutine: session?.activeRoutine || null,
    workoutData: session?.workoutData || {},
    targetWarmupTime: session?.targetWarmupTime ?? 600,
    sessionDuration,
    phaseTimer,
    restTimer,
    isRestTimerRunning: !!session?.isRestTimerRunning,
    startRoutine,
    startFree,
    setTargetWarmupTime,
    confirmSetup,
    startMainWorkout,
    finishMainWorkout,
    setWorkoutData,
    setActiveRoutine,
    addExercise,
    startRest,
    addRestTime,
    skipRest,
    clear,
    resume,
  };
}
