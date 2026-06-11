import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysSince, shouldRemind } from './reminder.js';

const NOW = Date.parse('2026-06-11T12:00:00.000Z');
test('daysSince computes whole days', () => {
  assert.equal(daysSince('2026-06-08T12:00:00.000Z', NOW), 3);
  assert.equal(daysSince('2026-06-11T00:00:00.000Z', NOW), 0);
});
test('shouldRemind true when inactive >= threshold and not reminded today', () => {
  assert.equal(shouldRemind({ lastDateISO: '2026-06-07T12:00:00.000Z', enabled: true, lastRemindedDate: '2026-06-10', today: '2026-06-11', now: NOW }), true);
});
test('shouldRemind false when disabled / recent / already reminded', () => {
  assert.equal(shouldRemind({ lastDateISO: '2026-06-07T12:00:00.000Z', enabled: false, lastRemindedDate: null, today: '2026-06-11', now: NOW }), false);
  assert.equal(shouldRemind({ lastDateISO: '2026-06-10T12:00:00.000Z', enabled: true, lastRemindedDate: null, today: '2026-06-11', now: NOW }), false);
  assert.equal(shouldRemind({ lastDateISO: '2026-06-01T12:00:00.000Z', enabled: true, lastRemindedDate: '2026-06-11', today: '2026-06-11', now: NOW }), false);
});
