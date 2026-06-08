# Historique - Synthèse des actions récentes (MuscuGain)

Ce fichier contient un résumé concis des dernières conversations.

---
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
