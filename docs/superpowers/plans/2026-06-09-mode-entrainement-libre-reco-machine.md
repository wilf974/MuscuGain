# Mode entraînement libre + reco machine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre une séance hors programme (« Séance libre ») et identifier une machine de salle par photo (backend IA vision) pour ajouter l'exercice correspondant.

**Architecture:** Front React local-first. La reco photo se greffe dans `AddExerciseModal` (déjà partagé Workout + CreateRoutine). Logique pure isolée dans `recognizeMachine.core.js` (testable `node --test`), IO navigateur dans `recognizeMachine.js`. Backend Fastify déjà fait, exposé via nginx `/api/`.

**Tech Stack:** Vite 7, React 19, Tailwind 3, lucide-react, `node --test` (natif), Docker Compose + nginx.

---

## File Structure

- **Create** `src/utils/recognizeMachine.core.js` — logique pure : `flattenExercises`, `normalizeResult`.
- **Create** `src/utils/recognizeMachine.core.test.js` — tests `node --test`.
- **Create** `src/utils/recognizeMachine.js` — IO : `fileToDataUrl` (canvas), `recognizeMachine` (fetch `/api/`), `RecognizeError`.
- **Modify** `src/components/modals/AddExerciseModal.jsx` — bouton photo + panneau candidats + états.
- **Modify** `src/views/Dashboard.jsx` — bouton « Séance libre ».
- **Modify** `src/App.jsx` — `startFreeSession()` + prop vers Dashboard.
- **Modify** `docker-compose.yml` — service `muscugain-backend`.
- **Modify** `nginx-container.conf` — `location /api/` proxy.

---

## Task 1 : Logique pure de reconnaissance (core + tests)

**Files:**
- Create: `src/utils/recognizeMachine.core.js`
- Test: `src/utils/recognizeMachine.core.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

`src/utils/recognizeMachine.core.test.js` :
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenExercises, normalizeResult } from './recognizeMachine.core.js';

test('flattenExercises aplati toutes les catégories', () => {
  assert.deepEqual(flattenExercises({ chest: ['A', 'B'], legs: ['C'] }), ['A', 'B', 'C']);
});

test('flattenExercises tolère un db vide', () => {
  assert.deepEqual(flattenExercises({}), []);
});

test('normalizeResult réponse normale', () => {
  const r = normalizeResult({ label: 'IRON', candidates: [{ exercise: 'Chest Press', confidence: 0.9 }] });
  assert.equal(r.label, 'IRON');
  assert.deepEqual(r.candidates, [{ exercise: 'Chest Press', confidence: 0.9 }]);
});

test('normalizeResult tronque à 3 candidats', () => {
  const r = normalizeResult({ candidates: [1, 2, 3, 4, 5].map((n) => ({ exercise: 'E' + n, confidence: 0.5 })) });
  assert.equal(r.candidates.length, 3);
  assert.equal(r.label, null);
});

test('normalizeResult confidence manquante -> null', () => {
  const r = normalizeResult({ candidates: [{ exercise: 'X' }] });
  assert.equal(r.candidates[0].confidence, null);
});

test('normalizeResult filtre les candidats sans exercise', () => {
  const r = normalizeResult({ candidates: [{ confidence: 0.9 }, { exercise: 'OK', confidence: 0.5 }] });
  assert.deepEqual(r.candidates, [{ exercise: 'OK', confidence: 0.5 }]);
});

test('normalizeResult JSON vide/invalide', () => {
  assert.deepEqual(normalizeResult(null), { label: null, candidates: [] });
  assert.deepEqual(normalizeResult({}), { label: null, candidates: [] });
  assert.deepEqual(normalizeResult({ label: '  ' }), { label: null, candidates: [] });
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/recognizeMachine.core.test.js`
Expected: FAIL (`Cannot find module './recognizeMachine.core.js'`).

- [ ] **Step 3 : Implémentation minimale**

`src/utils/recognizeMachine.core.js` :
```js
// Logique pure (testable hors navigateur) pour la reconnaissance de machine.

// Aplati EXERCISES_DB { categorie: [noms] } en une liste plate de noms d'exercices.
export function flattenExercises(db) {
  return Object.values(db || {}).flat();
}

// Normalise la réponse du backend en { label, candidates: [{exercise, confidence}] } (max 3).
// Tolère un JSON malformé ou partiel.
export function normalizeResult(json) {
  const out = { label: null, candidates: [] };
  if (!json || typeof json !== 'object') return out;
  if (typeof json.label === 'string' && json.label.trim()) out.label = json.label.trim();
  const arr = Array.isArray(json.candidates) ? json.candidates : [];
  out.candidates = arr
    .filter((c) => c && c.exercise)
    .map((c) => ({
      exercise: String(c.exercise).trim(),
      confidence: Number.isFinite(Number(c.confidence)) ? Number(c.confidence) : null,
    }))
    .slice(0, 3);
  return out;
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `cd /opt/apps/MuscuGain && node --test src/utils/recognizeMachine.core.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5 : Commit**

```bash
cd /opt/apps/MuscuGain
git add src/utils/recognizeMachine.core.js src/utils/recognizeMachine.core.test.js
git commit -m "feat(muscugain): logique pure reco machine (flatten + normalize) + tests"
```

---

## Task 2 : Wrapper IO navigateur (canvas + fetch)

**Files:**
- Create: `src/utils/recognizeMachine.js`

> Note : code navigateur (canvas, fetch, Image) non testable via `node --test`. Le gate est `npm run build` + vérif navigateur (Task 6).

- [ ] **Step 1 : Implémenter le wrapper**

`src/utils/recognizeMachine.js` :
```js
import { flattenExercises, normalizeResult } from './recognizeMachine.core.js';

export { flattenExercises };

const MESSAGES = {
  unavailable: 'Reconnaissance indisponible, choisis manuellement.',
  ratelimit: 'Trop de tentatives, réessaie dans 1 min.',
  empty: 'Machine non reconnue, choisis manuellement.',
  image: 'Image illisible, réessaie avec une autre photo.',
};

export class RecognizeError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'RecognizeError';
    this.kind = kind;
  }
}

// File -> canvas (resize max px, ratio conservé) -> dataURL JPEG.
export function fileToDataUrl(file, max = 768, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > max || height > max) {
        const scale = max / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new RecognizeError('image', MESSAGES.image));
    };
    img.src = url;
  });
}

// Reconnaît la machine sur la photo. Retourne { label, candidates } (>=1 candidat) ou lève RecognizeError.
export async function recognizeMachine(file, allowedExercises) {
  const image = await fileToDataUrl(file);
  let res;
  try {
    res = await fetch('/api/recognize-exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, allowedExercises }),
    });
  } catch {
    throw new RecognizeError('unavailable', MESSAGES.unavailable);
  }
  if (res.status === 429) throw new RecognizeError('ratelimit', MESSAGES.ratelimit);
  if (!res.ok) throw new RecognizeError('unavailable', MESSAGES.unavailable);
  const json = await res.json().catch(() => null);
  const result = normalizeResult(json);
  if (!result.candidates.length) throw new RecognizeError('empty', MESSAGES.empty);
  return result;
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK (le module est importé en Task 3 ; ici on vérifie juste qu'il parse — pas encore référencé, donc build OK sans erreur).

- [ ] **Step 3 : Commit**

```bash
cd /opt/apps/MuscuGain
git add src/utils/recognizeMachine.js
git commit -m "feat(muscugain): wrapper IO reco machine (canvas resize + fetch /api)"
```

---

## Task 3 : Bouton photo + panneau candidats dans AddExerciseModal

**Files:**
- Modify: `src/components/modals/AddExerciseModal.jsx` (remplacement complet)

- [ ] **Step 1 : Remplacer le contenu du fichier**

`src/components/modals/AddExerciseModal.jsx` (contenu complet) :
```jsx
import { useRef, useState } from 'react';
import { PlusCircle, Camera, Loader2, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import { EXERCISES_DB, MUSCLE_LABELS } from '../../data/exercises';
import { recognizeMachine, flattenExercises, RecognizeError } from '../../utils/recognizeMachine';

export default function AddExerciseModal({ isOpen, onClose, onSelect, existingExercises = [] }) {
  const fileInputRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | loading | results | error
  const [result, setResult] = useState(null); // { label, candidates }
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;
  const existingExerciseNames = existingExercises.map((ex) => (typeof ex === 'string' ? ex : ex.name));

  const resetReco = () => {
    setPhase('idle');
    setResult(null);
    setErrorMsg('');
  };

  const handleClose = () => {
    resetReco();
    onClose();
  };

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // permet de re-sélectionner le même fichier
    if (!file) return; // annulation -> no-op
    setPhase('loading');
    setErrorMsg('');
    try {
      const r = await recognizeMachine(file, flattenExercises(EXERCISES_DB));
      setResult(r);
      setPhase('results');
    } catch (err) {
      setErrorMsg(err instanceof RecognizeError ? err.message : 'Une erreur est survenue.');
      setPhase('error');
    }
  };

  const pickCandidate = (exerciseName) => {
    if (existingExerciseNames.includes(exerciseName)) return;
    resetReco();
    onSelect(exerciseName);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={handleClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4 text-blue-400">
          <PlusCircle size={24} />
          <h3 className="text-xl font-bold text-white">Ajouter un Exercice</h3>
        </div>

        {/* Reconnaissance par photo */}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

        {phase === 'idle' && (
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="w-full mb-4 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-blue-300 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 transition-colors"
          >
            <Camera size={18} /> Identifier par photo
          </button>
        )}

        {phase === 'loading' && (
          <div className="w-full mb-4 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-blue-300 bg-blue-600/10 border border-blue-500/20">
            <Loader2 size={18} className="animate-spin" /> Analyse de la machine…
          </div>
        )}

        {phase === 'error' && (
          <div className="mb-4 p-3 rounded-xl bg-amber-900/20 border border-amber-500/30">
            <div className="flex items-start gap-2 text-amber-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={resetReco} className="mt-2 text-xs font-bold text-amber-300 hover:text-amber-200 underline">Réessayer</button>
          </div>
        )}

        {phase === 'results' && result && (
          <div className="mb-4 p-3 rounded-xl bg-slate-900/60 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-blue-400">Exercices probables</h4>
              <button onClick={resetReco} className="text-xs text-slate-400 hover:text-white">✕ Annuler</button>
            </div>
            {result.label && <p className="text-[11px] text-slate-500 mb-2">Lu sur la machine : « {result.label} »</p>}
            <div className="space-y-2">
              {result.candidates.map((c) => {
                const added = existingExerciseNames.includes(c.exercise);
                const pct = c.confidence != null ? Math.round(c.confidence * 100) : null;
                return (
                  <button
                    key={c.exercise}
                    onClick={() => pickCandidate(c.exercise)}
                    disabled={added}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      added ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-blue-600/30 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span>{c.exercise} {added && <span className="text-xs text-slate-600 ml-1">✓ Ajouté</span>}</span>
                      {pct != null && <span className="text-[11px] text-slate-400 tabular-nums">{pct}%</span>}
                    </div>
                    {pct != null && (
                      <div className="mt-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Pas le bon ? Choisis dans la liste ci-dessous.</p>
          </div>
        )}

        {/* Liste manuelle (toujours dispo) */}
        <div className="space-y-3">
          {Object.entries(EXERCISES_DB).map(([category, exercises]) => (
            <div key={category}>
              <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">{MUSCLE_LABELS[category]}</h4>
              <div className="space-y-1">
                {exercises.map((exerciseName) => {
                  const isAlreadyAdded = existingExerciseNames.includes(exerciseName);
                  return (
                    <button
                      key={exerciseName}
                      onClick={() => !isAlreadyAdded && onSelect(exerciseName)}
                      disabled={isAlreadyAdded}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        isAlreadyAdded
                          ? 'text-slate-500 bg-slate-700/30 cursor-not-allowed'
                          : 'text-slate-200 hover:bg-blue-600/30 hover:text-blue-300 cursor-pointer'
                      }`}
                    >
                      {exerciseName} {isAlreadyAdded && <span className="text-xs text-slate-600 ml-2">✓ Ajouté</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Button onClick={handleClose} variant="ghost" fullWidth>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 3 : Commit**

```bash
cd /opt/apps/MuscuGain
git add src/components/modals/AddExerciseModal.jsx
git commit -m "feat(muscugain): reco machine par photo dans AddExerciseModal"
```

---

## Task 4 : Séance libre (Dashboard + App)

**Files:**
- Modify: `src/App.jsx` (ajout `startFreeSession`, prop Dashboard)
- Modify: `src/views/Dashboard.jsx` (prop + bouton)

- [ ] **Step 1 : Ajouter `startFreeSession` dans App.jsx**

Dans `src/App.jsx`, juste après la fonction `triggerSetup` (se termine ligne ~171 par `};`), insérer :
```js
  const startFreeSession = () => {
    setWorkoutData({});
    setActiveRoutine({ name: 'Séance libre', exercises: [], isCustom: false });
    setView('setup');
  };
```

- [ ] **Step 2 : Passer la prop au Dashboard**

Dans `src/App.jsx`, dans le bloc `{view === 'dashboard' && ( <Dashboard ... /> )}`, ajouter la prop après `triggerSetup={triggerSetup}` :
```jsx
          triggerSetup={triggerSetup}
          startFreeSession={startFreeSession}
```

- [ ] **Step 3 : Recevoir la prop dans Dashboard**

Dans `src/views/Dashboard.jsx`, ajouter `startFreeSession` à la liste des props déstructurées (après `triggerSetup,`) :
```js
  triggerSetup,
  startFreeSession,
```

- [ ] **Step 4 : Ajouter le bouton « Séance libre »**

Dans `src/views/Dashboard.jsx`, juste APRÈS le bloc `{/* Resume session */}` (la div fermée ligne ~97) et AVANT `{/* Stats */}`, insérer :
```jsx
      {/* Séance libre */}
      {!activeRoutine && (
        <Button fullWidth onClick={startFreeSession} className="bg-blue-600 hover:bg-blue-500 shadow-blue-900/50">
          <Play size={16} /> Séance libre
        </Button>
      )}
```
(`Button` et `Play` sont déjà importés dans Dashboard.jsx.)

- [ ] **Step 5 : Vérifier la compilation**

Run: `cd /opt/apps/MuscuGain && npm run build`
Expected: build OK.

- [ ] **Step 6 : Commit**

```bash
cd /opt/apps/MuscuGain
git add src/App.jsx src/views/Dashboard.jsx
git commit -m "feat(muscugain): mode séance libre (routine vide depuis le dashboard)"
```

---

## Task 5 : Déploiement backend (compose + nginx proxy)

**Files:**
- Modify: `docker-compose.yml`
- Modify: `nginx-container.conf`

- [ ] **Step 1 : Ajouter le service backend dans docker-compose.yml**

Dans `docker-compose.yml`, sous `services:`, AVANT `networks:`, ajouter (indentation 2 espaces, alignée sur `muscugain:`) :
```yaml
  muscugain-backend:
    build: ./backend
    container_name: muscugain-backend
    env_file: backend/.env
    security_opt:
      - no-new-privileges:true
    expose:
      - 8000
    networks:
      - vps-network
    restart: unless-stopped
```

- [ ] **Step 2 : Ajouter le proxy /api/ dans nginx-container.conf**

Dans `nginx-container.conf`, AVANT le bloc `location / {` (SPA fallback), insérer :
```nginx
    # Proxy backend IA vision (préfixe /api/ strippé)
    location /api/ {
        proxy_pass http://muscugain-backend:8000/;
        client_max_body_size 10m;
        proxy_read_timeout 90s;
        proxy_set_header Host $host;
    }
```

- [ ] **Step 3 : Vérifier que backend/.env existe et contient la clé**

Run: `cd /opt/apps/MuscuGain && grep -q '^NVIDIA_API_KEY=.' backend/.env && echo OK || echo "MANQUE CLE"`
Expected: `OK`. (Sinon copier `backend/.env.example` et renseigner `NVIDIA_API_KEY`.)

- [ ] **Step 4 : Valider la syntaxe compose**

Run: `cd /opt/apps/MuscuGain && docker compose config >/dev/null && echo "compose OK"`
Expected: `compose OK`.

- [ ] **Step 5 : Commit**

```bash
cd /opt/apps/MuscuGain
git add docker-compose.yml nginx-container.conf
git commit -m "feat(muscugain): déploie backend IA vision derrière nginx /api/"
```

---

## Task 6 : Build, déploiement et vérification e2e

**Files:** aucun (opérations de déploiement)

- [ ] **Step 1 : Arrêter le serveur de test host sur :8099 (s'il tourne)**

Run:
```bash
PID=$(ss -ltnp 2>/dev/null | grep ':8099' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill "$PID" && echo "killed $PID" || echo "rien sur 8099"
```
Expected: `killed <pid>` ou `rien sur 8099`.

- [ ] **Step 2 : Build + (re)déploiement Docker**

Run: `cd /opt/apps/MuscuGain && docker compose up -d --build`
Expected: `muscugain-app` et `muscugain-backend` créés/recréés, sans erreur.

- [ ] **Step 3 : Vérifier l'état des containers**

Run: `docker ps --filter name=muscugain --format '{{.Names}} | {{.Status}}'`
Expected: les deux `Up` (et `healthy` après ~30s).

- [ ] **Step 4 : Vérifier le proxy /api/health**

Run: `curl -s --max-time 10 http://127.0.0.1:8080/api/health; echo`
Expected: `{"status":"ok","model":"nvidia/nemotron-nano-12b-v2-vl","keyConfigured":true}`

- [ ] **Step 5 : Vérif navigateur (gstack/browse)**

Charger `http://127.0.0.1:8080` (ou l'URL publique), vérifier :
- le bouton « Séance libre » s'affiche sur le Dashboard ;
- démarrer une séance libre → setup → workout ;
- dans « Ajouter un Exercice », le bouton « 📷 Identifier par photo » est présent et ouvre le sélecteur ;
- la liste manuelle reste accessible.
Screenshot avant/après pour preuve.

- [ ] **Step 6 : MAJ docs projet**

- `HISTORIQUE.MD` : entrée 09/06/2026 (mode libre + reco photo livrés, fichiers, vérifs).
- `CLAUDE.md` projet : section reco machine — passer de « pas encore intégré » à « intégré » ; documenter `recognizeMachine.*`, bouton Séance libre, route `/api/`.

- [ ] **Step 7 : Commit**

```bash
cd /opt/apps/MuscuGain
git add HISTORIQUE.MD CLAUDE.md
git commit -m "docs(muscugain): histo + CLAUDE.md mode libre + reco machine"
```

---

## Notes d'exécution

- **Confidences mal calibrées** (cf. spec) : l'UI affiche les % à titre indicatif, l'ordre prime.
- **Pas de push** : aucun `git push` sans demande explicite de l'utilisateur.
- **Prod intouchée** : seuls les containers `muscugain-*` sont concernés.
