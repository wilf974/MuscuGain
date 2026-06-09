import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenExercises, normalizeResult } from './recognizeMachine.core.js';

test('flattenExercises aplati toutes les catégories', () => {
  assert.deepEqual(flattenExercises({ chest: ['A', 'B'], legs: ['C'] }), ['A', 'B', 'C']);
});

test('flattenExercises tolère un db vide', () => {
  assert.deepEqual(flattenExercises({}), []);
});

test('normalizeResult réponse normale', () => {
  const r = normalizeResult({ label: 'IRON', candidates: [{ exercise: 'Chest Press', confidence: 0.9 }] });
  assert.equal(r.label, 'IRON');
  assert.deepEqual(r.candidates, [{ exercise: 'Chest Press', confidence: 0.9 }]);
});

test('normalizeResult tronque à 3 candidats', () => {
  const r = normalizeResult({ candidates: [1, 2, 3, 4, 5].map((n) => ({ exercise: 'E' + n, confidence: 0.5 })) });
  assert.equal(r.candidates.length, 3);
  assert.equal(r.label, null);
});

test('normalizeResult confidence manquante -> null', () => {
  const r = normalizeResult({ candidates: [{ exercise: 'X' }] });
  assert.equal(r.candidates[0].confidence, null);
});

test('normalizeResult filtre les candidats sans exercise', () => {
  const r = normalizeResult({ candidates: [{ confidence: 0.9 }, { exercise: 'OK', confidence: 0.5 }] });
  assert.deepEqual(r.candidates, [{ exercise: 'OK', confidence: 0.5 }]);
});

test('normalizeResult JSON vide/invalide', () => {
  assert.deepEqual(normalizeResult(null), { label: null, candidates: [] });
  assert.deepEqual(normalizeResult({}), { label: null, candidates: [] });
  assert.deepEqual(normalizeResult({ label: '  ' }), { label: null, candidates: [] });
});
