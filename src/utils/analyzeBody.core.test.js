// src/utils/analyzeBody.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBodyAnalysis } from './analyzeBody.core.js';

test('normalizeBodyAnalysis fills missing fields with safe defaults', () => {
  const r = normalizeBodyAnalysis({});
  assert.equal(r.morphotype, '');
  assert.equal(r.balance, '');
  assert.equal(r.bodyFatRange, '');
  assert.deepEqual(r.strengths, []);
  assert.deepEqual(r.weaknesses, []);
  assert.deepEqual(r.trainingAdvice, []);
  assert.equal(r.evolutionNote, '');
});

test('normalizeBodyAnalysis coerces and trims strings, cleans arrays', () => {
  const r = normalizeBodyAnalysis({
    morphotype: '  mésomorphe ',
    balance: 42,
    bodyFatRange: '15-18%',
    strengths: ['dos', '', '  épaules ', 7],
    weaknesses: 'pas un tableau',
    trainingAdvice: ['squat'],
    evolutionNote: '  mieux ',
  });
  assert.equal(r.morphotype, 'mésomorphe');
  assert.equal(r.balance, ''); // non-string coerced to ''
  assert.equal(r.bodyFatRange, '15-18%');
  assert.deepEqual(r.strengths, ['dos', 'épaules']);
  assert.deepEqual(r.weaknesses, []);
  assert.deepEqual(r.trainingAdvice, ['squat']);
  assert.equal(r.evolutionNote, 'mieux');
});

test('normalizeBodyAnalysis caps arrays at 6 and never throws on null', () => {
  const r = normalizeBodyAnalysis(null);
  assert.deepEqual(r.strengths, []);
  const big = normalizeBodyAnalysis({ trainingAdvice: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] });
  assert.equal(big.trainingAdvice.length, 6);
});
