// src/utils/stats.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortNewestFirst, weekSummary, nextRoutine, prCountBySession } from './stats.core.js';

const at = (y, m, d, h = 18) => new Date(y, m, d, h).toISOString();
const NOW = new Date(2026, 5, 11, 12); // jeudi 11 juin 2026, semaine du lundi 8

test('sortNewestFirst trie par date décroissante, dates invalides en dernier', () => {
  const h = [{ id: 'a', date: at(2026, 5, 1) }, { id: 'bad', date: 'x' }, { id: 'b', date: at(2026, 5, 9) }];
  assert.deepEqual(sortNewestFirst(h).map((s) => s.id), ['b', 'a', 'bad']);
  assert.deepEqual(sortNewestFirst(null), []);
});

test('weekSummary : semaine en cours vs précédente + tendance + série', () => {
  const h = [
    { date: at(2026, 5, 10), totalVolume: 3000 }, // mer. cette semaine
    { date: at(2026, 5, 8, 7), totalVolume: 1000 }, // lun. cette semaine
    { date: at(2026, 5, 3), totalVolume: 2000 }, // mer. semaine dernière
    { date: at(2026, 4, 27), totalVolume: 500 }, // il y a 2 semaines
  ];
  const s = weekSummary(h, NOW);
  assert.deepEqual(s.thisWeek, { sessions: 2, volume: 4000 });
  assert.deepEqual(s.lastWeek, { sessions: 1, volume: 2000 });
  assert.equal(s.volumeTrendPct, 100);
  assert.equal(s.daysSinceLast, 1);
  assert.equal(s.weekStreak, 3);
  assert.equal(s.lastSession.totalVolume, 3000);
});

test('weekSummary : historique vide / série non cassée un lundi matin', () => {
  const empty = weekSummary([], NOW);
  assert.equal(empty.daysSinceLast, null);
  assert.equal(empty.volumeTrendPct, null);
  assert.equal(empty.weekStreak, 0);
  const monday = new Date(2026, 5, 15, 8);
  const s = weekSummary([{ date: at(2026, 5, 10), totalVolume: 100 }], monday);
  assert.equal(s.thisWeek.sessions, 0);
  assert.equal(s.weekStreak, 1);
});

test('nextRoutine : jamais faite en priorité, sinon la plus ancienne', () => {
  const routines = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
  const h = [{ routineName: 'A', date: at(2026, 5, 10) }, { routineName: 'B', date: at(2026, 5, 5) }];
  assert.equal(nextRoutine(routines, h).routine.name, 'C');
  const h2 = [...h, { routineName: 'C', date: at(2026, 5, 7) }];
  const r = nextRoutine(routines, h2);
  assert.equal(r.routine.name, 'B');
  assert.equal(r.lastDone, at(2026, 5, 5));
  assert.equal(nextRoutine([], h), null);
});

test('prCountBySession rejoue chronologiquement (1ère occurrence ≠ PR)', () => {
  const h = [
    { id: 's3', date: at(2026, 5, 10), exercises: { Squat: [{ weight: '120', reps: '3', done: true }], Curl: [{ weight: '20', reps: '8', done: true }] } },
    { id: 's2', date: at(2026, 5, 5), exercises: { Squat: [{ weight: '110', reps: '3', done: true }, { weight: '130', reps: '1', done: false }] } },
    { id: 's1', date: at(2026, 5, 1), exercises: { Squat: [{ weight: '100', reps: '5', done: true }] } },
  ];
  assert.deepEqual(prCountBySession(h), { s1: 0, s2: 1, s3: 1 });
});
