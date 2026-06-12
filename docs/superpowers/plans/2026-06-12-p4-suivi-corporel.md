# P4 Suivi corporel+ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poids/mensurations + courbes, 1RM Epley + PR force, timeline corporelle enrichie, graphique de progression par exercice — tout local-first.

**Architecture:** Logique pure dans `src/utils/*.core.js` testée par `node --test` ; composant SVG générique `LineChart` (nouveau, `VolumeChart` intact) ; état/persistance dans `App.jsx` (pattern `bodyAnalyses`) ; UI dans BodyAnalysis (mesures + timeline) et History (1RM + progression).

**Tech Stack:** Vite 7, React 19, Tailwind 3, lucide-react, node:test. Pas de lib externe.

**Spec:** `docs/superpowers/specs/2026-06-12-p4-suivi-corporel-design.md`

**Gates:** chaque task → `node --test src/utils/` (0 fail) et/ou `npm run build` (succès). Working dir : `/opt/apps/MuscuGain`.

**Conventions UI:** dark slate-900/800, accent blue-500/600, rounded-xl/2xl, `fade-in`, sémantique amber/green/red. Réutiliser `Button`/`Card`.

---

### Task 1: `measurements.core.js` — parse + upsert

**Files:**
- Create: `src/utils/measurements.core.js`
- Test: `src/utils/measurements.core.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/utils/measurements.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeasurementInput, upsertMeasurement } from './measurements.core.js';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/utils/measurements.core.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
// src/utils/measurements.core.js
// Mesures corporelles : { date: 'YYYY-MM-DD', weight: kg, arms?/waist?/thighs?: cm }.
// 1 entrée par jour : upsert écrase l'entrée du même jour.

function num(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const CM_FIELDS = ['arms', 'waist', 'thighs'];

export function parseMeasurementInput(raw) {
  const { date } = raw || {};
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Date invalide.' };
  const weight = num(raw.weight);
  if (weight === null || Number.isNaN(weight)) return { ok: false, error: 'Poids requis (nombre en kg).' };
  if (weight < 20 || weight > 400) return { ok: false, error: 'Poids hors limites (20–400 kg).' };
  const entry = { date, weight };
  for (const f of CM_FIELDS) {
    const v = num(raw[f]);
    if (v === null) continue;
    if (Number.isNaN(v) || v < 10 || v > 300) return { ok: false, error: 'Mensuration hors limites (10–300 cm).' };
    entry[f] = v;
  }
  return { ok: true, entry };
}

export function upsertMeasurement(list, entry) {
  const out = (list || []).filter((m) => m.date !== entry.date);
  out.push(entry);
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}

// Points pour LineChart : [{x: date, y}] sur un champ donné, entrées sans le champ ignorées.
export function toPoints(list, field = 'weight') {
  return (list || [])
    .filter((m) => Number.isFinite(m[field]))
    .map((m) => ({ x: m.date, y: m[field] }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/utils/measurements.core.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/measurements.core.js src/utils/measurements.core.test.js
git commit -m "feat(muscugain): measurements.core — parse/upsert mesures corporelles (1/jour, bornes sanité)"
```

---

### Task 2: `records.core.js` — Epley 1RM + PR force

**Files:**
- Modify: `src/utils/records.core.js` (ajouter exports, ne rien changer à `computePRs`/`detectNewPRs`)
- Test: `src/utils/records.core.test.js` (ajouter tests)

- [ ] **Step 1: Write the failing tests** (à la fin de `records.core.test.js`)

```js
// --- P4 : 1RM Epley + PR force ---
import { epley1RM, compute1RMs, detectRepPRs } from './records.core.js';

test('epley1RM applies formula rounded to 0.5kg, reps=1 returns weight', () => {
  assert.equal(epley1RM(100, 1), 100);
  assert.equal(epley1RM(100, 5), 116.5); // 100*(1+5/30)=116.66 → 116.5
  assert.equal(epley1RM('80', '10'), 106.5); // 80*(4/3)=106.66 → 106.5
  assert.equal(epley1RM(0, 5), null);
  assert.equal(epley1RM(100, 0), null);
  assert.equal(epley1RM('', '5'), null);
});

test('compute1RMs returns best estimated 1RM per exercise (done sets only)', () => {
  const h = [
    { exercises: { Squat: [{ weight: '100', reps: '5', done: true }, { weight: '110', reps: '1', done: true }] } },
    { exercises: { Squat: [{ weight: '120', reps: '5', done: false }] } },
  ];
  // 100×5 → 116.5 > 110×1 → 110 ; 120 ignoré (done:false)
  assert.deepEqual(compute1RMs(h), { Squat: 116.5 });
});

test('detectRepPRs flags more reps at previous max weight', () => {
  const before = [{ exercises: { Squat: [{ weight: '100', reps: '5', done: true }] } }];
  const entry = { exercises: { Squat: [{ weight: '100', reps: '7', done: true }] } };
  assert.deepEqual(detectRepPRs(before, entry), [{ exercise: 'Squat', weight: 100, reps: 7, prevReps: 5 }]);
});

test('detectRepPRs ignores weight PRs, new exercises, equal reps and non-done sets', () => {
  const before = [{ exercises: { Squat: [{ weight: '100', reps: '5', done: true }] } }];
  // poids > max précédent → PR poids (géré par detectNewPRs), pas PR force
  assert.deepEqual(detectRepPRs(before, { exercises: { Squat: [{ weight: '105', reps: '6', done: true }] } }), []);
  // nouvel exo → pas de référence
  assert.deepEqual(detectRepPRs(before, { exercises: { Curl: [{ weight: '20', reps: '10', done: true }] } }), []);
  // reps égales → pas un PR
  assert.deepEqual(detectRepPRs(before, { exercises: { Squat: [{ weight: '100', reps: '5', done: true }] } }), []);
  // série non validée
  assert.deepEqual(detectRepPRs(before, { exercises: { Squat: [{ weight: '100', reps: '8', done: false }] } }), []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/utils/records.core.test.js`
Expected: FAIL (`epley1RM` not exported).

- [ ] **Step 3: Write the implementation** (à la fin de `records.core.js`)

```js
// --- P4 : 1RM estimé (Epley) + PR « force » (plus de reps au poids max) ---

export function epley1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(r) || r <= 0) return null;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 2) / 2;
}

export function compute1RMs(history) {
  const out = {};
  for (const session of history || []) {
    for (const [exName, sets] of Object.entries(session.exercises || {})) {
      for (const s of sets) {
        if (!s.done) continue;
        const rm = epley1RM(s.weight, s.reps);
        if (rm === null) continue;
        if (out[exName] === undefined || rm > out[exName]) out[exName] = rm;
      }
    }
  }
  return out;
}

function bestDoneRepsAtWeight(history, exName, weight) {
  let best = 0;
  for (const session of history || []) {
    const sets = (session.exercises || {})[exName];
    if (!sets) continue;
    for (const s of sets) {
      if (!s.done || Number(s.weight) !== weight) continue;
      const r = Number(s.reps);
      if (Number.isFinite(r) && r > best) best = r;
    }
  }
  return best;
}

// PR force : plus de reps que jamais réalisé AU poids max historique de l'exercice.
// Un poids strictement supérieur = PR poids (detectNewPRs), pas PR force.
export function detectRepPRs(historyBefore, newEntry) {
  const prevMax = computePRs(historyBefore);
  const out = [];
  for (const [exName, sets] of Object.entries(newEntry.exercises || {})) {
    const maxW = prevMax[exName];
    if (maxW === undefined) continue;
    const prevReps = bestDoneRepsAtWeight(historyBefore, exName, maxW);
    let bestNew = null;
    for (const s of sets) {
      if (!s.done || Number(s.weight) !== maxW) continue;
      const r = Number(s.reps);
      if (Number.isFinite(r) && r > prevReps && (bestNew === null || r > bestNew)) bestNew = r;
    }
    if (bestNew !== null) out.push({ exercise: exName, weight: maxW, reps: bestNew, prevReps });
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/utils/records.core.test.js`
Expected: PASS (anciens + 4 nouveaux tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/records.core.js src/utils/records.core.test.js
git commit -m "feat(muscugain): records.core — 1RM Epley (compute1RMs) + détection PR force (detectRepPRs)"
```

---

### Task 3: `chart.core.js` — math des courbes (échelle temps réel)

**Files:**
- Create: `src/utils/chart.core.js`
- Test: `src/utils/chart.core.test.js`

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/utils/chart.core.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
// src/utils/chart.core.js
// Math pur des courbes SVG : axe X = temps réel (dates), axe Y = valeur.
// Renvoie des coordonnées dans le viewBox, pas de DOM ici.

function clean(points) {
  return (points || [])
    .map((p) => ({ t: new Date(p.x).getTime(), y: Number(p.y) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.y))
    .sort((a, b) => a.t - b.t);
}

export function chartCoords(points, { width = 320, height = 120, pad = 8, yMin = null, yMax = null } = {}) {
  const pts = clean(points);
  if (pts.length < 2) return { coords: [], min: null, max: null };
  const t0 = pts[0].t;
  const tSpan = pts[pts.length - 1].t - t0 || 1;
  const lo = yMin !== null ? yMin : Math.min(...pts.map((p) => p.y));
  const hi = yMax !== null ? yMax : Math.max(...pts.map((p) => p.y));
  const flat = hi === lo;
  const ySpan = hi - lo || 1;
  const coords = pts.map((p) => ({
    x: pad + ((p.t - t0) / tSpan) * (width - pad * 2),
    y: flat ? height / 2 : height - pad - ((p.y - lo) / ySpan) * (height - pad * 2),
  }));
  return { coords, min: lo, max: hi };
}

export function seriesDomain(series) {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series || []) {
    for (const p of clean(s.points)) {
      if (p.y < min) min = p.y;
      if (p.y > max) max = p.y;
    }
  }
  if (min === Infinity) return { min: null, max: null };
  return { min, max };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/utils/chart.core.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/chart.core.js src/utils/chart.core.test.js
git commit -m "feat(muscugain): chart.core — coordonnées SVG échelle temps réel + domaine multi-séries"
```

---

### Task 4: `timeline.core.js` — volume hebdomadaire

**Files:**
- Create: `src/utils/timeline.core.js`
- Test: `src/utils/timeline.core.test.js`

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/utils/timeline.core.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
// src/utils/timeline.core.js
// Agrégats temporels pour la timeline corporelle enrichie.

function mondayOf(dateISO) {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDay(); // 0=dim … 6=sam
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

// Somme du volume par semaine ISO → [{x: lundi 'YYYY-MM-DD', y: volume}], trié chrono.
export function weeklyVolumePoints(history) {
  const weeks = {};
  for (const session of history || []) {
    const wk = mondayOf(session.date);
    if (!wk) continue;
    const v = Number(session.totalVolume);
    if (!Number.isFinite(v)) continue;
    weeks[wk] = (weeks[wk] || 0) + v;
  }
  return Object.entries(weeks)
    .map(([x, y]) => ({ x, y: Math.round(y) }))
    .sort((a, b) => (a.x < b.x ? -1 : 1));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/utils/timeline.core.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/timeline.core.js src/utils/timeline.core.test.js
git commit -m "feat(muscugain): timeline.core — volume hebdomadaire (semaine ISO) pour timeline enrichie"
```

---

### Task 5: composant `LineChart.jsx`

**Files:**
- Create: `src/components/ui/LineChart.jsx`

Pas de runner de tests React → gate = `npm run build`. Toute la logique calculatoire est déjà testée dans `chart.core.js`.

- [ ] **Step 1: Write the component**

```jsx
// src/components/ui/LineChart.jsx
// Courbe SVG générique (axe X = temps réel). Multi-séries :
//  - normalizeEach=false : domaine Y commun (mêmes unités)
//  - normalizeEach=true  : chaque série sur son propre domaine (unités différentes, timeline)
// markers : dates (ISO) marquées par une ligne verticale pointillée (ex. analyses IA).
import { chartCoords, seriesDomain } from '../../utils/chart.core';

const COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444']; // blue-500, amber-500, green-500, red-500

export default function LineChart({ title, series, unit = '', height = 120, normalizeEach = false, markers = [] }) {
  const W = 320;
  const pad = 8;
  const opts = { width: W, height, pad };

  const drawn = (series || [])
    .map((s, i) => ({ ...s, color: s.color || COLORS[i % COLORS.length] }))
    .map((s) => {
      const domain = normalizeEach ? {} : seriesDomain(series);
      const { coords, min, max } = chartCoords(s.points, {
        ...opts,
        yMin: normalizeEach ? null : domain.min,
        yMax: normalizeEach ? null : domain.max,
      });
      return { ...s, coords, min, max };
    })
    .filter((s) => s.coords.length >= 2);

  if (drawn.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 text-center text-sm text-slate-500">
        Pas assez de données pour le graphique.
      </div>
    );
  }

  // Bornes temporelles globales pour le pied de graphe + markers.
  const allPts = drawn.flatMap((s) => s.points).map((p) => new Date(p.x).getTime()).filter(Number.isFinite);
  const t0 = Math.min(...allPts);
  const t1 = Math.max(...allPts);
  const tSpan = t1 - t0 || 1;
  const markerXs = (markers || [])
    .map((m) => new Date(m).getTime())
    .filter((t) => Number.isFinite(t) && t >= t0 && t <= t1)
    .map((t) => pad + ((t - t0) / tSpan) * (W - pad * 2));

  const fmtDate = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const single = drawn.length === 1;

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
        {single && (
          <span className="text-xs text-slate-500 font-mono">
            {drawn[0].min}–{drawn[0].max} {unit}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={title || 'Graphique'}>
        {markerXs.map((x, i) => (
          <line key={`m${i}`} x1={x} y1={pad} x2={x} y2={height - pad} stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
        ))}
        {drawn.map((s, si) => (
          <g key={si}>
            <polyline
              points={s.coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.coords.map((c, i) => (
              <circle key={i} cx={c.x} cy={c.y} r="2.5" fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>{fmtDate(t0)}</span>
        <span>{fmtDate(t1)}</span>
      </div>
      {!single && (
        <div className="flex flex-wrap gap-3 mt-2">
          {drawn.map((s, i) => (
            <span key={i} className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: succès (composant pas encore importé, vérifie juste la syntaxe via lint implicite du build — l'import arrive Task 7).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/LineChart.jsx
git commit -m "feat(muscugain): LineChart — courbe SVG générique multi-séries, markers, échelle temps réel"
```

---

### Task 6: App.jsx — état `measurements` + handlers

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Ajouter l'état** (après `const [bodyAnalyses, setBodyAnalyses] = useState([]);`, ligne ~28)

```js
  const [measurements, setMeasurements] = useState([]);
```

- [ ] **Step 2: Restaurer depuis localStorage** (dans le useEffect d'init, après le bloc `savedBody`, ligne ~72)

```js
    const savedMeasurements = localStorage.getItem('muscuGainMeasurements');
    if (savedMeasurements) {
      try {
        setMeasurements(JSON.parse(savedMeasurements));
      } catch {
        localStorage.removeItem('muscuGainMeasurements');
      }
    }
```

- [ ] **Step 3: Handlers** (après `addBodyAnalysis`, ligne ~407). Import en haut du fichier : `import { upsertMeasurement } from './utils/measurements.core';`

```js
  // --- Mesures corporelles ---
  const addMeasurement = (entry) => {
    const updated = upsertMeasurement(measurements, entry);
    setMeasurements(updated);
    localStorage.setItem('muscuGainMeasurements', JSON.stringify(updated));
    showToast('Mesure enregistrée');
  };

  const requestDeleteMeasurement = (date) => {
    setConfirmModal({
      isOpen: true,
      type: 'measurement',
      id: date,
      title: 'Supprimer cette mesure ?',
      message: 'Elle disparaîtra définitivement de vos courbes.',
    });
  };
```

- [ ] **Step 4: Brancher la confirmation** (dans `handleConfirmDelete`, ajouter une branche après le `else if (confirmModal.type === 'history')`, ligne ~341)

```js
    } else if (confirmModal.type === 'measurement') {
      const updated = measurements.filter((m) => m.date !== confirmModal.id);
      setMeasurements(updated);
      localStorage.setItem('muscuGainMeasurements', JSON.stringify(updated));
      showToast('Mesure supprimée');
```

- [ ] **Step 5: Passer les props à BodyAnalysis** (ligne ~558)

```jsx
        <BodyAnalysis
          bodyAnalyses={bodyAnalyses}
          addBodyAnalysis={addBodyAnalysis}
          measurements={measurements}
          addMeasurement={addMeasurement}
          requestDeleteMeasurement={requestDeleteMeasurement}
          history={history}
        />
```

- [ ] **Step 6: Build gate + tests**

Run: `npm run build && node --test src/utils/`
Expected: build OK, 0 fail.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat(muscugain): App — état measurements (localStorage muscuGainMeasurements) + suppression confirmée"
```

---

### Task 7: `MeasurementForm.jsx` + section « Mes mesures » dans BodyAnalysis

**Files:**
- Create: `src/components/MeasurementForm.jsx`
- Modify: `src/views/BodyAnalysis.jsx`

- [ ] **Step 1: Write MeasurementForm**

```jsx
// src/components/MeasurementForm.jsx
// Saisie poids (requis) + mensurations (optionnelles). 1 entrée/jour, re-saisie = écrase.
import { useState } from 'react';
import { Scale } from 'lucide-react';
import Button from './ui/Button';
import { parseMeasurementInput } from '../utils/measurements.core';

const FIELDS = [
  { key: 'weight', label: 'Poids (kg) *', placeholder: '82,5' },
  { key: 'arms', label: 'Bras (cm)', placeholder: '38' },
  { key: 'waist', label: 'Taille (cm)', placeholder: '90' },
  { key: 'thighs', label: 'Cuisses (cm)', placeholder: '58' },
];

export default function MeasurementForm({ addMeasurement }) {
  const [values, setValues] = useState({ weight: '', arms: '', waist: '', thighs: '' });
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    const result = parseMeasurementInput({ date: today, ...values });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    addMeasurement(result.entry);
    setValues({ weight: '', arms: '', waist: '', thighs: '' });
  };

  return (
    <form onSubmit={submit} className="bg-slate-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Scale size={16} className="text-blue-400" /> Nouvelle mesure
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs text-slate-400">{f.label}</span>
            <input
              type="text"
              inputMode="decimal"
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-amber-400">{error}</p>}
      <Button type="submit" className="w-full">Enregistrer</Button>
      <p className="text-[10px] text-slate-500">Une mesure par jour — re-saisir aujourd'hui remplace la mesure du jour.</p>
    </form>
  );
}
```

Note : vérifier la signature de `Button` (`src/components/ui/Button.jsx`) — si elle n'accepte pas `type`/`className` tels quels, adapter à son API réelle.

- [ ] **Step 2: Section « Mes mesures » dans BodyAnalysis**

Dans `src/views/BodyAnalysis.jsx` :

a) Mettre à jour imports + signature :

```jsx
import LineChart from '../components/ui/LineChart';
import MeasurementForm from '../components/MeasurementForm';
import { toPoints } from '../utils/measurements.core';
// signature (ligne ~299) :
export default function BodyAnalysis({ bodyAnalyses, addBodyAnalysis, measurements, addMeasurement, requestDeleteMeasurement, history }) {
```

b) Ajouter le composant section (avant `export default`, à côté de `Timeline`) :

```jsx
// ─── Mes mesures (P4) ─────────────────────────────────────────────────────────
const MEASURE_OPTIONS = [
  { key: 'arms', label: 'Bras' },
  { key: 'waist', label: 'Taille' },
  { key: 'thighs', label: 'Cuisses' },
];

function MeasurementsSection({ measurements, addMeasurement, requestDeleteMeasurement }) {
  const [measureKey, setMeasureKey] = useState('arms');
  const weightPts = toPoints(measurements, 'weight');
  const measurePts = toPoints(measurements, measureKey);
  const recent = measurements.slice(-5).reverse(); // 5 dernières, récent d'abord

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Mes mesures</h2>
      <MeasurementForm addMeasurement={addMeasurement} />
      {weightPts.length >= 2 && <LineChart title="Poids" unit="kg" series={[{ label: 'Poids', points: weightPts }]} />}
      {measurements.some((m) => m.arms || m.waist || m.thighs) && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {MEASURE_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setMeasureKey(o.key)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${measureKey === o.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <LineChart
            title={MEASURE_OPTIONS.find((o) => o.key === measureKey).label}
            unit="cm"
            series={[{ label: MEASURE_OPTIONS.find((o) => o.key === measureKey).label, points: measurePts, color: '#f59e0b' }]}
          />
        </div>
      )}
      {recent.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white">Dernières mesures</h3>
          {recent.map((m) => (
            <div key={m.date} className="flex items-center justify-between text-xs text-slate-300">
              <span>{new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className="font-mono">
                {m.weight} kg{m.arms ? ` · bras ${m.arms}` : ''}{m.waist ? ` · taille ${m.waist}` : ''}{m.thighs ? ` · cuisses ${m.thighs}` : ''}
              </span>
              <button type="button" onClick={() => requestDeleteMeasurement(m.date)} className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors" aria-label="Supprimer la mesure">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Ajouter `Trash2` à l'import lucide-react existant du fichier.

c) Rendre la section dans le bloc IDLE (après l'« Intro card », avant `<Timeline …/>`, ligne ~471) :

```jsx
          <MeasurementsSection
            measurements={measurements}
            addMeasurement={addMeasurement}
            requestDeleteMeasurement={requestDeleteMeasurement}
          />
```

- [ ] **Step 3: Build gate**

Run: `npm run build`
Expected: succès.

- [ ] **Step 4: Vérif visuelle rapide** (optionnelle si headless dispo) : `npm run dev`, onglet Analyse → formulaire visible, saisie poids → toast + courbe après 2 entrées (2e entrée : modifier la date en localStorage ou tester l'écrasement même jour).

- [ ] **Step 5: Commit**

```bash
git add src/components/MeasurementForm.jsx src/views/BodyAnalysis.jsx
git commit -m "feat(muscugain): Analyse — section Mes mesures (formulaire, courbes poids/mensurations, suppression)"
```

---

### Task 8: timeline corporelle enrichie

**Files:**
- Modify: `src/views/BodyAnalysis.jsx`

- [ ] **Step 1: Ajouter la courbe superposée au-dessus de la Timeline existante**

Import : `import { weeklyVolumePoints } from '../utils/timeline.core';`

Dans le bloc IDLE, juste avant `<Timeline bodyAnalyses={bodyAnalyses} />` :

```jsx
          {(() => {
            const weightPts = toPoints(measurements, 'weight');
            const volPts = weeklyVolumePoints(history);
            const analysisDates = (bodyAnalyses || []).map((a) => a.date).filter(Boolean);
            if (weightPts.length < 2 && volPts.length < 2) return null;
            return (
              <LineChart
                title="Évolution globale"
                normalizeEach
                markers={analysisDates}
                series={[
                  { label: 'Poids', points: weightPts },
                  { label: 'Volume hebdo', points: volPts, color: '#22c55e' },
                ]}
              />
            );
          })()}
```

Note : `bodyAnalyses[i].date` — vérifier le champ réel des entrées d'analyse (probablement `date` ISO, sinon adapter ; voir `addBodyAnalysis` et la `Timeline` existante qui groupe par date).

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: succès.

- [ ] **Step 3: Commit**

```bash
git add src/views/BodyAnalysis.jsx
git commit -m "feat(muscugain): Analyse — timeline enrichie (poids + volume hebdo superposés, markers analyses IA)"
```

---

### Task 9: History — 1RM estimé + graphique par exercice

**Files:**
- Modify: `src/views/History.jsx`

- [ ] **Step 1: 1RM dans l'accordéon**

Imports : ajouter `compute1RMs, epley1RM` à l'import `records.core`, plus :

```jsx
import LineChart from '../components/ui/LineChart';
```

Dans le composant, après `const prs = computePRs(history);` :

```jsx
  const oneRMs = compute1RMs(history);
```

Dans l'accordéon, sous la ligne `<div className="text-sm font-semibold text-white mb-2">{exName}</div>` (ligne ~62), ajouter :

```jsx
                        {oneRMs[exName] && (
                          <div className="text-[10px] text-slate-500 font-mono mb-1">1RM est. : {oneRMs[exName]} kg</div>
                        )}
```

- [ ] **Step 2: Graphique de progression par exercice**

Ajouter l'état et les données en haut du composant :

```jsx
  const [chartExercise, setChartExercise] = useState('');

  // Poids max (série done) par séance pour l'exo choisi + 1RM estimé correspondant.
  const exerciseNames = [...new Set(history.flatMap((s) => Object.keys(s.exercises || {})))].sort((a, b) => a.localeCompare(b, 'fr'));
  const progressSeries = (() => {
    if (!chartExercise) return null;
    const maxPts = [];
    const rmPts = [];
    for (const s of history) {
      const sets = (s.exercises || {})[chartExercise];
      if (!sets) continue;
      let bestW = null;
      let bestRM = null;
      for (const set of sets) {
        if (!set.done) continue;
        const w = Number(set.weight);
        if (Number.isFinite(w) && w > 0 && (bestW === null || w > bestW)) bestW = w;
        const rm = epley1RM(set.weight, set.reps);
        if (rm !== null && (bestRM === null || rm > bestRM)) bestRM = rm;
      }
      if (bestW !== null) maxPts.push({ x: s.date, y: bestW });
      if (bestRM !== null) rmPts.push({ x: s.date, y: bestRM });
    }
    return [
      { label: 'Poids max', points: maxPts },
      { label: '1RM estimé', points: rmPts, color: '#f59e0b' },
    ];
  })();
```

Rendre après `<VolumeChart history={history} />` (ligne ~17) :

```jsx
      {exerciseNames.length > 0 && (
        <div className="space-y-2">
          <select
            value={chartExercise}
            onChange={(e) => setChartExercise(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            aria-label="Choisir un exercice"
          >
            <option value="">Progression par exercice…</option>
            {exerciseNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {progressSeries && <LineChart title={chartExercise} unit="kg" series={progressSeries} />}
        </div>
      )}
```

- [ ] **Step 3: Build gate**

Run: `npm run build`
Expected: succès.

- [ ] **Step 4: Commit**

```bash
git add src/views/History.jsx
git commit -m "feat(muscugain): Historique — 1RM estimé par exo + graphique progression (poids max + 1RM)"
```

---

### Task 10: Cooldown — bannière PR force 💪

**Files:**
- Modify: `src/views/Cooldown.jsx`

- [ ] **Step 1: Ajouter la détection + bannière**

Imports : ajouter `detectRepPRs` à l'import `records.core` ; ajouter `Dumbbell` à l'import lucide-react.

Après `const newPRs = detectNewPRs(history || [], { exercises: workoutData });` (ligne ~8) :

```jsx
  const repPRs = detectRepPRs(history || [], { exercises: workoutData });
```

Après le bloc `{newPRs.length > 0 && (…)}` existant (s'inspirer exactement de sa structure JSX, lignes ~20-30), ajouter le même pattern en variante :

```jsx
      {repPRs.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 fade-in">
          <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
            <Dumbbell size={18} /> Record{repPRs.length > 1 ? 's' : ''} de répétitions !
          </div>
          <ul className="space-y-1">
            {repPRs.map((pr) => (
              <li key={pr.exercise} className="text-sm text-slate-300">
                <span className="font-semibold text-white">{pr.exercise}</span> — {pr.reps} reps à {pr.weight} kg (avant : {pr.prevReps})
              </li>
            ))}
          </ul>
        </div>
      )}
```

Adapter le wrapper/classes au JSX réel de la bannière PR poids existante (même look, couleur blue au lieu d'amber).

- [ ] **Step 2: Build gate + tests complets**

Run: `npm run build && node --test src/utils/`
Expected: build OK, 0 fail.

- [ ] **Step 3: Commit**

```bash
git add src/views/Cooldown.jsx
git commit -m "feat(muscugain): Cooldown — bannière PR force (plus de reps au poids max)"
```

---

### Task 11: docs + vérif finale

**Files:**
- Modify: `CLAUDE.md`, `HISTORIQUE.MD`, `ROADMAP.md`

- [ ] **Step 1: ROADMAP.md** — cocher les 4 items P4 (`- [x]`).

- [ ] **Step 2: CLAUDE.md** — condensé :
  - Section « Roadmap » : marquer **P4 ✅ livré** avec une ligne de résumé (mesures+courbes, timeline enrichie, 1RM Epley+PR force, progression par exo).
  - Section « Historique & records » : mentionner `compute1RMs`/`detectRepPRs` et le graphique par exercice.
  - Ajouter clé localStorage `muscuGainMeasurements` et les nouveaux fichiers (`measurements.core.js`, `chart.core.js`, `timeline.core.js`, `ui/LineChart.jsx`, `MeasurementForm.jsx`) dans « Structure src/ ».

- [ ] **Step 3: HISTORIQUE.MD** — nouvelle entrée datée 2026-06-12 : résumé P4, fichiers créés/modifiés, tableau de vérification (tests, build).

- [ ] **Step 4: Vérif finale**

Run: `node --test src/utils/ && npm run build`
Expected: 0 fail, build OK.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md HISTORIQUE.MD ROADMAP.md
git commit -m "docs(muscugain): P4 suivi corporel+ livré — CLAUDE.md/HISTORIQUE/ROADMAP à jour"
```

---

## Hors plan (après review)

Déploiement : `docker compose up -d --build` dans `/opt/apps/MuscuGain` (à faire après code review approuvée et accord utilisateur — pattern habituel du projet). Pas de push sans demande explicite.
