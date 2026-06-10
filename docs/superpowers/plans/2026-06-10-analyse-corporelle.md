# Analyse corporelle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un 4e onglet « Analyse corporelle » : l'utilisateur photographie son corps, l'IA vision renvoie morphotype / équilibre / masse grasse / conseils / évolution. Photo envoyée à l'IA mais jamais conservée ; seul le résultat texte est stocké localement.

**Architecture:** Nouveau endpoint Fastify `POST /analyze-body` (backend NVIDIA NIM existant). Front : util pur `analyzeBody.core.js` (normalisation, testé) + IO `analyzeBody.js`, vue `BodyAnalysis.jsx`, 4e onglet NavBar, wiring App.jsx. Stockage `localStorage.muscuGainBodyAnalyses` (texte seul).

**Tech Stack:** Fastify ESM, Vite 7, React 19, Tailwind 3, lucide-react, `node --test`.

---

## File Structure

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `backend/server.js` | Modifier | Ajouter handler `POST /analyze-body` |
| `src/utils/analyzeBody.core.js` | Créer | `normalizeBodyAnalysis` (pur) |
| `src/utils/analyzeBody.core.test.js` | Créer | Tests node:test |
| `src/utils/analyzeBody.js` | Créer | IO : `analyzeBody(file, prev)`, `AnalyzeBodyError` |
| `src/views/BodyAnalysis.jsx` | Créer | Vue : consentement / capture / loading / résultats / timeline |
| `src/components/NavBar.jsx` | Modifier | 4e onglet « Analyse » |
| `src/App.jsx` | Modifier | state bodyAnalyses, load/persist, route `body`, NavBar inchangé d'appel |

**Modèle résultat (`muscuGainBodyAnalyses[]`) :**
`{ date, morphotype, balance, bodyFatRange, strengths[], weaknesses[], trainingAdvice[], evolutionNote }`
Flag consentement : `localStorage.muscuGainBodyConsent === '1'`.

---

### Task 1: Backend endpoint `POST /analyze-body`

**Files:**
- Modify: `backend/server.js` (ajouter un handler après `/recognize-exercise`, avant `app.listen`)

- [ ] **Step 1: Add the handler**

Insert into `backend/server.js` just before the `app.listen(...)` call:

```js
app.post('/analyze-body', async (req, reply) => {
  if (!API_KEY) return reply.code(503).send({ error: 'Clé NVIDIA non configurée' });

  const { image, previousAnalysis } = req.body || {};
  if (!image || typeof image !== 'string') return reply.code(400).send({ error: 'image manquante' });

  const dataUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

  let prevText = '';
  if (previousAnalysis && typeof previousAnalysis === 'object') {
    const p = previousAnalysis;
    prevText =
      "\nAnalyse précédente (pour mesurer l'évolution): " +
      `morphotype=${p.morphotype || '?'}, équilibre=${p.balance || '?'}, ` +
      `masse grasse=${p.bodyFatRange || '?'}, faiblesses=${(p.weaknesses || []).join('; ') || '?'}. ` +
      "Compare et résume l'évolution visible dans 'evolutionNote'.";
  }

  const prompt =
    "Tu es un coach sportif bienveillant. Voici une photo du corps d'une personne qui suit sa progression en musculation. " +
    "Analyse la morphologie de façon constructive et NON médicale (aucun diagnostic médical, ce sont des estimations visuelles approximatives). " +
    "Évalue: le morphotype, l'équilibre/symétrie musculaire, une fourchette approximative de masse grasse (ex '15-18%'), " +
    "les points forts visibles, les points faibles à travailler, et des conseils d'entraînement concrets. " +
    "Réponds UNIQUEMENT en JSON, sans texte autour: " +
    '{"morphotype":"<court>","balance":"<court>","bodyFatRange":"<ex 15-18%>",' +
    '"strengths":["..."],"weaknesses":["..."],"trainingAdvice":["..."],"evolutionNote":"<vide si pas de précédent>"}.' +
    prevText;

  const payload = {
    model: MODEL,
    messages: [{ role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: dataUrl } },
    ] }],
    max_tokens: 512,
    temperature: 0.2,
  };

  let res;
  try {
    res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });
  } catch (e) {
    req.log.error({ err: String(e) }, 'NVIDIA fetch failed (body)');
    return reply.code(504).send({ error: 'Délai dépassé côté modèle' });
  }

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    req.log.error({ status: res.status, body: t.slice(0, 300) }, 'NVIDIA error (body)');
    return reply.code(502).send({ error: 'Erreur du modèle', status: res.status });
  }

  const out = await res.json();
  const content = out?.choices?.[0]?.message?.content || '';
  const parsed = extractJson(content);
  if (!parsed) return reply.send({});

  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()).slice(0, 6) : []);

  return reply.send({
    morphotype: str(parsed.morphotype),
    balance: str(parsed.balance),
    bodyFatRange: str(parsed.bodyFatRange),
    strengths: arr(parsed.strengths),
    weaknesses: arr(parsed.weaknesses),
    trainingAdvice: arr(parsed.trainingAdvice),
    evolutionNote: str(parsed.evolutionNote),
  });
});
```

- [ ] **Step 2: Lint/syntax check**

Run: `cd /opt/apps/MuscuGain/backend && node --check server.js`
Expected: no output (syntax OK).

- [ ] **Step 3: Commit**

```bash
cd /opt/apps/MuscuGain && git add backend/server.js && git commit -m "feat(muscugain-backend): endpoint POST /analyze-body (analyse corporelle IA, non médical)"
```

---

### Task 2: `analyzeBody.core.js` — normalizeBodyAnalysis (TDD)

**Files:**
- Create: `src/utils/analyzeBody.core.js`
- Test: `src/utils/analyzeBody.core.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/utils/analyzeBody.core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBodyAnalysis } from './analyzeBody.core.js';

test('normalizeBodyAnalysis fills missing fields with safe defaults', () => {
  const r = normalizeBodyAnalysis({});
  assert.equal(r.morphotype, '');
  assert.equal(r.balance, '');
  assert.equal(r.bodyFatRange, '');
  assert.deepEqual(r.strengths, []);
  assert.deepEqual(r.weaknesses, []);
  assert.deepEqual(r.trainingAdvice, []);
  assert.equal(r.evolutionNote, '');
});

test('normalizeBodyAnalysis coerces and trims strings, cleans arrays', () => {
  const r = normalizeBodyAnalysis({
    morphotype: '  mésomorphe ',
    balance: 42,
    bodyFatRange: '15-18%',
    strengths: ['dos', '', '  épaules ', 7],
    weaknesses: 'pas un tableau',
    trainingAdvice: ['squat'],
    evolutionNote: '  mieux ',
  });
  assert.equal(r.morphotype, 'mésomorphe');
  assert.equal(r.balance, ''); // non-string coerced to ''
  assert.equal(r.bodyFatRange, '15-18%');
  assert.deepEqual(r.strengths, ['dos', 'épaules']);
  assert.deepEqual(r.weaknesses, []);
  assert.deepEqual(r.trainingAdvice, ['squat']);
  assert.equal(r.evolutionNote, 'mieux');
});

test('normalizeBodyAnalysis caps arrays at 6 and never throws on null', () => {
  const r = normalizeBodyAnalysis(null);
  assert.deepEqual(r.strengths, []);
  const big = normalizeBodyAnalysis({ trainingAdvice: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] });
  assert.equal(big.trainingAdvice.length, 6);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/analyzeBody.core.test.js`
Expected: FAIL — `Cannot find module './analyzeBody.core.js'`

- [ ] **Step 3: Implement**

```js
// src/utils/analyzeBody.core.js
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const arr = (v) =>
  Array.isArray(v)
    ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()).slice(0, 6)
    : [];

export function normalizeBodyAnalysis(json) {
  const j = json && typeof json === 'object' ? json : {};
  return {
    morphotype: str(j.morphotype),
    balance: str(j.balance),
    bodyFatRange: str(j.bodyFatRange),
    strengths: arr(j.strengths),
    weaknesses: arr(j.weaknesses),
    trainingAdvice: arr(j.trainingAdvice),
    evolutionNote: str(j.evolutionNote),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/analyzeBody.core.test.js`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/utils/analyzeBody.core.js src/utils/analyzeBody.core.test.js && git commit -m "feat(muscugain): analyzeBody.core normalizeBodyAnalysis (TDD)"
```

---

### Task 3: `analyzeBody.js` — IO

**Files:**
- Create: `src/utils/analyzeBody.js`

- [ ] **Step 1: Write the IO module**

```js
// src/utils/analyzeBody.js
import { fileToDataUrl } from './recognizeMachine.js';
import { normalizeBodyAnalysis } from './analyzeBody.core.js';

const MESSAGES = {
  unavailable: 'Analyse indisponible, réessaie plus tard.',
  ratelimit: 'Trop de tentatives, réessaie dans 1 min.',
  empty: "L'IA n'a pas pu analyser cette photo, réessaie avec une autre.",
  image: 'Image illisible, réessaie avec une autre photo.',
};

export class AnalyzeBodyError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'AnalyzeBodyError';
    this.kind = kind;
  }
}

// Envoie la photo à l'IA. La dataURL reste locale et n'est pas conservée après l'appel.
export async function analyzeBody(file, previousAnalysis) {
  let image;
  try {
    image = await fileToDataUrl(file);
  } catch {
    throw new AnalyzeBodyError('image', MESSAGES.image);
  }
  let res;
  try {
    res = await fetch('/api/analyze-body', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, previousAnalysis: previousAnalysis || null }),
    });
  } catch {
    throw new AnalyzeBodyError('unavailable', MESSAGES.unavailable);
  }
  if (res.status === 429) throw new AnalyzeBodyError('ratelimit', MESSAGES.ratelimit);
  if (!res.ok) throw new AnalyzeBodyError('unavailable', MESSAGES.unavailable);
  const json = await res.json().catch(() => null);
  const result = normalizeBodyAnalysis(json);
  const hasContent = result.morphotype || result.balance || result.bodyFatRange ||
    result.strengths.length || result.weaknesses.length || result.trainingAdvice.length;
  if (!hasContent) throw new AnalyzeBodyError('empty', MESSAGES.empty);
  return result;
}
```

Note: `fileToDataUrl` is exported by `src/utils/recognizeMachine.js` (verified). It throws a `RecognizeError` of kind `image` on bad images — we catch and rethrow as `AnalyzeBodyError`.

- [ ] **Step 2: Verify build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/utils/analyzeBody.js && git commit -m "feat(muscugain): analyzeBody.js IO (POST /api/analyze-body, photo non conservée)"
```

---

### Task 4: `BodyAnalysis.jsx` view

**Files:**
- Create: `src/views/BodyAnalysis.jsx`

**REQUIRED SUB-SKILL for this task:** invoke `frontend-design` before writing the JSX — this is a new user-facing view with real UI (consent, capture, results cards, timeline). Respect the existing charte (dark slate-900/800, accent blue-500/600, rounded-xl/2xl, `fade-in`, sémantique green/amber/red), reuse `Button`/`Card`.

**Props:** `{ bodyAnalyses, addBodyAnalysis }`.
- `bodyAnalyses` : array (plus récent en tête).
- `addBodyAnalysis(result)` : prepend + persist (handled in App).

**Behavior spec (implement exactly):**
- Consent gate: read `localStorage.muscuGainBodyConsent`. If not `'1'` and user tries to capture, show consent card first (texte : photo envoyée à une IA externe, non conservée, analyse indicative non médicale). « J'accepte » → `localStorage.setItem('muscuGainBodyConsent','1')` → proceed. « Annuler » → back to idle.
- Capture: two inputs —
  - Caméra : `<input type="file" accept="image/*" capture="environment" hidden>` déclenché par bouton « 📷 Prendre une photo ».
  - Galerie : `<input type="file" accept="image/*" hidden>` déclenché par bouton « 🖼 Galerie ».
  - On file change: set status `loading`, call `analyzeBody(file, bodyAnalyses[0] || null)`. On success: build `{ date: new Date().toISOString(), ...result }`, call `addBodyAnalysis(entry)`, set status `results` with that entry. On `AnalyzeBodyError`: set status `error` with `err.message`. Reset the input value after.
- States rendered: `idle` (intro + capture buttons + timeline if any), `consent`, `loading` (spinner + « Analyse en cours… »), `results` (the cards below + « Nouvelle analyse » button → idle), `error` (message + « Réessayer »).
- Results cards: Morphotype, Équilibre, Masse grasse (bodyFatRange), Forces (green list), Faiblesses (amber list), Conseils training (blue list), Note d'évolution (only if non-empty). Each list only rendered if non-empty.
- Disclaimer footer (always on results & consent): « Estimations visuelles indicatives, sans valeur médicale. »
- Timeline (idle, if `bodyAnalyses.length`): compact list, each item = date (fr-FR) + morphotype + bodyFatRange + first line of evolutionNote; click to expand full detail (accordion style like History). Use `useState` for expanded index.
- Header: title « Analyse corporelle ». Root wrapper `className="space-y-6 pb-24 fade-in"` to match other views.

- [ ] **Step 1: Invoke frontend-design skill, then write `src/views/BodyAnalysis.jsx`** implementing the behavior spec above. Import `analyzeBody, AnalyzeBodyError` from `../utils/analyzeBody`, `Button` from `../components/ui/Button`, `Card` from `../components/ui/Card`, and lucide icons (`ScanLine, Camera, Image as ImageIcon, Loader2, Trophy, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle` as needed).

- [ ] **Step 2: Verify build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/views/BodyAnalysis.jsx && git commit -m "feat(muscugain): vue BodyAnalysis (consentement, capture caméra/galerie, résultats, timeline)"
```

---

### Task 5: NavBar 4e onglet + App.jsx wiring

**Files:**
- Modify: `src/components/NavBar.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Add « Analyse » tab to NavBar.jsx**

In `src/components/NavBar.jsx`, update import line 1:

```jsx
import { LayoutDashboard, Dumbbell, History, ScanLine } from 'lucide-react';
```

Add an « Analyse » button between the center FAB `</div>` and the Historique button (so order: Accueil, [FAB], Analyse, Historique). Insert after line 28 (`</div>` closing the FAB wrapper), before the Historique button:

```jsx
        <button
          onClick={() => setView('body')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'body' ? 'text-blue-500' : 'text-slate-500'}`}
        >
          <ScanLine size={20} />
          <span className="text-[10px] font-medium">Analyse</span>
        </button>
```

(Result: 4 flex children + FAB — Accueil, FAB, Analyse, Historique. Acceptable balance; the FAB stays the floating center element.)

- [ ] **Step 2: App.jsx — state + load + persist + route**

In `src/App.jsx`:

a) Add import near other view imports:

```jsx
import BodyAnalysis from './views/BodyAnalysis';
```

b) Add state near `const [history, setHistory] = useState([]);`:

```jsx
const [bodyAnalyses, setBodyAnalyses] = useState([]);
```

c) In the mount `useEffect` that loads from localStorage (where `muscuGainHistory` is read), add:

```jsx
const savedBody = localStorage.getItem('muscuGainBodyAnalyses');
if (savedBody) setBodyAnalyses(JSON.parse(savedBody));
```

d) Add handler near `importRoutines`:

```jsx
const addBodyAnalysis = (entry) => {
  const updated = [entry, ...bodyAnalyses];
  setBodyAnalyses(updated);
  localStorage.setItem('muscuGainBodyAnalyses', JSON.stringify(updated));
};
```

e) Add route after the `view === 'history'` block:

```jsx
{view === 'body' && (
  <BodyAnalysis bodyAnalyses={bodyAnalyses} addBodyAnalysis={addBodyAnalysis} />
)}
```

(The NavBar already receives `setView`; no extra prop needed. `body` is not in `isSessionView`, so NavBar shows correctly.)

- [ ] **Step 3: Verify build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/components/NavBar.jsx src/App.jsx && git commit -m "feat(muscugain): onglet Analyse + wiring BodyAnalysis (state/persist/route)"
```

---

### Task 6: Deploy + e2e + docs

**Files:** none (deploy + verification + docs)

- [ ] **Step 1: All core tests**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/`
Expected: ALL PASS (incl. analyzeBody.core).

- [ ] **Step 2: Final build**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 3: Deploy (rebuild backend + front)**

Run: `cd /opt/apps/MuscuGain && docker compose up -d --build`
Expected: `muscugain-backend` + `muscugain-app` recreated.

- [ ] **Step 4: Wait healthy**

Run: `until docker ps --filter name=muscugain-app --format '{{.Status}}' | grep -q healthy; do sleep 3; done; docker ps --filter name=muscugain --format '{{.Names}}\t{{.Status}}'`
Expected: both `Up ... (healthy)`.

- [ ] **Step 5: e2e backend body analysis**

Generate a tiny test image and POST it. (The model may refuse a blank image — the goal here is to confirm the endpoint returns 200 with a JSON object shape, not the analysis quality.)

Run:
```bash
cd /opt/apps/MuscuGain && PNG=$(printf '\x89PNG\r\n\x1a\n' | base64) ; \
curl -s -X POST http://127.0.0.1:8080/api/analyze-body \
  -H 'Content-Type: application/json' \
  -d "{\"image\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==\"}" | head -c 400
```
Expected: HTTP 200 with a JSON object (either populated fields, `{}`, or a `502/error` if the model rejects — acceptable as long as the endpoint responds without crashing). If it returns 503, the NVIDIA key is not configured — check `backend/.env`.

- [ ] **Step 6: Visual verification (browser-use / Playwright)**

Use the browser skill to open `http://127.0.0.1:8080/`, click the « Analyse » tab, verify: consent card appears on first capture attempt, capture buttons present, disclaimer visible. Screenshot.

- [ ] **Step 7: Docs**

Update `HISTORIQUE.MD` (entry 2026-06-10 : suppression export/import JSON + ajout onglet Analyse corporelle ; fichiers ; vérifs) and project `CLAUDE.md` (add: backend `POST /analyze-body` ; front `analyzeBody.{core.,}js`, vue `BodyAnalysis`, 4e onglet, clé localStorage `muscuGainBodyAnalyses` + `muscuGainBodyConsent` ; note photo non conservée). Condense. Commit:

```bash
cd /opt/apps/MuscuGain && git add HISTORIQUE.MD CLAUDE.md && git commit -m "docs(muscugain): histo + CLAUDE.md — onglet analyse corporelle, retrait export/import"
```

---

## Self-Review

**Spec coverage:**
- Backend `/analyze-body` (morphotype/balance/bodyFat/strengths/weaknesses/advice/evolution, prev analysis, non-médical, normalisation) → Task 1 ✓
- `normalizeBodyAnalysis` pur + tests → Task 2 ✓
- `analyzeBody.js` IO + `AnalyzeBodyError` + photo non conservée → Task 3 ✓
- Vue : consentement, capture caméra+galerie, loading, résultats, disclaimer, timeline → Task 4 ✓
- 4e onglet NavBar + wiring state/persist/route → Task 5 ✓
- Deploy + e2e + visuel + docs → Task 6 ✓
- Photo jamais persistée (locale, GC après fetch ; aucun `setItem` d'image) → Tasks 3 & 4 ✓
- nginx : aucune modif nécessaire (déjà spec) ✓

**Type consistency:**
- Résultat backend shape == `normalizeBodyAnalysis` output == entrée `addBodyAnalysis` (+ `date`) == lecture `BodyAnalysis` cards/timeline. ✓
- `analyzeBody(file, previousAnalysis)` reçoit `bodyAnalyses[0] || null` ; backend lit `previousAnalysis` objet. ✓
- `fileToDataUrl` importée depuis `recognizeMachine.js` (export vérifié). ✓
- localStorage keys cohérentes : `muscuGainBodyAnalyses`, `muscuGainBodyConsent`. ✓

**Placeholder scan:** aucun TBD ; tout le code fourni sauf Task 4 (vue volontairement décrite par spec comportementale + frontend-design, vu la part créative UI). ✓
