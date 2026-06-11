import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryFromGroup, dedupeAdd } from './customExercises.js';

test('categoryFromGroup maps FR/EN groups to category keys', () => {
  assert.equal(categoryFromGroup('triceps'), 'arms');
  assert.equal(categoryFromGroup('Pectoraux'), 'chest');
  assert.equal(categoryFromGroup('legs'), 'legs');
  assert.equal(categoryFromGroup('inconnu'), 'other');
  assert.equal(categoryFromGroup(''), 'other');
});

test('dedupeAdd adds new, ignores case-insensitive duplicate', () => {
  const a = dedupeAdd([], 'Dips Machine', 'arms');
  assert.equal(a.length, 1);
  const b = dedupeAdd(a, 'dips machine', 'arms');
  assert.equal(b.length, 1); // no dup
  const c = dedupeAdd(a, 'Pec Deck', 'chest');
  assert.equal(c.length, 2);
});
