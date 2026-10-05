# MuscuGain — CLAUDE.md

App de suivi musculation. **Local-first** (données dans `localStorage`). Backend optionnel `backend/` : passerelle IA vision pour reconnaître un exercice depuis une photo de machine (aucune donnée utilisateur stockée côté serveur).

## Stack
Vite 7 + React 19 + Tailwind 3 + lucide-react. Build statique servi par nginx (Docker).

## Déploiement
- Container `muscugain-app`, `127.0.0.1:8080->80`, réseau externe `vps-network` (reverse proxy VPS).
- Projet compose `muscugain`, service `muscugain`, `/opt/apps/MuscuGain/docker-compose.yml`.
- Deploy : `docker compose up -d --build` (Dockerfile multi-stage : `npm ci` + `vite build` → nginx).
- nginx : `nginx-container.conf` + `nginx-security-headers.conf` (CSP stricte, inclus dans CHAQUE location — `add_header` n'est pas hérité). Toute nouvelle origine externe (img/iframe/fetch) doit être ajoutée à la CSP.
- Rate-limit backend par IP via `X-Real-IP` posé par le proxy VPS : ne PAS le réécrire dans `location /api/` du nginx conteneur.

## Structure `src/`
- `App.jsx` — routeur de vues (`dashboard|history|body|create|session`) + état métier (historique, programmes, mesures, analyses), modales ; vues lourdes en `lazy()`.
- `hooks/useWorkoutSession.js` — machine de séance (setup→warmup→workout→cooldown) : état unique persisté à chaque changement dans `muscuGainActiveSession` (format compatible ancienne version + `sessionId`, `workoutEndTime`), timers dérivés de timestamps (recalcul `visibilitychange`), ajout d'exo idempotent, reprise.
- `components/scanner/ScannerSheet.jsx` — scanner de machine ; `components/ui/Sheet.jsx` (modale accessible, à utiliser pour toute nouvelle modale), `IconButton` (44 px + aria-label), `Button` (variants primary/secondary/soft/danger/ghost/success/warning).
- `views/` — Dashboard, SessionSetup, Warmup, Workout, Cooldown, History, CreateRoutine, **BodyAnalysis**.
- `components/` — ui/ (Button, Card, **VolumeChart**, **LineChart** : courbe SVG générique multi-séries/markers/`normalizeEach`), modals/ (Confirmation, AddExercise, Video, ImportRoutine), **MeasurementForm**, NavBar (Accueil · Historique · [bouton central : Scanner, ou Séance si une séance est en cours] · Analyse), InstallPrompt (bandeau compact iOS/Android), InstallHelp, Onboarding, SettingsSheet, OfflineBanner, ExerciseDetails, CatalogPicker.
- `data/` — exercises.js (`EXERCISES_DB` par groupe + `MUSCLE_LABELS`), routines.js (`DEFAULT_ROUTINES`), videos.js.
- `hooks/` (useAlarm, useWorkoutSession, useOnlineStatus, useNow), `utils/` (format.js, parseWorkbook.{core.,}js, recognizeMachine.{core.,}js, records.core.js, analyzeBody.{core.,}js, measurements.core.js, chart.core.js, timeline.core.js, **dates.core.js**, **stats.core.js**, **session.core.js**, **storage.{core.,}js**, **scanner.core.js**, theme.js, platform.js), `data/safety.js` (conseils sécurité par groupe).

## Stockage & migration
- Toujours passer par `utils/storage.js` (`load`/`save`/`KEYS`) : lecture tolérante (JSON corrompu → fallback), `save` renvoie `false` si quota (App affiche un toast).
- Schéma versionné `muscuGainSchemaVersion` (actuel **2**). `runMigrations()` dans `main.jsx` avant le 1er rendu ; `migrateStorage` idempotent : ids de séance (`h_<ts>_<i>`), sauvegarde brute `muscuGainHistoryBackupV1`, JSON illisible → `muscuGainHistoryCorrupt`. Tout changement de schéma = nouvelle étape de migration + test.
- Historique : entrées `{ id, date (ISO instant), routineName, exercises, totalVolume, durationSeconds, notes }`, triées récent→ancien, upsert par `id` (reprise d'une séance terminée < 2 h = même `sessionId` → remplacée, pas dupliquée).
- **Dates** : instants en ISO, mais tout « jour »/« semaine » via `dates.core` (`localDateKey`, `localWeekKey`, `toTime` pour 'YYYY-MM-DD' local). Jamais `toISOString().slice(0,10)`.
- Autres clés : `muscuGainTheme` (dark|light|system, défaut dark), `muscuGainOnboarded`, `muscuGainInstallDismissed`.

## iPhone / PWA
- Safe-area : conteneur `pt-[max(1rem,env(safe-area-inset-top))]`, en-têtes collants `top-safe`, utilitaires `pb-safe`/`pb-nav`/`bottom-nav` (index.css). Status bar `black-translucent` + bande sombre fixe derrière.
- Thème : palettes Tailwind = variables CSS (`tailwind.config.js`), `html.theme-light` les inverse ; texte sur fond d'accent plein = `text-onaccent` (jamais `text-white`, qui devient l'encre foncée en clair). `public/theme-init.js` évite le flash.
- iOS : `input.click()` d'un `<input type=file>` uniquement dans le geste utilisateur (pas de `setTimeout`) ; inputs ≥ 16 px ; poids en `inputMode="decimal"` (virgule → point).
- SW : `/api/*` NetworkOnly, aucune règle de cache runtime (ni réponses IA, ni photos, ni YouTube).

## Historique & records
- History : accordéon par séance (poids/reps par série, 1RM estimé par exo), graphique SVG volume (`VolumeChart`, 30 dernières), badge 🏆 sur séries record, **graphique progression par exercice** (sélecteur → poids max + 1RM estimé).
- Records (`utils/records.core.js`) : `computePRs`/`detectNewPRs` (PR poids = poids max série `done`, bannière 🏆 Cooldown) + `epley1RM`/`compute1RMs`/`detectRepPRs` (PR force = plus de reps au poids max, bannière bleue 💪 Cooldown).
- Pas d'export/import JSON (retiré : illisible néophyte, données non exposées).

## Mesures corporelles (section « Mes mesures », onglet Analyse)
- `utils/measurements.core.js` : `parseMeasurementInput` (poids requis 20–400 kg, bras/taille/cuisses optionnels 10–300 cm, virgule décimale), `upsertMeasurement` (1/jour, écrase), `toPoints`. Clé `localStorage.muscuGainMeasurements`.
- UI : `MeasurementForm` + courbe poids + sélecteur mensuration + 5 dernières (suppression confirmée). Timeline enrichie « Évolution globale » : poids + volume hebdo (`utils/timeline.core.js`, semaine ISO UTC) superposés normalisés, markers = analyses IA.

## Analyse corporelle (onglet « Analyse », `view 'body'`)
- Backend `POST /analyze-body` (`backend/server.js`) : photo → NVIDIA NIM → `{morphotype, balance, bodyFatRange, strengths[], weaknesses[], trainingAdvice[], evolutionNote}`. Coach fitness, **non médical**. Photo non journalisée.
- Front : `utils/analyzeBody.{core.,}js` (`normalizeBodyAnalysis`, `analyzeBody`, `AnalyzeBodyError`), vue `BodyAnalysis.jsx` (consentement, capture caméra/galerie, résultats, timeline).
- **Vie privée** : photo envoyée à l'IA mais **jamais conservée** (ni serveur ni localStorage). Seul le résultat texte stocké : `localStorage muscuGainBodyAnalyses`. Consentement : `muscuGainBodyConsent`. Disclaimer non médical affiché.

## Modèle programme (routine)
`{ id, name, desc, exercises: [{ name, targetSets, targetReps, startingWeight, restSeconds? }], isCustom }`
- Programmes perso : localStorage `muscuGainCustomRoutines`. Exemples : `DEFAULT_ROUTINES`.
- `restSeconds` (optionnel) : pause par exercice ; sinon fallback global 60s (`restDuration` dans App.jsx).

## Import Excel (.xlsx)
- Bouton "Importer" sur le Dashboard → `ImportRoutineModal`.
- **1 feuille = 1 programme** nommé d'après la feuille. Colonnes : **A**=exercice (verbatim), **B**=séries, **C**=reps, **D**=pause (minutes → `restSeconds`).
- Auto-détection ligne d'en-tête (si B et C non numériques sur la 1ère ligne). Conflit de nom → **écrase** l'existant. Aperçu avec cases à cocher avant création.
- Lib : `read-excel-file@9` (import depuis `read-excel-file/browser`). Logique de parsing pure et testable dans `parseWorkbook.core.js`.

## Reco machine (photo → exercice)
- Photo `1280px/0.85` (OCR lisible). Prompt OCR-first : lit le texte de la plaque → exo n°1. Peut proposer un exo **hors-liste** (avec `muscleGroup`).
- Catalogue perso `src/data/customExercises.js` (`localStorage.muscuGainCustomExercises`) : exos hors-liste choisis y sont ajoutés (classés par groupe musculaire), enrichissent la liste manuelle (AddExerciseModal + CreateRoutine via `mergedCatalog`) et l'`allowedExercises` des prochaines reco (`allKnownNames`). Dédup insensible à la casse, collisions avec le catalogue intégré ignorées.

## Backend IA vision (`backend/`)
- Fastify (ESM, `node server.js`), `POST /recognize-exercise` `{image: dataURL|base64, allowedExercises?: string[]}` → `{label, candidates: [{exercise, confidence}]×3}`. `GET /health`. Rate-limit 30/min, bodyLimit 8MB.
- Modèle : **`nvidia/nemotron-nano-12b-v2-vl`** (NVIDIA NIM). Choisi par benchmark (cf. HISTORIQUE 09/06) : llama-3.2-90b refuse les photos avec personnes, llama-4-maverick timeout. Surcharge via `NVIDIA_MODEL`.
- Env : `backend/.env` (`NVIDIA_API_KEY`, `NVIDIA_MODEL`, `PORT=8000`). `.env` non committé (clé).
- ⚠️ Confidences candidats 2/3 mal calibrées → se fier à l'ordre, pas à la valeur absolue.
- **Intégré et déployé** : service `muscugain-backend` (compose, `expose:8000`, interne `vps-network`) + nginx `location /api/` (proxy strip, `client_max_body_size 10m`). Front appelle `/api/recognize-exercise` en relatif.
- Front : `src/utils/recognizeMachine.{core.,}js` (core pur testé + IO canvas/fetch, AbortSignal + délai 60 s, erreurs offline/timeout/cancelled/invalid via `recognizeErrorKind`) + `utils/scanner.core.js` (`classifyRecognition` : high = n°1 connu du catalogue ET confiance ≥ 0.75, sinon choix à confirmer ; `exerciseInfo` ; `videoIdFor` n'accepte que les IDs YouTube valides du mapping). UI : `ScannerSheet` (entrées : onglet central NavBar, carte Dashboard, en-tête Workout, `AddExerciseModal`, raccourci `/?action=scan`).

## Mode séance libre
- Bouton « Séance libre » sur le Dashboard (`App.startFreeSession` → `ws.startFree`) ; le scanner hors séance démarre aussi une séance libre avec l'exo confirmé → routine vide `{name:'Séance libre', exercises:[]}` → flux setup→warmup→workout. Ajout d'exos à la volée (manuel ou photo) pendant la séance. Historisé comme une séance normale (`routineName:'Séance libre'`).

## Roadmap (détail : `ROADMAP.md`)
Vision : coach de muscu pour néophyte — l'IA digère les données, l'utilisateur ne manipule jamais de JSON.
- **P1 Confort séance** ✅ livré : suppr. série en séance, éditer (crayon, garde id)/réordonner (↑↓)/dupliquer programme, champ « Pause (s) » par exo dans CreateRoutine, toasts (`ui/Toast.jsx` : `ToastProvider`+`useToast`), notes séance (`entry.notes` Cooldown→History).
- **P2 Coach IA** ⭐ ✅ livré : `POST /coach-analysis` (résumé historique → bilan : progression/plateaux/volume/équilibre/deload + `bodyCross` corps×training) carte Dashboard cache 1/jour ; `POST /generate-program` (objectif → routine, noms validés) via `GenerateProgramModal` ; suggestion de charge Workout (`suggestLoad`). Utils : `coach.{core.,}js`, `categoryOf` (`data/exercises.js`). Clé cache : `muscuGainCoachAnalysis`.
- **P3 PWA/résilience** ✅ livré (sauf IndexedDB, reporté) : PWA via vite-plugin-pwa (SW Workbox autoUpdate, offline, `/api/*` NetworkOnly + denylist), installable (icônes locales `public/pwa-*.png`+`icon.svg`, manifest généré), `utils/persistence.js` (`storage.persist()` au boot), `utils/reminder.js` (rappels Notification opt-in, seuil 3j, testé). nginx : `sw.js`/`manifest` no-cache. Clés : `muscuGainReminders`, `muscuGainLastReminder`.
- **P4 Suivi corporel+** ✅ livré : mesures + courbes (`measurements.core`, `LineChart`, `MeasurementForm`), timeline enrichie (poids×volume hebdo, markers IA), 1RM Epley + PR force (`records.core`), graphique progression par exercice (History).
- **iPhone/PWA v2** ✅ livré 2026-10-05 (branche `feature/iphone-pwa-v2`) : shell iPhone (safe-area, thème clair, a11y, Sheet), scanner 2 taps, useWorkoutSession, migration v2, dates locales, dashboard prochaine action, onboarding, CSP. Points « à valider sur iPhone » : HISTORIQUE 05/10/2026.
- **P5 Backend/qualité** : ✅ tests backend `lib.js`, rate-limit par IP, headers nginx, `useWorkoutSession`. Reste : fetch injecté, fallback modèle, CI, Tailwind 4 (audit).
- **P6 Polish** : ✅ mode clair, onboarding, a11y de base. Reste : sons, transitions, notif repos écran verrouillé.
`TODO.md` = obsolète (pointeur vers ROADMAP).

## Conventions
- Charte : dark slate-900/800, accent blue-500/600, rounded-xl/2xl, `fade-in`, sémantique amber/green/red. Réutiliser Button/Card.
- Gate qualité : `npm run check` (= `eslint src` + `node --test "src/**/*.test.js"` + `vite build`) ; backend : `cd backend && npm test`.
- Windows : si npm échoue avec « 'node' n'est pas reconnu », le PATH dépasse la limite de cmd.exe → dédoublonner `$env:Path` dans la session.
- Historique détaillé : `HISTORIQUE.MD`.
