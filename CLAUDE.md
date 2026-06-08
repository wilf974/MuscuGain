# MuscuGain — CLAUDE.md

App de suivi musculation. **Local-first** (données dans `localStorage`, aucun backend).

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

## Conventions
- Charte : dark slate-900/800, accent blue-500/600, rounded-xl/2xl, `fade-in`, sémantique amber/green/red. Réutiliser Button/Card.
- Pas de lint installé localement → le gate de compilation est `npm run build`.
- Historique détaillé : `HISTORIQUE.MD`.
