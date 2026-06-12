// src/utils/timeline.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeklyVolumePoints } from './timeline.core.js';

test('weeklyVolumePoints groups sessions by ISO week (Monday) and sums volume', () => {
  const h = [
    { date: '2026-06-10T18:00:00.000Z', totalVolume: 1000 }, // mercredi → semaine du 08/06
    { date: '2026-06-08T18:00:00.000Z', totalVolume: 500 },  // lundi   → semaine du 08/06
    { date: '2026-06-03T18:00:00.000Z', totalVolume: 800 },  // mercredi → semaine du 01/06
  ];
  assert.deepEqual(weeklyVolumePoints(h), [
    { x: '2026-06-01', y: 800 },
    { x: '2026-06-08', y: 1500 },
  ]);
});

test('weeklyVolumePoints handles sunday rollover and empty/invalid input', () => {
  const h = [{ date: '2026-06-07T10:00:00.000Z', totalVolume: 300 }]; // dimanche → semaine du 01/06
  assert.deepEqual(weeklyVolumePoints(h), [{ x: '2026-06-01', y: 300 }]);
  assert.deepEqual(weeklyVolumePoints([]), []);
  assert.deepEqual(weeklyVolumePoints([{ date: 'bad', totalVolume: 100 }]), []);
});
