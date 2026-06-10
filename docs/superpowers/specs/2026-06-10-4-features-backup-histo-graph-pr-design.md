# Design — 4 features MuscuGain (backup, histo détaillé, graphique, records PR)

Date : 2026-06-10
Statut : approuvé

## Contexte

App local-first (localStorage). Stack Vite 7 + React 19 + Tailwind 3 + lucide-react.
4 features TODO enchaînées. Toutes côté frontend, aucune touche au backend IA vision.

### Modèle de données existant
- `localStorage.muscuGainHistory` : `[ { date(ISO), routineName, exercises: { [nom]: [{weight, reps, done}] }, totalVolume, durationSeconds } ]` (plus récent en tête).
- `localStorage.muscuGainCustomRoutines` : `[ { id, name, desc, exercises:[{name,targetSets,targetReps,startingWeight,restSeconds?}], isCustom } ]`.
- `App.jsx` : état global `history`, `customRoutines` ; persistance manuelle via `localStorage.setItem`.

## Décisions verrouillées
1. Import JSON → **fusion** (non destructif).
2. Histo détail → **accordéon inline** dans History.
3. Graphique → **SVG maison** sans librairie (bundle léger).
4. PR → **poids max par exercice** (série `done`).

---

## F1 — Export / Import JSON (priorité haute)

But : protéger contre perte localStorage. Sauvegarde + restauration historique et programmes.

### Modules
- `src/utils/backup.core.js` (pur, testé) :
  - `buildBackup({ history, customRoutines })` → `{ app:'MuscuGain', version:1, exportedAt:ISO, history, customRoutines }`.
  - `validateBackup(obj)` → throw `Error` si `app !== 'MuscuGain'`, `version` absent, ou `history`/`customRoutines` non-array.
  - `mergeBackup({ history, customRoutines }, imported)` → fusion :
    - history : concat des séances importées dont `date` n'existe pas déjà (clé = `date`), puis tri décroissant par `date`.
    - customRoutines : écrase par `name` (importé gagne), conserve les non-conflictuels.
    - retourne `{ history, customRoutines, stats:{ addedSessions, overwrittenRoutines, addedRoutines } }`.
- `src/utils/backup.js` (IO navigateur) :
  - `downloadBackup(backupObj)` → `Blob` JSON, `<a download>` nom `muscugain-backup-YYYY-MM-DD.json`.
  - `readBackupFile(file)` → `Promise<obj>` (FileReader + JSON.parse, throw message lisible si parse échoue).

### UI
- `Dashboard.jsx` : 2 boutons — « Exporter » (déclenche download direct) et « Importer données » (ouvre modale).
- `src/components/modals/ImportBackupModal.jsx` : input file → lecture → `validateBackup` → aperçu (N séances importées, M programmes, X conflits écrasés) → bouton « Fusionner ». Erreur fichier invalide affichée.
- `App.jsx` : `exportData()` (build + download), `importData(importedObj)` (merge + setState + persist 2 clés).

### Erreurs
- Fichier non-JSON / schéma invalide → message dans la modale, pas de mutation.

---

## F2 — Historique détaillé (priorité haute)

But : voir poids/reps de chaque série d'une séance passée.

- `History.jsx` : chaque carte séance devient cliquable (bouton/zone). State local `expandedIndex` (un seul ouvert à la fois, toggle).
- Détail déplié (accordéon inline sous la carte) : pour chaque exercice de `entry.exercises`, ligne titre exercice + tableau séries `poids kg × reps` avec coche ✓ si `done`. Séries vides (weight falsy) grisées.
- Charte : réutilise Card, fond slate-900, `fade-in` à l'ouverture. lucide ChevronDown/Up indicateur.
- Pas de nouveau composant lourd ; sous-rendu dans History.

---

## F3 — Graphique progression (priorité moyenne)

But : voir l'évolution du volume total par séance.

- `src/components/ui/VolumeChart.jsx` : SVG maison, pas de librairie.
  - Props : `history` (array). Prend les 30 dernières séances, ordre chronologique (ancien→récent).
  - Barres verticales, hauteur ∝ `totalVolume` (normalisé sur max). Accent `blue-500`, hover/focus = `blue-400`.
  - Axe X léger (labels rares : première/dernière date), pas d'axe Y chargé ; max affiché en légende.
  - `history` vide ou < 2 séances → message « Pas assez de données ».
  - viewBox responsive (`width=100%`), `preserveAspectRatio`.
- Placé en tête de `History.jsx` (au-dessus de la liste).

---

## F4 — Records personnels PR (priorité moyenne)

But : signaler un nouveau record de poids sur un exercice.

- `src/utils/records.core.js` (pur, testé) :
  - `computePRs(history)` → `{ [exName]: maxWeight }`. Parcourt toutes les séances, séries `done` avec `weight` numérique > 0 ; max par exercice. (Nombre — `Number(weight)`.)
  - `detectNewPRs(historyBefore, newEntry)` → `[{ exercise, weight }]` : pour chaque exercice de `newEntry`, meilleure série `done` ; si `> computePRs(historyBefore)[exercise]` (ou exercice jamais vu) → PR.
- Intégration `App.jsx` `saveAndExit` : calcule `detectNewPRs(history, newEntry)` AVANT d'ajouter `newEntry` à l'historique ; stocke la liste dans `lastFinishedSession.newPRs`.
- UI fin de séance (modale/écran « last session ») : badge 🏆 + liste exercices battus (`Nouveau record : Développé couché 80kg`).
- Histo détail (F2) : marque la/les série(s) atteignant le PR de l'exercice avec un badge 🏆. (Calcul à l'affichage via `computePRs` sur l'historique courant.)

---

## Tests & gate
- TDD `node --test` sur `backup.core.js` et `records.core.js` (cas : fusion dedup date, écrasement routine par nom, schéma invalide throw, PR poids max séries done, PR exercice jamais vu, séries non-done ignorées).
- VolumeChart + accordéon = vérif build + visuel.
- Gate compilation : `npm run build` à chaque feature.

## Ordre d'implémentation
F1 → F2 → F4 → F3. (F4 réutilise le rendu détail de F2 ; F3 indépendant en dernier.)
Déploiement Docker unique en fin (`docker compose up -d --build`), vérif 2 containers healthy + bundle servi.

## Hors scope (YAGNI)
- Pas de sync cloud, pas de format CSV, pas de 1RM estimé, pas de tooltip riche sur le graphique, pas de sélection d'exercice dans le graphique (volume global seulement).
