# P4 — Suivi corporel élargi : design

Date : 2026-06-12. Statut : approuvé (approche A, périmètre complet P4).

## Objectif

Compléter l'onglet Analyse avec le suivi corporel chiffré et enrichir l'historique
d'entraînement avec le 1RM estimé et la progression par exercice. Tout local-first
(localStorage), zéro backend.

Périmètre (4 items ROADMAP P4) :
1. Poids corporel + mensurations avec courbes.
2. Timeline corporelle enrichie (analyses IA + poids + volume superposés).
3. 1RM estimé (Epley) + détection de PR « force ».
4. Graphique de progression par exercice.

## Décisions de cadrage

- Saisie dans l'onglet **Analyse** (vue BodyAnalysis), pas sur le Dashboard.
- **1 entrée par jour max** : re-saisie le même jour = écrase l'entrée du jour.
- **4 champs fixes** : poids (kg, requis), tour de bras / taille / cuisses (cm, optionnels).
- Approche **A** : composant `LineChart` générique nouveau pour les 3 courbes.
  `VolumeChart` (bar chart) **non modifié** — zéro risque de régression.
- Pas de lib externe de chart (philosophie SVG maison, bundle léger).

## Architecture

### 1. Données — `src/utils/measurements.core.js` (pur, testé)

- Modèle : `{ date: 'YYYY-MM-DD', weight: number, arms?: number, waist?: number, thighs?: number }`
- `upsertMeasurement(list, entry)` → nouvelle liste triée chrono, écrase l'entrée du même jour.
- `parseMeasurementInput(raw)` → `{ ok, entry }` ou `{ ok: false, error }`.
  Validation : poids requis > 0 ; champs cm optionnels > 0 si présents ; virgule
  décimale acceptée (`'82,5'` → 82.5) ; bornes sanité (poids 20–400 kg, cm 10–300).
- Persistance : clé `localStorage.muscuGainMeasurements`, état géré dans App.jsx
  (même pattern que `bodyAnalyses`).

### 2. 1RM + PR force — extension `src/utils/records.core.js`

- `epley1RM(weight, reps)` = `weight × (1 + reps/30)`, arrondi au 0.5 kg ; `reps === 1` → poids.
- `compute1RMs(history)` → `{ [exName]: best1RM }` sur les séries `done` uniquement.
- `detectRepPRs(historyBefore, newEntry)` → PR « force » : plus de reps réalisées à
  poids supérieur ou égal au meilleur poids historique de l'exercice.
- Affichage :
  - History (accordéon) : ligne « 1RM est. : X kg » par exercice.
  - Cooldown : bannière PR force 💪, distincte de la bannière PR poids 🏆 existante.

### 3. Composant `src/components/ui/LineChart.jsx` (générique)

- Props : `{ series: [{ label, color, points: [{ x: dateISO, y: number }] }], unit, height? }`.
- SVG même gabarit que VolumeChart (viewBox 320×120, pad 8), polyline + points,
  min/max affichés, dates début/fin en pied.
- Axe X = temps réel (mesures irrégulières → espacement proportionnel, pas index).
- Multi-séries pour la timeline superposée (normalisation 0–1 par série quand les
  unités diffèrent, légende par couleur).
- Logique pure (échelle, normalisation, mapping points→coords) extraite dans
  `src/utils/chart.core.js`, testée.
- Cas < 2 points : message « Pas assez de données » (même pattern que VolumeChart).

### 4. Vue Analyse (`src/views/BodyAnalysis.jsx`)

- Nouvelle section « Mes mesures » :
  - Formulaire 4 champs + bouton enregistrer, extrait en
    `src/components/MeasurementForm.jsx` (BodyAnalysis fait déjà 477 lignes).
  - Courbe poids (LineChart) + sélecteur de mensuration (bras/taille/cuisses) pour
    la deuxième courbe.
- **Timeline enrichie** : la frise des analyses IA existante reçoit en plus les
  points poids et le volume d'entraînement hebdomadaire moyen, superposés via
  LineChart multi-séries (normalisation par série).
- Si BodyAnalysis dépasse ~550 lignes, extraire d'autres sous-composants.

### 5. Graphique par exercice (`src/views/History.jsx`)

- Sélecteur d'exercice (exos présents dans l'historique, triés alpha).
- LineChart : poids max par séance pour l'exo choisi + série 1RM estimé.

## Erreurs & cas limites

- Formulaire : champs invalides → message inline amber, pas de toast d'erreur bloquant.
- Historique vide / exo sans série `done` : sections chart masquées ou message
  « pas assez de données ».
- Suppression d'une mesure : icône corbeille sur la liste des mesures (avec
  ConfirmationModal, pattern existant).

## Tests (gate : `npm run build` + `node --test`)

- `measurements.core.test.js` : upsert (écrasement même jour, tri), parse
  (virgule, bornes, champs optionnels).
- `records.core.test.js` (extension) : epley1RM (arrondi, reps=1), compute1RMs
  (ignore non-done), detectRepPRs (reps↑ à poids égal, poids↑, faux positifs).
- `chart.core.test.js` : échelle X temps réel, normalisation multi-séries, min/max.

## Hors périmètre

- IndexedDB (reporté depuis P3), export de données, intégration des mesures dans
  le coach IA backend (itération future), mode clair.
