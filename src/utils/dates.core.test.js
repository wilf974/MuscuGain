// src/utils/dates.core.test.js
// Les dates sont construites en heure LOCALE (new Date(y, m, d, h)) : tests valables quel que soit le fuseau.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDateKey, startOfLocalWeek, localWeekKey, calendarDaysBetween, relativeDayLabel, isValidDate } from './dates.core.js';

test('localDateKey utilise le jour local, pas le jour UTC', () => {
  // 00:30 local le 12 juin : toISOString() donnerait le 11 dans tout fuseau UTC+.
  assert.equal(localDateKey(new Date(2026, 5, 12, 0, 30)), '2026-06-12');
  assert.equal(localDateKey(new Date(2026, 5, 12, 23, 59)), '2026-06-12');
  assert.equal(localDateKey('2026-06-12'), '2026-06-12');
  assert.equal(localDateKey('nope'), null);
});

test('startOfLocalWeek / localWeekKey : lundi local, dimanche rattaché à la semaine précédente', () => {
  assert.equal(localWeekKey(new Date(2026, 5, 10, 18)), '2026-06-08'); // mercredi
  assert.equal(localWeekKey(new Date(2026, 5, 8, 0, 5)), '2026-06-08'); // lundi 00:05
  assert.equal(localWeekKey(new Date(2026, 5, 14, 23, 50)), '2026-06-08'); // dimanche soir
  assert.equal(startOfLocalWeek(new Date(2026, 5, 10)).getHours(), 0);
  assert.equal(localWeekKey('bad'), null);
});

test('calendarDaysBetween compte des jours calendaires locaux', () => {
  assert.equal(calendarDaysBetween(new Date(2026, 5, 11, 23, 0), new Date(2026, 5, 12, 1, 0)), 1);
  assert.equal(calendarDaysBetween(new Date(2026, 5, 12, 1, 0), new Date(2026, 5, 12, 23, 0)), 0);
  // Traverse le passage à l'heure d'hiver (fin octobre) sans erreur d'arrondi.
  assert.equal(calendarDaysBetween(new Date(2026, 9, 20, 12), new Date(2026, 10, 2, 12)), 13);
  assert.equal(calendarDaysBetween('x', new Date()), null);
});

test('relativeDayLabel', () => {
  const now = new Date(2026, 5, 12, 10);
  assert.equal(relativeDayLabel(new Date(2026, 5, 12, 8), now), "aujourd'hui");
  assert.equal(relativeDayLabel(new Date(2026, 5, 11, 23), now), 'hier');
  assert.equal(relativeDayLabel(new Date(2026, 5, 9, 12), now), 'il y a 3 jours');
  assert.equal(relativeDayLabel(new Date(2026, 4, 20, 12), now), 'il y a 3 semaines');
  assert.equal(isValidDate('2026-06-12T10:00:00.000Z'), true);
  assert.equal(isValidDate(undefined), false);
});
