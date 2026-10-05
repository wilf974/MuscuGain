// src/utils/scanner.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyRecognition, buildCatalogIndex, exerciseInfo, isValidYoutubeId, videoIdFor,
  confidenceLabel, filterCatalog, HIGH_CONFIDENCE,
} from './scanner.core.js';
import { recognizeErrorKind, RECOGNIZE_MESSAGES } from './recognizeMachine.core.js';
import { addExerciseToSession } from './session.core.js';
import { VIDEO_MAPPING } from '../data/videos.js';

const idx = buildCatalogIndex([{ name: 'Machine Pec Fly Technogym', category: 'chest' }]);

test('confiance haute : n°1 connu + confiance ≥ seuil → fiche directe (nom canonique)', () => {
  const r = classifyRecognition({ label: 'LEG EXT', candidates: [{ exercise: 'leg extension', confidence: 0.92 }, { exercise: 'Leg Curl Assis', confidence: 0.9 }] }, idx);
  assert.equal(r.level, 'high');
  assert.equal(r.primary.exercise, 'Leg Extension');
  assert.equal(r.primary.known, true);
  assert.equal(r.primary.muscleGroupLabel, 'Jambes');
  assert.equal(r.label, 'LEG EXT');
});

test('confiance faible ou hors catalogue → choix à confirmer, jamais de fiche directe', () => {
  const low = classifyRecognition({ candidates: [{ exercise: 'Leg Extension', confidence: 0.4 }, { exercise: 'Hack Squat', confidence: 0.3 }] }, idx);
  assert.equal(low.level, 'low');
  assert.equal(low.choices.length, 2);
  const unknown = classifyRecognition({ candidates: [{ exercise: 'Belt Squat Machine', confidence: 0.99, muscleGroup: 'legs' }] }, idx);
  assert.equal(unknown.level, 'low');
  assert.equal(unknown.primary.known, false);
  assert.equal(unknown.primary.category, 'legs');
  const noConf = classifyRecognition({ candidates: [{ exercise: 'Leg Extension', confidence: null }] }, idx);
  assert.equal(noConf.level, 'low');
});

test('aucun candidat → none ; doublons de casse fusionnés ; max 3 ; confiance bornée', () => {
  assert.equal(classifyRecognition(null, idx).level, 'none');
  assert.equal(classifyRecognition({ candidates: [{ exercise: '  ' }] }, idx).level, 'none');
  const r = classifyRecognition({ candidates: [
    { exercise: 'Face Pull', confidence: 7 }, { exercise: 'face pull', confidence: 0.5 },
    { exercise: 'A' }, { exercise: 'B' }, { exercise: 'C' },
  ] }, idx);
  assert.equal(r.choices.length, 3);
  assert.equal(r.choices[0].confidence, 1);
  assert.deepEqual(r.choices.map((c) => c.exercise), ['Face Pull', 'A', 'B']);
});

test('exercices perso reconnus comme connus', () => {
  const r = classifyRecognition({ candidates: [{ exercise: 'machine pec fly technogym', confidence: HIGH_CONFIDENCE }] }, idx);
  assert.equal(r.level, 'high');
  assert.equal(r.primary.exercise, 'Machine Pec Fly Technogym');
});

test('vidéo : uniquement des IDs existants et bien formés (pas de faux lien)', () => {
  assert.equal(isValidYoutubeId('4Y2ZdHCOXok'), true);
  assert.equal(isValidYoutubeId('V8dZqmIxbXXs'), false); // 12 car. : ID du mapping invalide
  assert.equal(isValidYoutubeId(undefined), false);
  assert.equal(videoIdFor('Développé Couché Barre'), VIDEO_MAPPING['Développé Couché Barre']);
  assert.equal(videoIdFor('Face Pull'), null);
  assert.equal(videoIdFor('Exercice inconnu'), null);
  // Tous les IDs renvoyés proviennent du mapping existant.
  for (const name of Object.keys(VIDEO_MAPPING)) {
    const id = videoIdFor(name);
    assert.ok(id === null || id === VIDEO_MAPPING[name]);
  }
});

test('exerciseInfo : muscles + sécurité, vidéo absente → videoId null', () => {
  const known = exerciseInfo('presse à cuisses inclinée', idx);
  assert.equal(known.exercise, 'Presse à Cuisses Inclinée');
  assert.equal(known.muscleLabel, 'Jambes');
  assert.ok(known.videoId);
  assert.ok(known.safetyTips.length >= 3);
  assert.match(known.safetyTips[0], /genoux/i);
  const unknown = exerciseInfo('Belt Squat', idx, { fallbackCategory: 'legs' });
  assert.equal(unknown.known, false);
  assert.equal(unknown.videoId, null);
  assert.equal(unknown.muscleLabel, 'Jambes');
  assert.equal(exerciseInfo('Truc', idx).muscleLabel, 'Groupe musculaire non précisé');
});

test('confidenceLabel : pas de pourcentage pour les rangs 2/3', () => {
  assert.equal(confidenceLabel({ confidence: 0.9 }, 0), 'Confiance élevée');
  assert.equal(confidenceLabel({ confidence: 0.6 }, 0), 'Confiance moyenne');
  assert.equal(confidenceLabel({ confidence: 0.2 }, 0), 'Confiance faible');
  assert.equal(confidenceLabel({ confidence: 0.9 }, 1), 'Autre possibilité');
  assert.equal(confidenceLabel({ confidence: null }, 0), 'Confiance inconnue');
});

test('fallback catalogue manuel : recherche insensible aux accents', () => {
  const catalog = [{ category: 'legs', label: 'Jambes', exercises: ['Presse à Cuisses Inclinée', 'Leg Extension'] }, { category: 'chest', label: 'Pectoraux', exercises: ['Écartés Couché Haltères'] }];
  assert.deepEqual(filterCatalog(catalog, 'ecartes').map((g) => g.category), ['chest']);
  assert.equal(filterCatalog(catalog, 'PRESSE')[0].exercises.length, 1);
  assert.equal(filterCatalog(catalog, '').length, 2);
  assert.deepEqual(filterCatalog(catalog, 'zzz'), []);
});

test('erreurs scanner : offline / timeout / annulation / 429 / 413 / 5xx', () => {
  assert.equal(recognizeErrorKind({ online: false, networkError: true }), 'offline');
  assert.equal(recognizeErrorKind({ timedOut: true, aborted: true }), 'timeout');
  assert.equal(recognizeErrorKind({ aborted: true, networkError: true }), 'cancelled');
  assert.equal(recognizeErrorKind({ networkError: true }), 'unavailable');
  assert.equal(recognizeErrorKind({ status: 429 }), 'ratelimit');
  assert.equal(recognizeErrorKind({ status: 504 }), 'timeout');
  assert.equal(recognizeErrorKind({ status: 413 }), 'invalid');
  assert.equal(recognizeErrorKind({ status: 502 }), 'unavailable');
  assert.equal(recognizeErrorKind({ status: 200 }), null);
  for (const k of ['offline', 'timeout', 'cancelled', 'ratelimit', 'invalid', 'unavailable', 'empty', 'image']) {
    assert.ok(RECOGNIZE_MESSAGES[k]);
  }
});

test('ajout à la séance après confirmation : séance active ou séance libre, sans doublon', () => {
  const r = classifyRecognition({ candidates: [{ exercise: 'Leg Extension', confidence: 0.95 }] }, idx);
  const active = { workoutData: { Squat: [{ weight: '100', reps: '5', done: true }] }, routine: { name: 'Legs', exercises: ['Squat'] } };
  const a = addExerciseToSession(active, r.primary.exercise);
  assert.deepEqual(a.routine.exercises, ['Squat', 'Leg Extension']);
  assert.equal(a.workoutData.Squat[0].done, true);
  assert.equal(addExerciseToSession({ workoutData: a.workoutData, routine: a.routine }, 'Leg Extension').added, false);
  const free = addExerciseToSession({ workoutData: {}, routine: null }, r.primary.exercise);
  assert.equal(free.routine.name, 'Séance libre');
  assert.deepEqual(free.routine.exercises, ['Leg Extension']);
});
