# Reco machine : OCR + exercices hors-liste — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps `- [ ]`.

**Goal:** Améliorer la reconnaissance de machine : (1) image plus nette pour l'OCR de la plaque, (2) prompt OCR-first, (3) l'IA peut proposer un exercice **hors-liste** (avec son groupe musculaire) ; le choisir l'**ajoute à un catalogue perso** persistant qui enrichit la liste manuelle et les futures reco.

**Architecture:** Backend prompt revu (OCR 2 étapes + hors-liste + `muscleGroup`). Image client 768→1280px/0.85. Catalogue perso `localStorage.muscuGainCustomExercises` ([{name,category}]) fusionné dans le picker (AddExerciseModal + CreateRoutine) et dans `allowedExercises`.

**Tech:** Fastify, React 19, `node --test`. Gate `npm run build`.

---

## File Structure
| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `backend/server.js` | Modifier | Prompt `/recognize-exercise` : OCR-first, hors-liste, `muscleGroup` par candidat |
| `src/data/customExercises.js` | Créer | catalogue perso : load/add, `categoryFromGroup`, `mergedCatalog`, `allKnownNames` |
| `src/data/customExercises.core.test.js` | Créer | tests purs (`categoryFromGroup`, `dedupeAdd`) |
| `src/utils/recognizeMachine.js` | Modifier | image 1280/0.85 ; normalise `muscleGroup` |
| `src/utils/recognizeMachine.core.js` | Modifier | `normalizeResult` garde `muscleGroup` par candidat |
| `src/components/modals/AddExerciseModal.jsx` | Modifier | liste fusionnée + badge « nouveau » + persistance au choix |
| `src/views/CreateRoutine.jsx` | Modifier | picker fusionné (exos perso sélectionnables) |

Catégories valides : `chest, back, legs, shoulders, arms, abs` + `other` (label « Autres »).

---

### Task 1: Backend — prompt OCR-first + hors-liste + muscleGroup

**Files:** Modify `backend/server.js` (handler `/recognize-exercise` only — replace the `prompt` block and the candidates normalization; keep fetch/error logic).

- [ ] **Step 1: Replace the prompt** (the `const prompt = ...` block):
```js
  const prompt =
    "Tu es un coach de musculation expert. Analyse la photo d'une machine ou d'un équipement de salle de sport. " +
    "ÉTAPE 1 (OCR) — Lis et transcris TOUT texte visible : plaque, autocollant, nom d'exercice, schéma. " +
    "ÉTAPE 2 — Identifie l'exercice. Si un nom d'exercice est lisible sur la machine, l'exercice correspondant DOIT être le candidat n°1 (ne te laisse pas tromper par la forme). " +
    "Tu disposes d'une liste d'exercices connus" + (list ? '' : ' (vide)') + ". " +
    "Si l'exercice correspond à un nom de la liste, utilise le nom EXACT de la liste. " +
    "Si l'exercice N'EST PAS dans la liste, propose quand même son nom réel et correct (ne force pas un mauvais mapping). " +
    "Pour CHAQUE candidat, indique le groupe musculaire principal parmi: chest, back, legs, shoulders, arms, abs. " +
    "Donne les 3 exercices les plus probables, du plus au moins probable. " +
    "Réponds UNIQUEMENT en JSON, sans texte autour: " +
    '{"label":"<texte lu sur la machine, ou null>","candidates":[{"exercise":"<nom>","confidence":<0 à 1>,"muscleGroup":"<chest|back|legs|shoulders|arms|abs>","inList":<true si nom exact de la liste, sinon false>}]}.' +
    listText;
```

- [ ] **Step 2: Update candidates normalization** (replace the `let candidates = ...` / `.map(...)` block) to carry `muscleGroup` + `inList`:
```js
  const validGroups = new Set(['chest', 'back', 'legs', 'shoulders', 'arms', 'abs']);
  const allowedSet = list ? new Set(list) : null;
  let candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  candidates = candidates
    .filter((c) => c && c.exercise)
    .map((c) => {
      const exercise = String(c.exercise).trim();
      const g = String(c.muscleGroup || '').toLowerCase().trim();
      return {
        exercise,
        confidence: Number(c.confidence) || null,
        muscleGroup: validGroups.has(g) ? g : null,
        inList: allowedSet ? allowedSet.has(exercise) : false,
      };
    })
    .slice(0, 3);
```
(Also bump `max_tokens` from 256 to 320 for the OCR step.)

- [ ] **Step 3: Syntax** `cd /opt/apps/MuscuGain/backend && node --check server.js`
- [ ] **Step 4: Commit** `cd /opt/apps/MuscuGain && git add backend/server.js && git commit -m "feat(muscugain-backend): reco OCR-first + exercices hors-liste + muscleGroup"`

---

### Task 2: `customExercises.js` data util (+ tests)

**Files:** Create `src/data/customExercises.js`, `src/data/customExercises.core.test.js`.

- [ ] **Step 1: Failing tests** `src/data/customExercises.core.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryFromGroup, dedupeAdd } from './customExercises.js';

test('categoryFromGroup maps FR/EN groups to category keys', () => {
  assert.equal(categoryFromGroup('triceps'), 'arms');
  assert.equal(categoryFromGroup('Pectoraux'), 'chest');
  assert.equal(categoryFromGroup('legs'), 'legs');
  assert.equal(categoryFromGroup('inconnu'), 'other');
  assert.equal(categoryFromGroup(''), 'other');
});

test('dedupeAdd adds new, ignores case-insensitive duplicate', () => {
  const a = dedupeAdd([], 'Dips Machine', 'arms');
  assert.equal(a.length, 1);
  const b = dedupeAdd(a, 'dips machine', 'arms');
  assert.equal(b.length, 1); // no dup
  const c = dedupeAdd(a, 'Pec Deck', 'chest');
  assert.equal(c.length, 2);
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement `src/data/customExercises.js`:**
```js
import { EXERCISES_DB, MUSCLE_LABELS } from './exercises.js';

const KEY = 'muscuGainCustomExercises';
const VALID = ['chest', 'back', 'legs', 'shoulders', 'arms', 'abs'];

const GROUP_TO_CAT = {
  chest: 'chest', pectoraux: 'chest', pecs: 'chest', poitrine: 'chest',
  back: 'back', dos: 'back',
  legs: 'legs', jambes: 'legs', quadriceps: 'legs', quadris: 'legs', ischios: 'legs', fessiers: 'legs', mollets: 'legs',
  shoulders: 'shoulders', epaules: 'shoulders', 'épaules': 'shoulders', deltoides: 'shoulders', 'deltoïdes': 'shoulders',
  arms: 'arms', bras: 'arms', triceps: 'arms', biceps: 'arms', 'avant-bras': 'arms',
  abs: 'abs', abdos: 'abs', abdominaux: 'abs', core: 'abs', gainage: 'abs',
};

export function categoryFromGroup(group) {
  const k = String(group || '').toLowerCase().trim();
  return GROUP_TO_CAT[k] || (VALID.includes(k) ? k : 'other');
}

// Ajout pur, dédup insensible à la casse. Retourne la nouvelle liste.
export function dedupeAdd(list, name, category) {
  const n = String(name || '').trim();
  if (!n) return list;
  if (list.some((e) => e.name.toLowerCase() === n.toLowerCase())) return list;
  return [...list, { name: n, category: VALID.includes(category) ? category : 'other' }];
}

export function loadCustomExercises() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((e) => e && e.name) : [];
  } catch {
    return [];
  }
}

export function addCustomExercise(name, category) {
  const updated = dedupeAdd(loadCustomExercises(), name, category);
  try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch { /* quota */ }
  return updated;
}

// Tous les noms connus (catalogue + perso) — pour allowedExercises + détection "hors-liste".
export function allKnownNames(custom = loadCustomExercises()) {
  return [...Object.values(EXERCISES_DB).flat(), ...custom.map((e) => e.name)];
}

// Catalogue fusionné pour le picker : [{ category, label, exercises:[names] }] ; 'other' en dernier.
export function mergedCatalog(custom = loadCustomExercises()) {
  const out = Object.entries(EXERCISES_DB).map(([category, exercises]) => ({
    category,
    label: MUSCLE_LABELS[category] || category,
    exercises: [...exercises, ...custom.filter((e) => e.category === category).map((e) => e.name)],
  }));
  const others = custom.filter((e) => !VALID.includes(e.category)).map((e) => e.name);
  if (others.length) out.push({ category: 'other', label: 'Autres', exercises: others });
  return out;
}
```

- [ ] **Step 4: Run tests → pass.**
- [ ] **Step 5: Commit** `git add src/data/customExercises.js src/data/customExercises.core.test.js && git commit -m "feat(muscugain): catalogue d'exercices perso (persistant, fusion, mapping groupe)"`

---

### Task 3: recognizeMachine — image nette + muscleGroup

**Files:** Modify `src/utils/recognizeMachine.js`, `src/utils/recognizeMachine.core.js`.

- [ ] **Step 1: `recognizeMachine.js`** — change the resize call for the machine photo (text-critical) to higher resolution/quality. In `recognizeMachine(file, allowedExercises)`, change:
```js
  const image = await fileToDataUrl(file);
```
to
```js
  const image = await fileToDataUrl(file, 1280, 0.85);
```
(Leave the `fileToDataUrl` default signature `768/0.72` unchanged — body analysis keeps it.)

- [ ] **Step 2: `recognizeMachine.core.js`** — in `normalizeResult`, carry `muscleGroup` and `inList` per candidate:
```js
  out.candidates = arr
    .filter((c) => c && c.exercise)
    .map((c) => ({
      exercise: String(c.exercise).trim(),
      confidence: Number.isFinite(Number(c.confidence)) ? Number(c.confidence) : null,
      muscleGroup: typeof c.muscleGroup === 'string' && c.muscleGroup.trim() ? c.muscleGroup.trim() : null,
      inList: c.inList === true,
    }))
    .slice(0, 3);
```
(The existing `recognizeMachine.core.test.js` may assert exact candidate shape — update those assertions if they fail, keeping `exercise`/`confidence` checks and tolerating the new optional fields.)

- [ ] **Step 3: Run** `node --test src/utils/recognizeMachine.core.test.js` → adjust test expectations if needed, all pass.
- [ ] **Step 4: Build** `npm run build`.
- [ ] **Step 5: Commit** `git add src/utils/recognizeMachine.js src/utils/recognizeMachine.core.js src/utils/recognizeMachine.core.test.js && git commit -m "feat(muscugain): photo machine 1280px/0.85 (OCR) + muscleGroup dans le résultat"`

---

### Task 4: AddExerciseModal — liste fusionnée + ajout hors-liste persistant

**Files:** Modify `src/components/modals/AddExerciseModal.jsx`.

**Spec :**
- Importer `loadCustomExercises, addCustomExercise, allKnownNames, mergedCatalog, categoryFromGroup` from `../../data/customExercises`. Garder `EXERCISES_DB`/`MUSCLE_LABELS` au besoin.
- État local `custom` (= `loadCustomExercises()` initialisé en lazy `useState`). Recalculer `catalog = mergedCatalog(custom)` et `known = new Set(allKnownNames(custom))`.
- Reco : `recognizeMachine(file, allKnownNames(custom))` (au lieu de `flattenExercises(EXERCISES_DB)`).
- Résultats : pour chaque candidat, `isNew = !known.has(c.exercise)`. Afficher un badge « + nouveau » (ambre) sur les `isNew`. Le sous-titre groupe musculaire (`MUSCLE_LABELS[categoryFromGroup(c.muscleGroup)]`) peut être affiché en petit.
- `pickCandidate(c)` :
  - si déjà dans la séance → no-op.
  - si `isNew` → `const updated = addCustomExercise(c.exercise, categoryFromGroup(c.muscleGroup)); setCustom(updated);` puis `onSelect(c.exercise)` + reset.
  - sinon → `onSelect(c.exercise)` + reset (comme avant).
  - (adapter la signature : passer l'objet `c` au lieu du seul nom, pour accéder à `muscleGroup`/`isNew`.)
- Liste manuelle : remplacer `Object.entries(EXERCISES_DB).map(...)` par `catalog.map(({category, label, exercises}) => ...)` (même rendu, `label` au lieu de `MUSCLE_LABELS[category]`).

- [ ] **Step 1: Implement** per spec.
- [ ] **Step 2: Build** `npm run build`.
- [ ] **Step 3: Commit** `git add src/components/modals/AddExerciseModal.jsx && git commit -m "feat(muscugain): reco — exercices hors-liste ajoutés au catalogue perso + liste fusionnée"`

---

### Task 5: CreateRoutine — picker fusionné

**Files:** Modify `src/views/CreateRoutine.jsx`.

**Spec :** Remplacer la source du picker `Object.entries(EXERCISES_DB)` par le catalogue fusionné, pour que les exercices perso soient sélectionnables à la création/édition de programme. Importer `mergedCatalog, loadCustomExercises` from `../data/customExercises`. Calculer `const catalog = mergedCatalog(loadCustomExercises());` (en `useState` lazy ou simple const au render — un const suffit, lecture localStorage 1×/render acceptable ; préférer `useState(() => mergedCatalog(loadCustomExercises()))`). Rendre les catégories via `catalog.map(({category,label,exercises}) => ...)` en utilisant `label` au lieu de `MUSCLE_LABELS[category]`. Le reste (sélection par nom) inchangé.

- [ ] **Step 1: Implement** per spec.
- [ ] **Step 2: Build** `npm run build`.
- [ ] **Step 3: Commit** `git add src/views/CreateRoutine.jsx && git commit -m "feat(muscugain): CreateRoutine — exercices perso dans le picker (catalogue fusionné)"`

---

### Task 6: Deploy + e2e + docs

- [ ] **Step 1: tests + build** `node --test src/ && npm run build` → pass (note: tests are under `src/utils/` and `src/data/` ; run `node --test src/utils/ src/data/`).
- [ ] **Step 2: deploy** `docker compose up -d --build` ; wait healthy.
- [ ] **Step 3: e2e** : `curl -s -X POST http://127.0.0.1:8080/api/recognize-exercise -H 'Content-Type: application/json' -d '{"image":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==","allowedExercises":["Dips Machine"]}' -w "\nHTTP %{http_code}\n" | head -c 400` → 200 + JSON `{label, candidates:[{exercise,confidence,muscleGroup,inList}]}` (valeurs peu importe sur 1px, vérifier la forme).
- [ ] **Step 4: docs** `HISTORIQUE.MD` + `CLAUDE.md` (reco OCR-first, hors-liste, catalogue perso `muscuGainCustomExercises`) + commit.

---

## Self-Review
- OCR image nette (1280/0.85) → Task 3 ✓ ; prompt OCR-first → Task 1 ✓ ; hors-liste proposé → Tasks 1,4 ✓ ; ajout au catalogue perso persistant + groupe musculaire → Tasks 2,4 ✓ ; exos perso dans pickers (séance + création) → Tasks 4,5 ✓.
- **Type consistency** : backend candidate `{exercise,confidence,muscleGroup,inList}` == `normalizeResult` output == AddExerciseModal lecture ; `categoryFromGroup(muscleGroup)` ∈ {chest..abs,other} == `mergedCatalog` regroupement == `addCustomExercise` category. `allKnownNames` ↔ allowedExercises ↔ `inList`/`isNew`. ✓
- **Garde-fous** : dédup catalogue insensible à la casse, fallback 'other'/'Autres', allowedExercises = catalogue + perso (l'IA préfère les noms exacts connus, n'invente que si vraiment absent).
