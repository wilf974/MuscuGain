// src/utils/storage.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEYS, readJSON, writeJSON, normalizeHistory, migrateStorage, SCHEMA_VERSION } from './storage.core.js';

function fakeStore(init = {}, { quota = Infinity } = {}) {
  const m = new Map(Object.entries(init));
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (String(v).length > quota) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
  };
}

const V1_HISTORY = [
  { date: '2026-06-01T18:00:00.000Z', routineName: 'Push', exercises: { Bench: [{ weight: '60', reps: '8', done: true }] }, totalVolume: 480 },
  { date: '2026-06-10T18:00:00.000Z', routineName: 'Legs', exercises: { Squat: [{ weight: '100', reps: '5', done: true }] } },
];

test('readJSON / writeJSON tolèrent JSON invalide et quota', () => {
  const s = fakeStore({ a: '{bad', b: '[1,2]' }, { quota: 10 });
  assert.equal(readJSON(s, 'a', 'fb'), 'fb');
  assert.deepEqual(readJSON(s, 'b', []), [1, 2]);
  assert.equal(readJSON(s, 'b', null, (v) => !Array.isArray(v)), null);
  assert.equal(readJSON(s, 'absent', 0), 0);
  assert.equal(writeJSON(s, 'c', { x: 'trop long pour le quota' }), false);
  assert.equal(writeJSON(s, 'c', 1), true);
});

test('normalizeHistory : ids stables et uniques, volume recalculé, tri récent→ancien, entrées invalides retirées', () => {
  const h = normalizeHistory([...V1_HISTORY, null, 'x', { ...V1_HISTORY[0] }]);
  assert.equal(h.length, 3);
  assert.equal(h[0].routineName, 'Legs');
  assert.equal(h[0].totalVolume, 500);
  assert.equal(new Set(h.map((e) => e.id)).size, 3);
  assert.deepEqual(normalizeHistory(normalizeHistory(h)).map((e) => e.id), h.map((e) => e.id));
});

test('migrateStorage v1→v2 : ids, sauvegarde brute, reprise rattachée, idempotent', () => {
  const finishedAt = Date.parse('2026-06-10T18:00:00.000Z') + 20;
  const s = fakeStore({
    [KEYS.history]: JSON.stringify(V1_HISTORY),
    [KEYS.lastFinished]: JSON.stringify({ finishedAt, activeRoutine: { name: 'Legs', exercises: [] } }),
    [KEYS.activeSession]: JSON.stringify({ view: 'workout', activeRoutine: { name: 'Push', exercises: [] } }),
  });
  const r = migrateStorage(s, { newId: () => 's_test' });
  assert.equal(r.from, 1);
  assert.equal(r.to, SCHEMA_VERSION);
  const h = JSON.parse(s.getItem(KEYS.history));
  assert.ok(h.every((e) => e.id));
  assert.equal(s.getItem(KEYS.historyBackup), JSON.stringify(V1_HISTORY));
  assert.equal(JSON.parse(s.getItem(KEYS.lastFinished)).sessionId, h[0].id);
  assert.equal(JSON.parse(s.getItem(KEYS.activeSession)).sessionId, 's_test');
  const snapshot = new Map(s.m);
  assert.deepEqual(migrateStorage(s).changed, []);
  assert.deepEqual(s.m, snapshot);
});

test('migrateStorage : historique corrompu mis de côté, reprise orpheline retirée', () => {
  const s = fakeStore({
    [KEYS.history]: '{pas du json',
    [KEYS.lastFinished]: JSON.stringify({ finishedAt: 1, activeRoutine: { name: 'X' } }),
  });
  migrateStorage(s);
  assert.equal(s.getItem(KEYS.historyCorrupt), '{pas du json');
  assert.equal(s.getItem(KEYS.history), '[]');
  assert.equal(s.getItem(KEYS.lastFinished), null);
});

test('migrateStorage sur stockage vierge : version posée, rien d\'autre', () => {
  const s = fakeStore();
  migrateStorage(s);
  assert.deepEqual([...s.m.keys()], [KEYS.schema]);
});
