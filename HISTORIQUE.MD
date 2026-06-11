# Historique - Synthèse des actions récentes (MuscuGain)

Ce fichier contient un résumé concis des dernières conversations.

---
### 10/06/2026 — Onglet Analyse corporelle (IA) + retrait export/import JSON
**Demande:** 2 temps. (1) Enchaîner 4 features (export/import JSON, histo détaillé, graphique volume, records PR). (2) Pivot : retirer l'export/import JSON (illisible pour un néophyte, rien d'exposé à l'utilisateur) et construire un onglet d'**analyse corporelle par IA** (≠ reco machine).
**Résultat:** Histo détaillé + graphique volume + records PR conservés ; export/import JSON retiré ; nouvel onglet « Analyse » livré et déployé (workflow superpowers : brainstorm → spec → plan → subagent-driven TDD + reviews spec/qualité).

- **Histo détaillé** (`History.jsx`) : carte séance → accordéon inline poids/reps par série (✓ done), un seul ouvert.
- **Graphique volume** (`components/ui/VolumeChart.jsx`) : SVG maison (sans lib), volume total des 30 dernières séances, en tête de History.
- **Records PR** (`utils/records.core.js` : `computePRs`/`detectNewPRs`, 5 tests) : PR = poids max sur série `done` par exercice. Bannière 🏆 en fin de séance (`Cooldown.jsx`), badge 🏆 sur les séries record dans l'histo détaillé.
- **Retrait F1** : suppression boutons Exporter/Importer + modale + `utils/backup*`. Données restent en localStorage, aucune manipulation JSON par l'utilisateur.
- **Analyse corporelle** :
  - Backend : `POST /analyze-body` (`backend/server.js`) — photo → NVIDIA NIM `nemotron-nano-12b-v2-vl` → `{morphotype, balance, bodyFatRange, strengths[], weaknesses[], trainingAdvice[], evolutionNote}`. Prompt cadré coach fitness, **non médical**. Réutilise `extractJson`, timeout 60s, 502/504, normalisation (trim/cap 6). Photo non journalisée.
  - Front : `utils/analyzeBody.core.js` (`normalizeBodyAnalysis`, 3 tests) + `analyzeBody.js` (IO, réutilise `fileToDataUrl`, `AnalyzeBodyError`). Vue `views/BodyAnalysis.jsx` : consentement 1er usage (flag `muscuGainBodyConsent`), capture caméra directe + galerie, états idle/consent/loading/results/error, cartes résultats (forces vert / faiblesses amber / conseils blue), note d'évolution, **disclaimer non médical**, timeline accordéon des analyses passées.
  - **Vie privée** : photo envoyée à l'IA externe mais **jamais conservée** (ni serveur, ni localStorage). Seul le **résultat texte** est stocké (`muscuGainBodyAnalyses`). Consentement explicite obligatoire.
  - 4e onglet NavBar « Analyse » (`ScanLine`) → `view 'body'`. Wiring `App.jsx` (state, load, `addBodyAnalysis`, route).
- **Reviews** : spec compliance + qualité par sous-agents à chaque feature ; fixes appliqués (F1 re-merge état frais ; BodyAnalysis : CaptureButtons hors render, timeline key par date, consent idempotent).
- **Vérifs** : 15/15 tests core, `npm run build` OK, 2 containers `Up (healthy)`, HTTP 200, bundle contient les strings UI, e2e `/api/analyze-body` → JSON structuré complet (modèle **n'a pas refusé** la photo de personne). Vérif visuelle browser non faite (outils playwright MCP indisponibles).
**Fichiers créés:** `src/utils/analyzeBody.core.js` (+test), `src/utils/analyzeBody.js`, `src/views/BodyAnalysis.jsx`, `src/utils/records.core.js` (+test), `src/components/ui/VolumeChart.jsx`, specs + plans dans `docs/superpowers/`
**Fichiers modifiés:** `backend/server.js`, `src/App.jsx`, `src/components/NavBar.jsx`, `src/views/History.jsx`, `src/views/Cooldown.jsx`
**Fichiers supprimés:** `src/utils/backup.core.js` (+test), `src/utils/backup.js`, `src/components/modals/ImportBackupModal.jsx`

---
### 09/06/2026
**Demande:** Backend de reconnaissance d'exercice par photo de machine (passerelle vision IA) — reprise + choix du modèle.
**Résultat:** Backend `muscugain-ai` (Fastify) validé e2e ; modèle vision changé après benchmark.
- `backend/server.js` : Fastify + `@fastify/rate-limit` (30/min), `POST /recognize-exercise` (image base64 + `allowedExercises` → NVIDIA NIM → `{label, candidates[3]}`), `GET /health`, bodyLimit 8MB, timeout fetch 60s.
- **Benchmark** 5 images propres × 3 modèles vision NVIDIA NIM (appel direct, top-1 accuracy) :
  - `meta/llama-3.2-90b-vision-instruct` (ancien défaut) : 2/5, **refuse 3/5** photos avec personnes ("je ne peux pas vous aider") → bloquant.
  - `meta/llama-4-maverick-17b-128e` : 1/5, **4/5 timeouts >120s** → inutilisable.
  - **`nvidia/nemotron-nano-12b-v2-vl`** : **3/5**, 0 refus, 0 timeout, rapide → **retenu**.
- **Changement** : défaut modèle `meta/llama-3.2-90b-vision-instruct` → `nvidia/nemotron-nano-12b-v2-vl` dans `backend/.env`, `.env.example`, fallback `server.js`.
- **Vérifs** : `/health` → `model:nemotron-nano-12b-v2-vl, keyConfigured:true`. Recognize sur photo bench press → top `Chest Press Machine 0.95` (l'ancien sortait "Curl Barre").
- **Note** : confidences des candidats 2/3 mal calibrées (élevées même quand faux) → l'UI doit se fier à l'ordre, pas à la valeur.
**Fichiers modifiés:** `backend/server.js`, `backend/.env`, `backend/.env.example`

### 09/06/2026 — Mode entraînement libre + reco machine intégrés et déployés
**Demande:** Intégrer la reco photo dans l'app + mode séance libre (suite du backend ci-dessus). Décomposé en 2 features ; feature A livrée (B = « onglet Suivi photos de soi » à venir).
**Résultat:** Mode séance libre + reconnaissance de machine par photo livrés et déployés (workflow superpowers : brainstorm → spec → plan → subagent-driven TDD).
- `src/utils/recognizeMachine.core.js` : logique pure `flattenExercises` + `normalizeResult` (7 tests `node --test`, tous PASS).
- `src/utils/recognizeMachine.js` : IO navigateur — `fileToDataUrl` (canvas resize 768px/JPEG q0.72), `recognizeMachine()` (POST `/api/recognize-exercise`), `RecognizeError` (messages 503/502/504/429/empty/image).
- `AddExerciseModal` : bouton « 📷 Identifier par photo » + états idle/loading/results/error + panneau 3 candidats (barre de confiance), liste manuelle conservée en fallback. Signature props inchangée.
- Séance libre : `App.startFreeSession()` (routine vide `{name:'Séance libre', exercises:[]}`) + bouton sur le Dashboard (`!activeRoutine`). Réutilise le flux setup→warmup→workout et l'ajout d'exo à la volée existant.
- Déploiement : service `muscugain-backend` (compose, `expose:8000`, interne `vps-network`, env_file `backend/.env`) + nginx `location /api/` (proxy strip préfixe, `client_max_body_size 10m`, `proxy_read_timeout 90s`).
- **Vérifs** : 7/7 tests core, `npm run build` OK à chaque étape, 2 containers `Up (healthy)`, `/api/health` proxifié OK, e2e `/api/recognize-exercise` via nginx → `Chest Press Machine 0.95`, bundle déployé contient les 4 strings UI.
**Fichiers créés:** `src/utils/recognizeMachine.core.js`, `src/utils/recognizeMachine.core.test.js`, `src/utils/recognizeMachine.js`, specs + plan dans `docs/superpowers/`
**Fichiers modifiés:** `src/components/modals/AddExerciseModal.jsx`, `src/App.jsx`, `src/views/Dashboard.jsx`, `docker-compose.yml`, `nginx-container.conf`

### 08/06/2026
**Demande:** Importer un .xlsx multi-feuilles pour créer des programmes (1 feuille = 1 programme nommé d'après la feuille ; A=exercice, B=séries, C=reps, D=temps de pause en minutes).
**Résultat:** Fonctionnalité d'import xlsx livrée et déployée.
- Lib `read-excel-file@9` (build `/browser`, sans CVE ; les vulns npm audit sont des dev-deps préexistantes vite/rollup/postcss, hors build prod).
- `src/utils/parseWorkbook.core.js` : logique pure (auto-détection en-tête, A→name verbatim, B→targetSets, C→targetReps, D minutes→`restSeconds`, fallback 60s). `parseWorkbook.js` : wrapper IO.
- `src/components/modals/ImportRoutineModal.jsx` : sélection fichier → aperçu (feuilles cochables, nb exos, badge "écrase l'existant", warnings, feuilles vides désactivées) → création.
- `App.jsx` : `importRoutines()` (écrasement par nom), `startRestTimer(seconds)` paramétrable.
- `Workout.jsx` : timer de repos utilise `restSeconds` de l'exo (fallback global 60s).
- `Dashboard.jsx` : bouton "Importer" à côté de "Créer".
- **Tests** : 11 assertions sur vrai xlsx généré (en-tête skippé, 2min→120s, 1.5→90s, 1→60s, pause vide→fallback, feuille sans en-tête non skippée, feuille vide→0 exo) — toutes PASSENT.
- **Vérifs** : `npm run build` OK, container `muscugain-app` recréé healthy, nginx sert le nouveau bundle (HTTP 200).
**Fichiers créés:** `src/utils/parseWorkbook.js`, `src/utils/parseWorkbook.core.js`, `src/components/modals/ImportRoutineModal.jsx`
**Fichiers modifiés:** `src/App.jsx`, `src/views/Dashboard.jsx`, `src/views/Workout.jsx`, `package.json`

### 04/02/2026 16:21
**Demande:** Avis sur le projet MuscuGain
**Résultat:** Projet d'application de suivi musculation. Analyse du code et de l'architecture effectuée.
