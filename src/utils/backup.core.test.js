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

test('mergeBackup adds only sessions with unseen date', () => {
  const current = { history: [{ date: 'd1' }], customRoutines: [] };
  const imported = { history: [{ date: 'd1' }, { date: 'd2' }], customRoutines: [] };
  const r = mergeBackup(current, imported);
  assert.equal(r.history.length, 2);
  assert.equal(r.stats.addedSessions, 1);
});

test('mergeBackup sorts history by date desc', () => {
  const current = { history: [{ date: '2026-01-02T00:00:00.000Z' }], customRoutines: [] };
  const imported = { history: [{ date: '2026-01-03T00:00:00.000Z' }, { date: '2026-01-01T00:00:00.000Z' }], customRoutines: [] };
  const r = mergeBackup(current, imported);
  assert.deepEqual(r.history.map((h) => h.date), ['2026-01-03T00:00:00.000Z', '2026-01-02T00:00:00.000Z', '2026-01-01T00:00:00.000Z']);
});

test('mergeBackup overwrites routines by name, adds new ones', () => {
  const current = { history: [], customRoutines: [{ name: 'A', desc: 'old' }, { name: 'B' }] };
  const imported = { history: [], customRoutines: [{ name: 'A', desc: 'new' }, { name: 'C' }] };
  const r = mergeBackup(current, imported);
  const byName = Object.fromEntries(r.customRoutines.map((x) => [x.name, x]));
  assert.equal(byName.A.desc, 'new');
  assert.ok(byName.B);
  assert.ok(byName.C);
  assert.equal(r.stats.overwrittenRoutines, 1);
  assert.equal(r.stats.addedRoutines, 1);
});
