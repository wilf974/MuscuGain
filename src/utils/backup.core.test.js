// src/utils/backup.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, validateBackup, mergeBackup } from './backup.core.js';

test('buildBackup wraps history and routines with metadata', () => {
  const out = buildBackup({ history: [{ date: '2026-01-01T00:00:00.000Z' }], customRoutines: [{ name: 'A' }] });
  assert.equal(out.app, 'MuscuGain');
  assert.equal(out.version, 1);
  assert.ok(typeof out.exportedAt === 'string');
  assert.deepEqual(out.history, [{ date: '2026-01-01T00:00:00.000Z' }]);
  assert.deepEqual(out.customRoutines, [{ name: 'A' }]);
});

test('validateBackup accepts a valid object', () => {
  const valid = { app: 'MuscuGain', version: 1, history: [], customRoutines: [] };
  assert.doesNotThrow(() => validateBackup(valid));
});

test('validateBackup rejects wrong app or shape', () => {
  assert.throws(() => validateBackup({ app: 'Other', version: 1, history: [], customRoutines: [] }));
  assert.throws(() => validateBackup({ app: 'MuscuGain', history: [], customRoutines: [] }));
  assert.throws(() => validateBackup({ app: 'MuscuGain', version: 1, history: {}, customRoutines: [] }));
  assert.throws(() => validateBackup(null));
});
