// src/utils/chart.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartCoords, seriesDomain } from './chart.core.js';

const OPTS = { width: 320, height: 120, pad: 8 };

test('chartCoords maps x proportionally to real time, not index', () => {
  // 3 points : j0, j1, j10 → x du 2e point à 10% de la largeur utile
  const pts = [
    { x: '2026-06-01', y: 0 },
    { x: '2026-06-02', y: 5 },
    { x: '2026-06-11', y: 10 },
  ];
  const { coords } = chartCoords(pts, OPTS);
  assert.equal(coords[0].x, 8);                       // pad
  assert.equal(coords[2].x, 312);                     // width - pad
  assert.ok(Math.abs(coords[1].x - (8 + 304 * 0.1)) < 0.01);
});

test('chartCoords maps y: max at top pad, min at bottom pad', () => {
  const pts = [{ x: '2026-06-01', y: 80 }, { x: '2026-06-02', y: 90 }];
  const { coords, min, max } = chartCoords(pts, OPTS);
  assert.equal(min, 80);
  assert.equal(max, 90);
  assert.equal(coords[0].y, 112); // height - pad (min en bas)
  assert.equal(coords[1].y, 8);   // pad (max en haut)
});

test('chartCoords centers flat series vertically', () => {
  const pts = [{ x: '2026-06-01', y: 80 }, { x: '2026-06-05', y: 80 }];
  const { coords } = chartCoords(pts, OPTS);
  assert.equal(coords[0].y, 60);
  assert.equal(coords[1].y, 60);
});

test('chartCoords sorts by date, drops invalid points, honors explicit yMin/yMax', () => {
  const pts = [{ x: '2026-06-05', y: 90 }, { x: 'bad', y: 1 }, { x: '2026-06-01', y: '?' }, { x: '2026-06-02', y: 80 }];
  const { coords } = chartCoords(pts, { ...OPTS, yMin: 0, yMax: 100 });
  assert.equal(coords.length, 2);
  assert.ok(coords[0].x < coords[1].x); // 06-02 avant 06-05
  assert.ok(Math.abs(coords[1].y - (112 - 104 * 0.9)) < 0.01); // y=90 sur domaine 0–100
});

test('chartCoords returns empty for <2 valid points', () => {
  assert.deepEqual(chartCoords([{ x: '2026-06-01', y: 5 }], OPTS).coords, []);
  assert.deepEqual(chartCoords([], OPTS).coords, []);
});

test('seriesDomain returns global min/max across series', () => {
  const d = seriesDomain([
    { points: [{ x: '2026-06-01', y: 80 }, { x: '2026-06-02', y: 85 }] },
    { points: [{ x: '2026-06-01', y: 10 }, { x: '2026-06-02', y: 95 }] },
  ]);
  assert.deepEqual(d, { min: 10, max: 95 });
});
