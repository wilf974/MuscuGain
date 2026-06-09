# MuscuGain — CLAUDE.md

App de suivi musculation. **Local-first** (données dans `localStorage`). Backend optionnel `backend/` : passerelle IA vision pour reconnaître un exercice depuis une photo de machine (aucune donnée utilisateur stockée côté serveur).

## Stack
Vite 7 + React 19 + Tailwind 3 + lucide-react. Build statique servi par nginx (Docker).

## Déploiement
- Container `muscugain-app`, `127.0.0.1:8080->80`, réseau externe `vps-network` (reverse proxy VPS).
- Projet compose `muscugain`, service `muscugain`, `/opt/apps/MuscuGain/docker-compose.yml`.
- Deploy : `docker compose up -d --build` (Dockerfile multi-stage : `npm ci` + `vite build` → nginx).

## Structure `src/`
- `App.jsx` — état global (vues, `customRoutines`, historique, timers), persistance localStorage, modales.
- `views/` — Dashboard, SessionSetup, Warmup, Workout, Cooldown, History, CreateRoutine.
- `components/ui/` (Button, Card), `components/modals/` (Confirmation, AddExercise, Video, **ImportRoutine**), NavBar, InstallPrompt.
- `data/` — exercises.js (`EXERCISES_DB` par groupe + `MUSCLE_LABELS`), routines.js (`DEFAULT_ROUTINES`), videos.js.
- `hooks/` (useAlarm), `utils/` (format.js, **parseWorkbook.js** + **parseWorkbook.core.js**).

## Modèle programme (routine)
`{ id, name, desc, exercises: [{ name, targetSets, targetReps, startingWeight, restSeconds? }], isCustom }`
- Programmes perso : localStorage `muscuGainCustomRoutines`. Exemples : `DEFAULT_ROUTINES`.
- `restSeconds` (optionnel) : pause par exercice ; sinon fallback global 60s (`restDuration` dans App.jsx).

## Import Excel (.xlsx)
- Bouton "Importer" sur le Dashboard → `ImportRoutineModal`.
- **1 feuille = 1 programme** nommé d'après la feuille. Colonnes : **A**=exercice (verbatim), **B**=séries, **C**=reps, **D**=pause (minutes → `restSeconds`).
- Auto-détection ligne d'en-tête (si B et C non numériques sur la 1ère ligne). Conflit de nom → **écrase** l'existant. Aperçu avec cases à cocher avant création.
- Lib : `read-excel-file@9` (import depuis `read-excel-file/browser`). Logique de parsing pure et testable dans `parseWorkbook.core.js`.

## Backend IA vision (`backend/`)
- Fastify (ESM, `node server.js`), `POST /recognize-exercise` `{image: dataURL|base64, allowedExercises?: string[]}` → `{label, candidates: [{exercise, confidence}]×3}`. `GET /health`. Rate-limit 30/min, bodyLimit 8MB.
- Modèle : **`nvidia/nemotron-nano-12b-v2-vl`** (NVIDIA NIM). Choisi par benchmark (cf. HISTORIQUE 09/06) : llama-3.2-90b refuse les photos avec personnes, llama-4-maverick timeout. Surcharge via `NVIDIA_MODEL`.
- Env : `backend/.env` (`NVIDIA_API_KEY`, `NVIDIA_MODEL`, `PORT=8000`). `.env` non committé (clé).
- ⚠️ Confidences candidats 2/3 mal calibrées → se fier à l'ordre, pas à la valeur absolue.
- **Intégré et déployé** : service `muscugain-backend` (compose, `expose:8000`, interne `vps-network`) + nginx `location /api/` (proxy strip, `client_max_body_size 10m`). Front appelle `/api/recognize-exercise` en relatif.
- Front : `src/utils/recognizeMachine.{core.,}js` (core pur testé + IO canvas/fetch), bouton « 📷 Identifier par photo » dans `AddExerciseModal` (idle/loading/results/error, liste manuelle en fallback).

## Mode séance libre
- Bouton « Séance libre » sur le Dashboard (`App.startFreeSession`) → routine vide `{name:'Séance libre', exercises:[]}` → flux setup→warmup→workout. Ajout d'exos à la volée (manuel ou photo) pendant la séance. Historisé comme une séance normale (`routineName:'Séance libre'`).

## Conventions
- Charte : dark slate-900/800, accent blue-500/600, rounded-xl/2xl, `fade-in`, sémantique amber/green/red. Réutiliser Button/Card.
- Pas de lint installé localement → le gate de compilation est `npm run build`.
- Historique détaillé : `HISTORIQUE.MD`.
