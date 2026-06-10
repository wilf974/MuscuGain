// src/utils/records.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePRs, detectNewPRs } from './records.core.js';

const H = [
  { exercises: { Squat: [{ weight: '100', reps: '5', done: true }, { weight: '110', reps: '3', done: true }] } },
  { exercises: { Squat: [{ weight: '120', reps: '1', done: false }], Curl: [{ weight: '20', reps: '10', done: true }] } },
];

test('computePRs returns max done weight per exercise', () => {
  const prs = computePRs(H);
  assert.equal(prs.Squat, 110); // 120 ignored (done:false)
  assert.equal(prs.Curl, 20);
});

test('computePRs ignores non-done and non-numeric weights', () => {
  const prs = computePRs([{ exercises: { Bench: [{ weight: '', reps: '5', done: true }, { weight: '80', reps: '5', done: false }] } }]);
  assert.equal(prs.Bench, undefined);
});

test('detectNewPRs flags exercise beating previous max', () => {
  const newEntry = { exercises: { Squat: [{ weight: '115', reps: '2', done: true }] } };
  const prs = detectNewPRs(H, newEntry);
  assert.deepEqual(prs, [{ exercise: 'Squat', weight: 115 }]);
});

test('detectNewPRs flags brand-new exercise', () => {
  const newEntry = { exercises: { Deadlift: [{ weight: '140', reps: '3', done: true }] } };
  const prs = detectNewPRs(H, newEntry);
  assert.deepEqual(prs, [{ exercise: 'Deadlift', weight: 140 }]);
});

test('detectNewPRs returns empty when no improvement', () => {
  const newEntry = { exercises: { Squat: [{ weight: '105', reps: '5', done: true }] } };
  assert.deepEqual(detectNewPRs(H, newEntry), []);
});
