// src/utils/session.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInitialWorkoutData, addExerciseToSession, buildHistoryEntry, upsertHistoryEntry,
  restRemaining, resolveRestState, canResume, normalizeActiveSession, durationSeconds, newId,
} from './session.core.js';

test('buildInitialWorkoutData : séries cibles, charge de départ puis dernier log', () => {
  const routine = { exercises: [{ name: 'Squat', targetSets: 3, targetReps: 5 }, 'Curl', { name: 'Bench', startingWeight: '60' }] };
  const data = buildInitialWorkoutData(routine, (n) => (n === 'Squat' ? { weight: '100', reps: 5 } : null));
  assert.equal(data.Squat.length, 3);
  assert.equal(data.Squat[0].weight, '100');
  assert.equal(data.Squat[0].reps, 5);
  assert.equal(data.Curl.length, 4);
  assert.equal(data.Bench[0].weight, '60');
});

test('addExerciseToSession ajoute puis reste idempotent (pas de doublon, séries conservées)', () => {
  const start = { workoutData: {}, routine: { name: 'Séance libre', exercises: [] } };
  const a = addExerciseToSession(start, 'Leg Extension', { sets: 3 });
  assert.equal(a.added, true);
  assert.deepEqual(a.routine.exercises, ['Leg Extension']);
  assert.equal(a.workoutData['Leg Extension'].length, 3);
  const done = { ...a.workoutData, 'Leg Extension': [{ weight: '40', reps: '12', done: true }] };
  const b = addExerciseToSession({ workoutData: done, routine: a.routine }, 'leg extension');
  assert.equal(b.added, false);
  assert.equal(b.name, 'Leg Extension');
  assert.equal(b.routine.exercises.length, 1);
  assert.equal(b.workoutData['Leg Extension'][0].done, true);
});

test('addExerciseToSession : nom vide ignoré, routine absente → séance libre, dernier log pré-rempli', () => {
  assert.equal(addExerciseToSession({ workoutData: {} }, '  ').added, false);
  const r = addExerciseToSession({ workoutData: {} }, 'Hack Squat', { lastLog: { weight: '80', reps: '10' } });
  assert.equal(r.routine.name, 'Séance libre');
  assert.equal(r.workoutData['Hack Squat'][0].weight, '80');
});

test('addExerciseToSession répare une routine incohérente sans toucher aux séries', () => {
  const r = addExerciseToSession({ workoutData: { Curl: [{ weight: '10', reps: '8', done: true }] }, routine: { name: 'X', exercises: [] } }, 'Curl');
  assert.deepEqual(r.routine.exercises, ['Curl']);
  assert.equal(r.workoutData.Curl[0].done, true);
});

test('reprise de séance : upsertHistoryEntry remplace la même séance (pas de doublon)', () => {
  const data = { Squat: [{ weight: '100', reps: '5', done: true }] };
  const now = Date.parse('2026-06-10T18:00:00.000Z');
  const e1 = buildHistoryEntry({ sessionId: 's1', routineName: 'Legs', workoutData: data, startTime: now - 3600_000, endTime: now, now });
  assert.equal(e1.durationSeconds, 3600);
  assert.equal(e1.totalVolume, 500);
  let h = upsertHistoryEntry([{ id: 'old', date: '2026-06-01T10:00:00.000Z' }], e1);
  assert.equal(h.length, 2);
  const more = { Squat: [...data.Squat, { weight: '100', reps: '5', done: true }] };
  const e2 = buildHistoryEntry({ sessionId: 's1', routineName: 'Legs', workoutData: more, startTime: now - 3600_000, endTime: now + 600_000, now: now + 900_000 });
  h = upsertHistoryEntry(h, e2);
  assert.equal(h.length, 2);
  assert.equal(h[0].totalVolume, 1000);
  assert.equal(h[0].date, e1.date); // date d'origine conservée
  assert.equal(upsertHistoryEntry(h, e2).length, 2); // double tap « Enregistrer »
});

test('restRemaining basé timestamp (arrière-plan) et arrondi supérieur', () => {
  const t0 = 1_000_000;
  assert.equal(restRemaining(t0, 90, t0), 90);
  assert.equal(restRemaining(t0, 90, t0 + 500), 90);
  assert.equal(restRemaining(t0, 90, t0 + 60_000), 30); // 60 s « en arrière-plan »
  assert.equal(restRemaining(t0, 90, t0 + 120_000), 0);
  assert.equal(restRemaining(null, 90, t0), 0);
});

test('resolveRestState : alarme seulement si fin récente', () => {
  const t0 = 1_000_000;
  const st = { isRestTimerRunning: true, restStartTime: t0, restInitialDuration: 60 };
  assert.deepEqual(resolveRestState(st, t0 + 30_000), { running: true, remaining: 30, alarm: false });
  assert.deepEqual(resolveRestState(st, t0 + 65_000), { running: false, remaining: 0, alarm: true });
  assert.deepEqual(resolveRestState(st, t0 + 10 * 60_000), { running: false, remaining: 0, alarm: false });
  assert.deepEqual(resolveRestState({ isRestTimerRunning: false }, t0), { running: false, remaining: 0, alarm: false });
});

test('canResume : fenêtre 2 h et sessionId obligatoire', () => {
  const now = 10 * 3600_000;
  const last = { finishedAt: now - 3600_000, activeRoutine: { name: 'A' }, sessionId: 's1' };
  assert.equal(canResume(last, now), true);
  assert.equal(canResume({ ...last, finishedAt: now - 3 * 3600_000 }, now), false);
  assert.equal(canResume({ ...last, sessionId: undefined }, now), false);
  assert.equal(canResume(null, now), false);
});

test('normalizeActiveSession rejette les états inexploitables', () => {
  assert.equal(normalizeActiveSession(null), null);
  assert.equal(normalizeActiveSession({ view: 'dashboard', activeRoutine: { exercises: [] } }), null);
  assert.equal(normalizeActiveSession({ view: 'workout', activeRoutine: { name: 'A' } }), null);
  const ok = normalizeActiveSession({ view: 'workout', activeRoutine: { name: 'A', exercises: [] }, workoutData: [] });
  assert.deepEqual(ok.workoutData, {});
  assert.ok(ok.sessionId);
});

test('durationSeconds / newId', () => {
  assert.equal(durationSeconds(1000, 61_000), 60);
  assert.equal(durationSeconds(5000, 1000), 0);
  assert.notEqual(newId('s', 1, () => 0.1), newId('s', 1, () => 0.2));
});
