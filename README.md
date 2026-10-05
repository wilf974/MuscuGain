# MuscuGain

Application de suivi de musculation **local-first**, pensée pour l'iPhone en **PWA** (écran d'accueil, plein écran, hors ligne), sans App Store ni Mac.

- Séances guidées (programmes, séance libre, échauffement, minuteur de repos, récupération), historique, records, graphiques.
- **Scanner une machine** : photo → exercice probable, muscles, conseils de sécurité, démo vidéo, ajout direct à la séance.
- Coach IA (bilan d'historique, génération de programme) et analyse corporelle IA avec consentement.
- Données **sur l'appareil** (`localStorage`). Les photos sont envoyées à l'IA pour l'analyse puis oubliées : jamais stockées, jamais mises en cache.

## Démarrer en local

```bash
npm ci
npm run dev        # http://localhost:5173 (le scanner/coach nécessitent le backend sur /api)
npm run check      # lint + tests + build (gate de qualité)
```

| Script | Rôle |
|---|---|
| `npm run build` | Build statique Vite + service worker (Workbox) dans `dist/` |
| `npm test` | Tests unitaires `node --test` (`src/**/*.test.js`) |
| `npm run lint` | ESLint (`src/`) |
| `npm run preview` | Sert `dist/` (test PWA/offline) |
| `cd backend && npm test` | Tests de la passerelle IA (`backend/lib.test.js`) |

Backend optionnel (`backend/`, Fastify) : passerelle vers NVIDIA NIM. Variables dans `backend/.env` (voir `backend/.env.example`, **ne jamais committer la clé**).

## Installer sur iPhone

1. Ouvrir le site dans **Safari**.
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. Lancer MuscuGain depuis l'icône : plein écran, fonctionne hors ligne (séances, programmes, historique). Le scanner et le coach IA ont besoin du réseau.

L'aide d'installation est aussi dans l'app (bandeau, présentation au 1er lancement, Réglages).

## Architecture rapide

```
src/
  App.jsx                    routeur de vues + état métier (historique, programmes, mesures…)
  hooks/useWorkoutSession.js machine de séance persistée (timers basés sur l'heure)
  components/scanner/        scanner de machine (ScannerSheet)
  components/ui/             Sheet (modale accessible), Button, IconButton, Toast, charts SVG
  utils/*.core.js            logique pure testée (dates locales, stats, séance, stockage/migration, scanner…)
  views/                     Dashboard, Workout, History, BodyAnalysis, CreateRoutine…
backend/                     Fastify : /recognize-exercise, /analyze-body, /coach-analysis, /generate-program
```

Stockage : clés `muscuGain*` dans `localStorage`, schéma versionné (`muscuGainSchemaVersion`, migration idempotente au démarrage avec sauvegarde `muscuGainHistoryBackupV1`).

## Déploiement

Docker multi-stage (build Vite → nginx) + service backend, derrière le reverse proxy du VPS : voir `README-DOCKER.md`, `README-VPS.md` et la section « Déploiement » de `CLAUDE.md`. Les en-têtes de sécurité (CSP…) sont dans `nginx-security-headers.conf`.

Suivi : `ROADMAP.md` (phases), `HISTORIQUE.MD` (journal des changements).
