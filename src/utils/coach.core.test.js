import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHistorySummary, normalizeCoachAnalysis, normalizeGeneratedProgram, suggestLoad } from './coach.core.js';

const cat = (n) => (n === 'Squat' ? 'legs' : n === 'Bench' ? 'chest' : 'other');
const H = [
  { date: '2026-02-01T10:00:00.000Z', exercises: { Squat: [{ weight: '100', reps: '5', done: true }], Bench: [{ weight: '60', reps: '8', done: true }] } },
  { date: '2026-02-08T10:00:00.000Z', exercises: { Squat: [{ weight: '110', reps: '5', done: true }] } },
];

test('buildHistorySummary aggregates per exercise with trend', () => {
  const s = buildHistorySummary(H, cat);
  assert.equal(s.totalSessions, 2);
  const sq = s.perExercise.find((e) => e.name === 'Squat');
  assert.equal(sq.maxWeight, 110);
  assert.equal(sq.sessions, 2);
  assert.equal(sq.trend, 'up');
  assert.ok(s.muscleVolume.legs > 0);
});

test('buildHistorySummary empty-safe', () => {
  const s = buildHistorySummary([], cat);
  assert.equal(s.totalSessions, 0);
  assert.deepEqual(s.perExercise, []);
});

test('normalizeCoachAnalysis null-safe + caps arrays', () => {
  const r = normalizeCoachAnalysis(null);
  assert.equal(r.overview, '');
  assert.deepEqual(r.progression, []);
  const big = normalizeCoachAnalysis({ plateaus: ['a','b','c','d','e','f','g'] });
  assert.equal(big.plateaus.length, 6);
});

test('normalizeGeneratedProgram keeps only valid names', () => {
  const r = normalizeGeneratedProgram({ name: 'Test', exercises: [{ name: 'Squat', targetSets: 5, targetReps: 5 }, { name: 'Inconnu', targetSets: 3 }] }, ['Squat', 'Bench']);
  assert.equal(r.name, 'Test');
  assert.equal(r.exercises.length, 1);
  assert.equal(r.exercises[0].name, 'Squat');
  assert.equal(r.exercises[0].targetSets, 5);
});

test('suggestLoad bumps when reps target met', () => {
  assert.deepEqual(suggestLoad({ weight: '100', reps: '5' }, 5), { weight: 102.5, bump: true });
  assert.deepEqual(suggestLoad({ weight: '100', reps: '3' }, 5), { weight: 100, bump: false });
  assert.equal(suggestLoad(null, 5), null);
});
