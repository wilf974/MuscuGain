# Mode entraînement libre + reconnaissance de machine par photo — Design

**Date :** 2026-06-09
**Statut :** Validé (en attente revue spec)
**Feature A** (la feature B « onglet Suivi photos de soi » est décomposée et traitée séparément).

## Objectif

Permettre une séance **hors programme prédéfini** (séance libre), pendant laquelle l'utilisateur,
devant une machine de salle qu'il ne connaît pas, prend une **photo** ; le backend IA vision
(`muscugain-ai`, modèle `nvidia/nemotron-nano-12b-v2-vl`) identifie l'exercice et propose les
3 candidats les plus probables parmi les exercices connus de l'app. L'utilisateur en choisit un,
qui est ajouté à la séance en cours.

## Principe directeur

La séance Workout **supporte déjà** l'ajout d'exercices à la volée via `AddExerciseModal`
(câblé dans `Workout.jsx` et `CreateRoutine.jsx`). On ne réinvente rien :
- la **reco photo** se greffe dans `AddExerciseModal` → disponible partout où on ajoute un exo,
  sans duplication ;
- le **mode libre** = simplement démarrer une séance avec une routine vide.

## Architecture

### Frontend

#### 1. `src/utils/recognizeMachine.core.js` (logique pure, testable)
- `flattenExercises(db)` → tableau plat de tous les noms d'exercices (toutes catégories de `EXERCISES_DB`).
- `normalizeResult(json)` → `{ label: string|null, candidates: [{exercise, confidence}] }`
  - filtre les candidats sans `exercise`, borne à 3, `confidence` → `Number` ou `null`,
  - tolère un JSON malformé/partiel (retourne `{label:null, candidates:[]}`).

#### 2. `src/utils/recognizeMachine.js` (wrapper IO navigateur)
- `fileToDataUrl(file, max=768, quality=0.72)` : `File` → `<canvas>` (resize côté client, ratio conservé) → dataURL JPEG.
- `recognizeMachine(file, allowedExercises)` :
  - `fileToDataUrl` → `POST /api/recognize-exercise` `{ image, allowedExercises }`,
  - retourne `normalizeResult(json)` ; lève une erreur typée selon le statut HTTP (voir Gestion d'erreurs).

#### 3. `src/components/modals/AddExerciseModal.jsx` (modifié)
- En tête de modal : bouton **« 📷 Identifier par photo »** + `<input type="file" accept="image/*" capture="environment">` caché.
- États internes : `idle` → `loading` (spinner) → `results` (panneau 3 candidats : nom + barre de confiance, tap = `onSelect(exercise)`) → `error` (message + retry).
- La **liste manuelle catégorisée reste toujours visible en dessous** (fallback permanent).
- Un candidat déjà présent dans la séance est marqué « ✓ Ajouté » (réutilise `existingExercises`).

#### 4. `src/views/Dashboard.jsx` (modifié)
- Bouton **« Séance libre »** (à côté de la liste des programmes). Appelle un nouveau handler `startFreeSession`.

#### 5. `src/App.jsx` (modifié)
- `startFreeSession()` : `setActiveRoutine({ name: 'Séance libre', exercises: [], isCustom: false })`,
  `setWorkoutData({})`, puis flux existant `setup → warmup → workout`.
- Passé en prop à `Dashboard`.
- L'historique fonctionne sans changement : `saveAndExit` enregistre `routineName: 'Séance libre'`,
  `workoutData` est indexé par nom d'exercice comme aujourd'hui.

### Backend / déploiement

#### `docker-compose.yml`
Ajout d'un service :
```yaml
  muscugain-backend:
    build: ./backend
    container_name: muscugain-backend
    env_file: backend/.env
    security_opt:
      - no-new-privileges:true
    expose:
      - 8000          # interne au réseau Docker uniquement, AUCUN port host
    networks:
      - vps-network
    restart: unless-stopped
```
(healthcheck déjà défini dans `backend/Dockerfile`.)

#### `nginx-container.conf`
Ajout, avant le bloc SPA `location /` :
```nginx
    location /api/ {
        proxy_pass http://muscugain-backend:8000/;   # le préfixe /api/ est strippé
        client_max_body_size 10m;                      # backend bodyLimit = 8MB
        proxy_read_timeout 90s;                         # appel modèle ~lent
    }
```
Le front appelle `/api/recognize-exercise` en **relatif, même origine** → pas de CORS, pas de mixed-content.
Le reverse proxy VPS route déjà le domaine → `muscugain-app:80`.

## Flux de données

```
[Workout/AddExerciseModal] --photo File--> fileToDataUrl (canvas, 768px, JPEG)
   --POST /api/recognize-exercise {image, allowedExercises}--> [nginx /api/ proxy]
   --> [muscugain-backend :8000] --> NVIDIA NIM (nemotron-nano-12b-v2-vl)
   --> {label, candidates[3]} --> normalizeResult --> panneau candidats
   --tap--> onSelect(exercise) --> addExerciseToSession (logique existante)
```

## Gestion d'erreurs (affichées dans la modal, liste manuelle toujours dispo)

| Cas | Message |
|-----|---------|
| 503 (clé non configurée) / 502 / 504 / réseau | « Reconnaissance indisponible, choisis manuellement. » |
| 429 (rate-limit) | « Trop de tentatives, réessaie dans 1 min. » |
| `candidates` vide | « Machine non reconnue, choisis manuellement. » |
| Annulation du sélecteur de fichier | no-op (retour à `idle`) |
| Pendant l'appel | spinner + bouton désactivé |

## Tests

- **`recognizeMachine.core.test`** (assertions Node, même style que `parseWorkbook`) :
  flatten complet, normalize sur réponse normale / sans `label` / candidats > 3 (troncature) /
  `confidence` manquante / JSON vide.
- **Gate compilation** : `npm run build` (pas de lint installé).
- **Post-déploiement** (navigateur, gstack) : la séance libre démarre, la modal rend le bouton photo,
  `GET /api/health` répond `200` via le proxy nginx.

## Hors scope (YAGNI)

- Pas de création d'exercice hors `EXERCISES_DB` (le modèle mappe sur `allowedExercises` envoyé).
- Pas de stockage/historisation des photos de machine (éphémères).
- Onglet « photos de soi » = **feature B**, spec séparé.
- Pas de warmup auto-skip en mode libre (l'utilisateur peut mettre 0 dans `SessionSetup`).
