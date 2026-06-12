// src/utils/measurements.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeasurementInput, upsertMeasurement, toPoints } from './measurements.core.js';

test('parseMeasurementInput accepts weight only', () => {
  const r = parseMeasurementInput({ date: '2026-06-12', weight: '82.5' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.entry, { date: '2026-06-12', weight: 82.5 });
});

test('parseMeasurementInput accepts comma decimals and optional cm fields', () => {
  const r = parseMeasurementInput({ date: '2026-06-12', weight: '82,5', arms: '38', waist: '90,5', thighs: '' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.entry, { date: '2026-06-12', weight: 82.5, arms: 38, waist: 90.5 });
});

test('parseMeasurementInput rejects missing or out-of-range weight', () => {
  assert.equal(parseMeasurementInput({ date: '2026-06-12', weight: '' }).ok, false);
  assert.equal(parseMeasurementInput({ date: '2026-06-12', weight: 'abc' }).ok, false);
  assert.equal(parseMeasurementInput({ date: '2026-06-12', weight: '10' }).ok, false);   // < 20
  assert.equal(parseMeasurementInput({ date: '2026-06-12', weight: '500' }).ok, false);  // > 400
});

test('parseMeasurementInput rejects out-of-range cm fields', () => {
  assert.equal(parseMeasurementInput({ date: '2026-06-12', weight: '80', arms: '5' }).ok, false);   // < 10
  assert.equal(parseMeasurementInput({ date: '2026-06-12', weight: '80', waist: '400' }).ok, false); // > 300
});

test('parseMeasurementInput rejects missing date', () => {
  assert.equal(parseMeasurementInput({ weight: '80' }).ok, false);
});

test('upsertMeasurement inserts sorted ascending by date', () => {
  const list = [{ date: '2026-06-01', weight: 80 }, { date: '2026-06-10', weight: 81 }];
  const out = upsertMeasurement(list, { date: '2026-06-05', weight: 80.5 });
  assert.deepEqual(out.map((m) => m.date), ['2026-06-01', '2026-06-05', '2026-06-10']);
  assert.equal(list.length, 2); // immutable
});

test('upsertMeasurement overwrites same-day entry', () => {
  const list = [{ date: '2026-06-10', weight: 81 }];
  const out = upsertMeasurement(list, { date: '2026-06-10', weight: 82, arms: 38 });
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { date: '2026-06-10', weight: 82, arms: 38 });
});

test('toPoints projects a field, skipping entries without it', () => {
  const list = [
    { date: '2026-06-01', weight: 80 },
    { date: '2026-06-05', weight: 81, arms: 38 },
  ];
  assert.deepEqual(toPoints(list, 'weight'), [
    { x: '2026-06-01', y: 80 },
    { x: '2026-06-05', y: 81 },
  ]);
  assert.deepEqual(toPoints(list, 'arms'), [{ x: '2026-06-05', y: 38 }]);
  assert.deepEqual(toPoints([], 'weight'), []);
});
