# 4 Features MuscuGain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter 4 features à l'app local-first MuscuGain : export/import JSON (backup), historique détaillé (accordéon), graphique de volume (SVG), records personnels (PR).

**Architecture:** Logique pure isolée dans `src/utils/*.core.js` (testée `node --test`), IO et UI dans des wrappers/composants React minces. Persistance localStorage inchangée (clés `muscuGainHistory`, `muscuGainCustomRoutines`). Aucune modif backend.

**Tech Stack:** Vite 7, React 19, Tailwind 3, lucide-react, `node --test` (test runner natif).

---

## File Structure

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `src/utils/backup.core.js` | Créer | Logique pure build/validate/merge backup |
| `src/utils/backup.core.test.js` | Créer | Tests node:test |
| `src/utils/backup.js` | Créer | IO : download Blob, lecture File |
| `src/components/modals/ImportBackupModal.jsx` | Créer | UI import (aperçu + fusion) |
| `src/utils/records.core.js` | Créer | Logique pure PR (computePRs, detectNewPRs) |
| `src/utils/records.core.test.js` | Créer | Tests node:test |
| `src/components/ui/VolumeChart.jsx` | Créer | Graphique SVG volume/séance |
| `src/views/History.jsx` | Modifier | Accordéon détail + graphique + badge PR |
| `src/views/Cooldown.jsx` | Modifier | Bannière PR à la fin de séance |
| `src/views/Dashboard.jsx` | Modifier | Bouton « Exporter » |
| `src/App.jsx` | Modifier | wiring exportData/importData, modale backup, history→Cooldown |

**Modèle de données (rappel) :**
- History entry : `{ date:ISO, routineName, exercises:{ [nom]:[{weight,reps,done}] }, totalVolume, durationSeconds }`
- Routine : `{ id, name, desc, exercises:[...], isCustom }`

**Convention test :** fichiers `*.core.test.js`, lancés via `node --test src/utils/`. Les `.core.js` n'importent rien de React ni du navigateur (pur JS, ESM).

---

## F1 — Export / Import JSON

### Task 1: backup.core — buildBackup + validateBackup

**Files:**
- Create: `src/utils/backup.core.js`
- Test: `src/utils/backup.core.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/backup.core.test.js`
Expected: FAIL — `Cannot find module './backup.core.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/backup.core.js
export function buildBackup({ history, customRoutines }) {
  return {
    app: 'MuscuGain',
    version: 1,
    exportedAt: new Date().toISOString(),
    history: history || [],
    customRoutines: customRoutines || [],
  };
}

export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Fichier invalide.');
  if (obj.app !== 'MuscuGain') throw new Error("Ce fichier n'est pas une sauvegarde MuscuGain.");
  if (typeof obj.version !== 'number') throw new Error('Version de sauvegarde manquante.');
  if (!Array.isArray(obj.history)) throw new Error('Historique invalide dans la sauvegarde.');
  if (!Array.isArray(obj.customRoutines)) throw new Error('Programmes invalides dans la sauvegarde.');
  return true;
}
```

- [ ] **Step 4: Run test to verify build + validate pass**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/backup.core.test.js`
Expected: 2 tests PASS (buildBackup, validateBackup ×2), mergeBackup test FAIL (not implemented yet — `mergeBackup is not a function`). Acceptable: proceed to Task 2.

- [ ] **Step 5: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/utils/backup.core.js src/utils/backup.core.test.js && git commit -m "feat(muscugain): backup.core buildBackup + validateBackup (TDD)"
```

---

### Task 2: backup.core — mergeBackup

**Files:**
- Modify: `src/utils/backup.core.js`
- Test: `src/utils/backup.core.test.js`

- [ ] **Step 1: Add failing tests for merge**

Append to `src/utils/backup.core.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify fail**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/backup.core.test.js`
Expected: FAIL — `mergeBackup is not a function`

- [ ] **Step 3: Implement mergeBackup**

Append to `src/utils/backup.core.js`:

```js
export function mergeBackup(current, imported) {
  const curHistory = current.history || [];
  const curRoutines = current.customRoutines || [];
  const seenDates = new Set(curHistory.map((h) => h.date));
  let addedSessions = 0;
  const mergedHistory = [...curHistory];
  for (const s of imported.history || []) {
    if (!seenDates.has(s.date)) {
      mergedHistory.push(s);
      seenDates.add(s.date);
      addedSessions += 1;
    }
  }
  mergedHistory.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const routines = [...curRoutines];
  let overwrittenRoutines = 0;
  let addedRoutines = 0;
  for (const r of imported.customRoutines || []) {
    const idx = routines.findIndex((x) => x.name === r.name);
    if (idx >= 0) {
      routines[idx] = r;
      overwrittenRoutines += 1;
    } else {
      routines.push(r);
      addedRoutines += 1;
    }
  }
  return {
    history: mergedHistory,
    customRoutines: routines,
    stats: { addedSessions, overwrittenRoutines, addedRoutines },
  };
}
```

- [ ] **Step 4: Run all backup.core tests**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/backup.core.test.js`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/utils/backup.core.js src/utils/backup.core.test.js && git commit -m "feat(muscugain): backup.core mergeBackup fusion non destructive (TDD)"
```

---

### Task 3: backup.js — IO download + read file

**Files:**
- Create: `src/utils/backup.js`

(No unit test — DOM/Blob IO, vérifié au build + manuellement.)

- [ ] **Step 1: Write backup.js**

```js
// src/utils/backup.js
import { buildBackup, validateBackup } from './backup.core.js';

export function downloadBackup({ history, customRoutines }) {
  const backup = buildBackup({ history, customRoutines });
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `muscugain-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        validateBackup(obj);
        resolve(obj);
      } catch (e) {
        reject(new Error(e.message || 'Fichier illisible.'));
      }
    };
    reader.onerror = () => reject(new Error('Lecture du fichier échouée.'));
    reader.readAsText(file);
  });
}
```

- [ ] **Step 2: Verify build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK (no import error).

- [ ] **Step 3: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/utils/backup.js && git commit -m "feat(muscugain): backup.js IO download/read fichier JSON"
```

---

### Task 4: ImportBackupModal — UI aperçu + fusion

**Files:**
- Create: `src/components/modals/ImportBackupModal.jsx`

Pattern de référence : `ImportRoutineModal.jsx` (même app). Props : `isOpen`, `onClose`, `current` (`{history, customRoutines}`), `onConfirm(mergedResult)`.

- [ ] **Step 1: Write the modal**

```jsx
// src/components/modals/ImportBackupModal.jsx
import { useState } from 'react';
import { X, Upload, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { readBackupFile, } from '../../utils/backup.js';
import { mergeBackup } from '../../utils/backup.core.js';

export default function ImportBackupModal({ isOpen, onClose, current, onConfirm }) {
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // { merged, stats }

  if (!isOpen) return null;

  const reset = () => { setError(''); setPreview(null); };
  const close = () => { reset(); onClose(); };

  const handleFile = async (e) => {
    setError('');
    setPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await readBackupFile(file);
      const merged = mergeBackup(current, imported);
      setPreview({ merged, stats: merged.stats });
    } catch (err) {
      setError(err.message);
    }
    e.target.value = '';
  };

  const confirm = () => {
    if (!preview) return;
    onConfirm(preview.merged);
    close();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 fade-in" onClick={close}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6 border border-slate-700" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Importer une sauvegarde</h3>
          <button onClick={close} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <label className="block bg-slate-900 border border-dashed border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
          <Upload size={28} className="mx-auto mb-2 text-blue-400" />
          <span className="text-sm text-slate-300">Choisir un fichier .json</span>
          <input type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
        </label>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {preview && (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-slate-300 bg-slate-900 rounded-lg p-3 space-y-1">
              <div>Séances ajoutées : <span className="font-bold text-green-400">{preview.stats.addedSessions}</span></div>
              <div>Programmes ajoutés : <span className="font-bold text-green-400">{preview.stats.addedRoutines}</span></div>
              <div>Programmes écrasés : <span className="font-bold text-amber-400">{preview.stats.overwrittenRoutines}</span></div>
            </div>
            <Button fullWidth onClick={confirm} className="bg-green-600 hover:bg-green-500">Fusionner</Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/components/modals/ImportBackupModal.jsx && git commit -m "feat(muscugain): ImportBackupModal aperçu + fusion"
```

---

### Task 5: Wire backup in App + Dashboard export button

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/views/Dashboard.jsx`

- [ ] **Step 1: Import modal + IO in App.jsx**

In `src/App.jsx`, add near the other modal imports (top of file, where `ImportRoutineModal` is imported):

```jsx
import ImportBackupModal from './components/modals/ImportBackupModal';
import { downloadBackup } from './utils/backup';
```

- [ ] **Step 2: Add state + handlers in App.jsx**

Near the other `useState` for modals (where `importModalOpen` is declared), add:

```jsx
const [backupModalOpen, setBackupModalOpen] = useState(false);
```

Near `importRoutines` add:

```jsx
const exportData = () => {
  downloadBackup({ history, customRoutines });
};

const importData = (merged) => {
  setHistory(merged.history);
  localStorage.setItem('muscuGainHistory', JSON.stringify(merged.history));
  setCustomRoutines(merged.customRoutines);
  localStorage.setItem('muscuGainCustomRoutines', JSON.stringify(merged.customRoutines));
};
```

- [ ] **Step 3: Render ImportBackupModal + pass props to Dashboard**

After the `ImportRoutineModal` JSX block in App.jsx, add:

```jsx
{/* Import backup modal */}
<ImportBackupModal
  isOpen={backupModalOpen}
  onClose={() => setBackupModalOpen(false)}
  current={{ history, customRoutines }}
  onConfirm={importData}
/>
```

In the `<Dashboard ... />` props, add:

```jsx
onExportClick={exportData}
onBackupImportClick={() => setBackupModalOpen(true)}
```

- [ ] **Step 4: Add buttons in Dashboard.jsx**

In `src/views/Dashboard.jsx`, add `onExportClick` and `onBackupImportClick` to the destructured props (after `onImportClick`). Add `Download, Save` to the lucide import on line 2 (`import { Dumbbell, Activity, Plus, Play, User, Trash2, Upload, Download, Save } from 'lucide-react';`).

Insert a new "Données" section just before the `{/* Programmes */}` comment block:

```jsx
{/* Sauvegarde données */}
<div className="flex items-center gap-2 mt-6">
  <button onClick={onExportClick} className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-slate-600">
    <Download size={14} /> Exporter
  </button>
  <button onClick={onBackupImportClick} className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-slate-600">
    <Save size={14} /> Importer données
  </button>
</div>
```

- [ ] **Step 5: Verify build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 6: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/App.jsx src/views/Dashboard.jsx && git commit -m "feat(muscugain): export/import backup JSON câblé (Dashboard + App)"
```

---

## F2 — Historique détaillé (accordéon)

### Task 6: History accordion detail

**Files:**
- Modify: `src/views/History.jsx`

- [ ] **Step 1: Rewrite History.jsx with expandable detail**

Replace the full content of `src/views/History.jsx`:

```jsx
import { useState } from 'react';
import { CalendarX, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import Card from '../components/ui/Card';
import { formatDuration } from '../utils/format';

export default function History({ history, requestDeleteHistory }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-6 pb-24 fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Historique</h1>
      </header>
      {history.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <CalendarX size={48} className="mx-auto mb-4 opacity-50" />
          <p>Aucune séance enregistrée.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((session, idx) => {
            const isOpen = expanded === idx;
            return (
              <Card key={idx}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{session.routineName}</h3>
                      <button type="button" onClick={() => requestDeleteHistory(idx)} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="bg-slate-700 px-2 py-1 rounded text-xs font-mono text-blue-300 inline-block mb-1">
                      {Math.round(session.totalVolume)} kg
                    </div>
                    {session.durationSeconds > 0 && (
                      <div className="text-xs text-slate-500">⏱ {formatDuration(session.durationSeconds)}</div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : idx)}
                  className="w-full text-sm text-slate-400 border-t border-slate-700/50 pt-2 mt-2 flex items-center justify-between hover:text-slate-200 transition-colors"
                >
                  <span>{Object.keys(session.exercises).length} exercices complétés</span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isOpen && (
                  <div className="mt-3 space-y-3 fade-in">
                    {Object.entries(session.exercises).map(([exName, sets]) => (
                      <div key={exName} className="bg-slate-900/60 rounded-lg p-3">
                        <div className="text-sm font-semibold text-white mb-2">{exName}</div>
                        <div className="space-y-1">
                          {sets.map((set, i) => {
                            const empty = !set.weight;
                            return (
                              <div key={i} className={`flex items-center justify-between text-xs ${empty ? 'text-slate-600' : 'text-slate-300'}`}>
                                <span>Série {i + 1}</span>
                                <span className="font-mono">{set.weight || '–'} kg × {set.reps || '–'}</span>
                                {set.done ? <Check size={14} className="text-green-400" /> : <span className="w-3.5" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/views/History.jsx && git commit -m "feat(muscugain): historique détaillé accordéon (poids/reps par série)"
```

---

## F4 — Records personnels (PR)

(F4 avant F3 : le graphique est indépendant et passe en dernier.)

### Task 7: records.core — computePRs + detectNewPRs

**Files:**
- Create: `src/utils/records.core.js`
- Test: `src/utils/records.core.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/utils/records.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePRs, detectNewPRs } from './records.core.js';

const H = [
  { exercises: { Squat: [{ weight: '100', reps: '5', done: true }, { weight: '110', reps: '3', done: true }] } },
  { exercises: { Squat: [{ weight: '120', reps: '1', done: false }], Curl: [{ weight: '20', reps: '10', done: true }] } },
];

test('computePRs returns max done weight per exercise', () => {
  const prs = computePRs(H);
  assert.equal(prs.Squat, 110); // 120 ignored (done:false)
  assert.equal(prs.Curl, 20);
});

test('computePRs ignores non-done and non-numeric weights', () => {
  const prs = computePRs([{ exercises: { Bench: [{ weight: '', reps: '5', done: true }, { weight: '80', reps: '5', done: false }] } }]);
  assert.equal(prs.Bench, undefined);
});

test('detectNewPRs flags exercise beating previous max', () => {
  const newEntry = { exercises: { Squat: [{ weight: '115', reps: '2', done: true }] } };
  const prs = detectNewPRs(H, newEntry);
  assert.deepEqual(prs, [{ exercise: 'Squat', weight: 115 }]);
});

test('detectNewPRs flags brand-new exercise', () => {
  const newEntry = { exercises: { Deadlift: [{ weight: '140', reps: '3', done: true }] } };
  const prs = detectNewPRs(H, newEntry);
  assert.deepEqual(prs, [{ exercise: 'Deadlift', weight: 140 }]);
});

test('detectNewPRs returns empty when no improvement', () => {
  const newEntry = { exercises: { Squat: [{ weight: '105', reps: '5', done: true }] } };
  assert.deepEqual(detectNewPRs(H, newEntry), []);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/records.core.test.js`
Expected: FAIL — `Cannot find module './records.core.js'`

- [ ] **Step 3: Implement records.core.js**

```js
// src/utils/records.core.js
// PR = poids max sur une série validée (done) par exercice.

function bestDoneWeight(sets) {
  let best = null;
  for (const s of sets) {
    if (!s.done) continue;
    const w = Number(s.weight);
    if (!Number.isFinite(w) || w <= 0) continue;
    if (best === null || w > best) best = w;
  }
  return best;
}

export function computePRs(history) {
  const prs = {};
  for (const session of history || []) {
    for (const [exName, sets] of Object.entries(session.exercises || {})) {
      const w = bestDoneWeight(sets);
      if (w === null) continue;
      if (prs[exName] === undefined || w > prs[exName]) prs[exName] = w;
    }
  }
  return prs;
}

export function detectNewPRs(historyBefore, newEntry) {
  const prev = computePRs(historyBefore);
  const out = [];
  for (const [exName, sets] of Object.entries(newEntry.exercises || {})) {
    const w = bestDoneWeight(sets);
    if (w === null) continue;
    if (prev[exName] === undefined || w > prev[exName]) {
      out.push({ exercise: exName, weight: w });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/records.core.test.js`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/utils/records.core.js src/utils/records.core.test.js && git commit -m "feat(muscugain): records.core computePRs + detectNewPRs (TDD)"
```

---

### Task 8: PR banner in Cooldown

**Files:**
- Modify: `src/views/Cooldown.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Pass history to Cooldown in App.jsx**

In `src/App.jsx`, the `<Cooldown ... />` block, add prop `history={history}`:

```jsx
{view === 'cooldown' && (
  <Cooldown
    cancelSession={cancelSession}
    phaseTimer={phaseTimer}
    sessionDuration={sessionDuration}
    workoutData={workoutData}
    saveAndExit={saveAndExit}
    history={history}
  />
)}
```

- [ ] **Step 2: Render PR banner in Cooldown.jsx**

Replace the full content of `src/views/Cooldown.jsx`:

```jsx
import { Wind, X, Trophy } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatTime, formatDuration, calculateVolume } from '../utils/format';
import { detectNewPRs } from '../utils/records.core';

export default function Cooldown({ cancelSession, phaseTimer, sessionDuration, workoutData, saveAndExit, history }) {
  const newPRs = detectNewPRs(history || [], { exercises: workoutData });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in pb-24 relative">
      <button onClick={cancelSession} className="absolute top-6 left-6 text-slate-400 hover:text-white z-20"><X size={24} /></button>
      <div className="bg-blue-400/10 p-6 rounded-full mb-6">
        <Wind size={64} className="text-blue-400" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Récupération</h2>
      <div className="text-6xl font-mono font-bold text-blue-300 mb-8 tabular-nums">{formatTime(phaseTimer)}</div>

      {newPRs.length > 0 && (
        <div className="w-full max-w-sm mb-6 bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-left fade-in">
          <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
            <Trophy size={18} /> Nouveau{newPRs.length > 1 ? 'x' : ''} record{newPRs.length > 1 ? 's' : ''} !
          </div>
          <ul className="space-y-1">
            {newPRs.map((pr) => (
              <li key={pr.exercise} className="text-sm text-amber-200 flex justify-between">
                <span>{pr.exercise}</span>
                <span className="font-mono font-bold">{pr.weight} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
        <div className="bg-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-500 uppercase font-bold mb-1">Durée</div>
          <div className="text-xl font-bold text-white">{formatDuration(sessionDuration)}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-500 uppercase font-bold mb-1">Volume</div>
          <div className="text-xl font-bold text-green-400">{Math.round(calculateVolume(workoutData))} kg</div>
        </div>
      </div>
      <Button fullWidth onClick={saveAndExit} className="bg-green-600 hover:bg-green-500 shadow-green-900/50 max-w-sm">
        Enregistrer et Quitter
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/App.jsx src/views/Cooldown.jsx && git commit -m "feat(muscugain): bannière records PR à la fin de séance (Cooldown)"
```

---

### Task 9: PR badge in History detail

**Files:**
- Modify: `src/views/History.jsx`

- [ ] **Step 1: Compute PRs and badge best set**

In `src/views/History.jsx`, update imports (add `Trophy`, import `computePRs`):

```jsx
import { CalendarX, Trash2, ChevronDown, ChevronUp, Check, Trophy } from 'lucide-react';
import { computePRs } from '../utils/records.core';
```

Inside the component, after `const [expanded, setExpanded] = useState(null);` add:

```jsx
const prs = computePRs(history);
```

In the set rendering loop (inside the expanded detail, the `sets.map`), replace the existing returned row with one that flags PR sets. The row currently is:

```jsx
const empty = !set.weight;
return (
  <div key={i} className={`flex items-center justify-between text-xs ${empty ? 'text-slate-600' : 'text-slate-300'}`}>
    <span>Série {i + 1}</span>
    <span className="font-mono">{set.weight || '–'} kg × {set.reps || '–'}</span>
    {set.done ? <Check size={14} className="text-green-400" /> : <span className="w-3.5" />}
  </div>
);
```

Replace with:

```jsx
const empty = !set.weight;
const isPR = set.done && Number(set.weight) > 0 && Number(set.weight) === prs[exName];
return (
  <div key={i} className={`flex items-center justify-between text-xs ${empty ? 'text-slate-600' : 'text-slate-300'}`}>
    <span className="flex items-center gap-1">Série {i + 1}{isPR && <Trophy size={12} className="text-amber-400" />}</span>
    <span className="font-mono">{set.weight || '–'} kg × {set.reps || '–'}</span>
    {set.done ? <Check size={14} className="text-green-400" /> : <span className="w-3.5" />}
  </div>
);
```

Note: `prs[exName]` is the all-time max for that exercise; the set matching it shows the trophy. If multiple sets equal the max, each gets the badge (acceptable).

- [ ] **Step 2: Verify build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/views/History.jsx && git commit -m "feat(muscugain): badge PR sur les séries record dans l'historique détaillé"
```

---

## F3 — Graphique de volume (SVG)

### Task 10: VolumeChart component

**Files:**
- Create: `src/components/ui/VolumeChart.jsx`

- [ ] **Step 1: Write VolumeChart.jsx**

```jsx
// src/components/ui/VolumeChart.jsx
// Graphique SVG maison : volume total par séance (30 dernières), ordre chronologique.
export default function VolumeChart({ history }) {
  const sessions = (history || []).slice(0, 30).slice().reverse(); // ancien -> récent
  if (sessions.length < 2) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 text-center text-sm text-slate-500">
        Pas assez de données pour le graphique.
      </div>
    );
  }

  const vols = sessions.map((s) => Math.max(0, Math.round(s.totalVolume || 0)));
  const max = Math.max(...vols, 1);
  const W = 320;
  const H = 120;
  const pad = 8;
  const n = vols.length;
  const gap = 3;
  const barW = (W - pad * 2 - gap * (n - 1)) / n;

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-white">Volume par séance</h3>
        <span className="text-xs text-slate-500 font-mono">max {max} kg</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Graphique du volume par séance">
        {vols.map((v, i) => {
          const h = (v / max) * (H - pad * 2);
          const x = pad + i * (barW + gap);
          const y = H - pad - h;
          return <rect key={i} x={x} y={y} width={barW} height={h} rx="2" className="fill-blue-500" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>{fmtDate(sessions[0].date)}</span>
        <span>{fmtDate(sessions[n - 1].date)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render chart at top of History.jsx**

In `src/views/History.jsx`, add import:

```jsx
import VolumeChart from '../components/ui/VolumeChart';
```

Insert the chart right after the `<header>` block, before the `history.length === 0` ternary, but only when there is history. Place this just inside the root `<div>`, after `</header>`:

```jsx
{history.length > 0 && <VolumeChart history={history} />}
```

- [ ] **Step 3: Verify build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/components/ui/VolumeChart.jsx src/views/History.jsx && git commit -m "feat(muscugain): graphique SVG volume par séance dans l'historique"
```

---

## Task 11: Full test run + deploy

**Files:** none (verification + deploy)

- [ ] **Step 1: Run all core tests**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/`
Expected: ALL PASS (backup.core + records.core).

- [ ] **Step 2: Final build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK, no warnings about missing imports.

- [ ] **Step 3: Deploy Docker**

Run: `cd /opt/apps/MuscuGain && docker compose up -d --build`
Expected: `muscugain-app` recreated, `muscugain-backend` unchanged.

- [ ] **Step 4: Verify containers healthy**

Run: `docker ps --filter name=muscugain --format '{{.Names}}\t{{.Status}}'`
Expected: both `Up ... (healthy)` (laisser ~30s pour le healthcheck).

- [ ] **Step 5: Verify bundle served**

Run: `curl -sI http://127.0.0.1:8080/ | head -1`
Expected: `HTTP/1.1 200 OK`

- [ ] **Step 6: Update docs (HISTORIQUE.MD + CLAUDE.md projet)**

Add an entry to `HISTORIQUE.MD` (date 2026-06-10, 4 features, fichiers créés/modifiés, vérifs). Condense the new features into project `CLAUDE.md` (section structure : nouveaux utils backup/records, VolumeChart, accordéon History, bannière PR Cooldown, boutons export/import données). Commit:

```bash
cd /opt/apps/MuscuGain && git add HISTORIQUE.MD CLAUDE.md && git commit -m "docs(muscugain): histo + CLAUDE.md — 4 features (backup, histo détaillé, graphique, PR)"
```

---

## Self-Review

**Spec coverage:**
- F1 export/import → Tasks 1–5 ✓
- F2 histo détaillé accordéon → Task 6 ✓
- F3 graphique SVG → Task 10 ✓
- F4 records PR (détection + Cooldown + histo badge) → Tasks 7–9 ✓
- Tests TDD core → Tasks 1,2,7 ✓
- Deploy + docs → Task 11 ✓

**Type consistency:**
- `mergeBackup` retourne `{history, customRoutines, stats:{addedSessions, overwrittenRoutines, addedRoutines}}` — utilisé tel quel dans ImportBackupModal (Task 4) et importData (Task 5). ✓
- `detectNewPRs` retourne `[{exercise, weight}]` — Cooldown (Task 8) lit `pr.exercise`/`pr.weight`. ✓
- `computePRs` retourne `{[exName]: number}` — History (Task 9) compare `Number(set.weight) === prs[exName]`. ✓
- `downloadBackup({history, customRoutines})` / `readBackupFile(file)` — signatures cohérentes App↔modal. ✓

**Placeholder scan:** aucun TBD/TODO ; tout le code est fourni. ✓
