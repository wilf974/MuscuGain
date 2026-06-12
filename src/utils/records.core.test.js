// src/utils/records.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePRs, detectNewPRs, epley1RM, compute1RMs, detectRepPRs } from './records.core.js';

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

// --- P4 : 1RM Epley + PR force ---
test('epley1RM applies formula rounded to 0.5kg, reps=1 returns weight', () => {
  assert.equal(epley1RM(100, 1), 100);
  assert.equal(epley1RM(100, 5), 116.5); // 100*(1+5/30)=116.66 → 116.5
  assert.equal(epley1RM('80', '10'), 106.5); // 80*(4/3)=106.66 → 106.5
  assert.equal(epley1RM(0, 5), null);
  assert.equal(epley1RM(100, 0), null);
  assert.equal(epley1RM('', '5'), null);
});

test('compute1RMs returns best estimated 1RM per exercise (done sets only)', () => {
  const h = [
    { exercises: { Squat: [{ weight: '100', reps: '5', done: true }, { weight: '110', reps: '1', done: true }] } },
    { exercises: { Squat: [{ weight: '120', reps: '5', done: false }] } },
  ];
  // 100×5 → 116.5 > 110×1 → 110 ; 120 ignoré (done:false)
  assert.deepEqual(compute1RMs(h), { Squat: 116.5 });
});

test('detectRepPRs flags more reps at previous max weight', () => {
  const before = [{ exercises: { Squat: [{ weight: '100', reps: '5', done: true }] } }];
  const entry = { exercises: { Squat: [{ weight: '100', reps: '7', done: true }] } };
  assert.deepEqual(detectRepPRs(before, entry), [{ exercise: 'Squat', weight: 100, reps: 7, prevReps: 5 }]);
});

test('detectRepPRs ignores weight PRs, new exercises, equal reps and non-done sets', () => {
  const before = [{ exercises: { Squat: [{ weight: '100', reps: '5', done: true }] } }];
  // poids > max précédent → PR poids (géré par detectNewPRs), pas PR force
  assert.deepEqual(detectRepPRs(before, { exercises: { Squat: [{ weight: '105', reps: '6', done: true }] } }), []);
  // nouvel exo → pas de référence
  assert.deepEqual(detectRepPRs(before, { exercises: { Curl: [{ weight: '20', reps: '10', done: true }] } }), []);
  // reps égales → pas un PR
  assert.deepEqual(detectRepPRs(before, { exercises: { Squat: [{ weight: '100', reps: '5', done: true }] } }), []);
  // série non validée
  assert.deepEqual(detectRepPRs(before, { exercises: { Squat: [{ weight: '100', reps: '8', done: false }] } }), []);
});
