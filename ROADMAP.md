# MuscuGain — Roadmap

Mise à jour : 2026-10-05. Vision : **le coach de musculation dans la poche d'un néophyte** — l'app observe, l'IA conseille, l'utilisateur ne manipule jamais de données techniques.

## Principes produit
1. **Néophyte d'abord** : zéro jargon, zéro manipulation de fichiers, l'IA digère le JSON à sa place.
2. **Local-first & privé** : données sur l'appareil ; ce qui part vers l'IA est minimal, consenti, jamais conservé côté serveur.
3. **Une feature = un usage en salle réel** : tout doit servir pendant ou autour d'une séance.

---

## Phase 1 — Confort de séance (quick wins UX) ✅ LIVRÉ 2026-06-11
*Effort : faible. Valeur : immédiate, chaque séance.*

- [x] **Supprimer une série** pendant la séance (bouton ✕ par ligne, si >1 set).
- [x] **Éditer un programme existant** — CreateRoutine en mode édition (garde l'id), crayon sur la carte perso.
- [x] **Réordonner les exercices** d'un programme (flèches ↑/↓, ops par index).
- [x] **Dupliquer un programme** (copie + suffixe « (copie) »).
- [x] **Timer de repos éditable dans l'UI** — champ « Pause (s) » par exercice dans CreateRoutine → `restSeconds`.
- [x] **Toast de confirmation** — `ToastProvider` + `useToast` (save/édit/suppr/import).
- [x] **Notes par séance** — textarea en Cooldown, stockée (`entry.notes`), affichée dans l'histo détaillé.

## Phase 2 — Coach IA (le différenciateur) 🧠 ✅ LIVRÉ 2026-06-11
*Effort : moyen. Valeur : cœur de la vision « l'IA a accès au JSON ».*

- [x] **Bilan IA de l'historique** : `POST /coach-analysis` — résumé compact de l'historique (`buildHistorySummary`, pas le brut) → LLM → bilan (progression, plateaux, volume hebdo, équilibre, deload). Carte « Coach IA » sur le Dashboard, cache 1/jour.
- [x] **Croisement corps × training** : l'analyse corporelle (faiblesses) passée à `/coach-analysis` → champ `bodyCross` du bilan.
- [x] **Génération de programme par IA** : `POST /generate-program` — objectif en une phrase → routine (noms validés contre `EXERCISES_DB`), aperçu éditable (`GenerateProgramModal`) avant sauvegarde.
- [x] **Suggestion de charge** : puce « Suggéré : X kg » par exercice dans Workout (`suggestLoad`, +2.5 kg si reps cible atteintes), clic → remplit les séries non faites.
- Garde-fous : payload borné (résumé cap 15 exos/30 séances, objectif tronqué 300 char), noms validés serveur+client, prompt non médical, cache bilan 1/jour. Modèle : NIM `nemotron-nano-12b-v2-vl` (texte).

## Phase 3 — PWA & résilience des données 📱 ✅ LIVRÉ 2026-06-11 (sauf IndexedDB)
*Effort : moyen. Valeur : fiabilité (le localStorage est fragile) + usage salle sans réseau.*

- [x] **Service worker + offline complet** : vite-plugin-pwa (Workbox, `registerType:autoUpdate`), precache app shell, `/api/*` NetworkOnly (jamais de réponse IA périmée) + `navigateFallbackDenylist`.
- [x] **Installable** : manifest généré (icônes PNG locales 192/512/maskable + apple-touch, fini l'icône CDN externe).
- [x] **`navigator.storage.persist()`** : `utils/persistence.js`, appelé au démarrage (anti-éviction).
- [ ] **Migration localStorage → IndexedDB** — **reporté** (hors scope P3, localStorage protégé par persist() en attendant).
- [x] **Rappel de séance** : `utils/reminder.js` (pur testé : `daysSince`/`shouldRemind`, seuil 3j, 1/jour max) + Notification API opt-in (toggle Dashboard).
- nginx : `sw.js`/`manifest` en `no-cache` (anti-SW figé).

## Phase 4 — Suivi corporel élargi 📊 ✅ LIVRÉ 2026-06-12
*Effort : moyen. Valeur : fidélisation, complète l'onglet Analyse.*

- [x] **Poids corporel + mensurations** : saisie rapide (poids, tour de bras/taille/cuisses), courbe SVG maison (réutiliser le pattern VolumeChart).
- [x] **Timeline corporelle enrichie** : superposer analyses IA + poids + volume d'entraînement sur une même frise → l'évolution devient visible.
- [x] **1RM estimé** (Epley : poids × (1 + reps/30)) par exercice, affiché dans l'histo détaillé + détection de PR « force » (plus de reps à poids égal).
- [x] **Graphique par exercice** : progression du poids max sur un exercice donné (sélecteur + SVG).

## Phase iPhone/PWA v2 📱 ✅ LIVRÉ 2026-10-05 (branche `feature/iphone-pwa-v2`, non déployé)
*Objectif : excellente sur iPhone sans Mac, comme vraie app d'écran d'accueil.*

- [x] **Shell iPhone** : `viewport-fit=cover` + safe-area (encoche, barre d'accueil), méta Apple standalone, police système (plus de Google Fonts), thème clair/sombre/système, cibles ≥ 44 px, focus visibles, aria, modales accessibles (`ui/Sheet`), clavier iOS (16 px, `inputMode`, barre d'onglets masquée clavier ouvert), `prefers-reduced-motion`.
- [x] **Scanner de machine** ≤ 2 taps (onglet central / carte accueil / en-tête séance) : caméra ou photothèque, confiance haute → fiche directe, faible → 1–3 choix à confirmer, catalogue manuel en secours, sécurité, vidéo du mapping existant uniquement, « Ajouter à ma séance » / séance libre. Photo jamais conservée.
- [x] **Robustesse** : `useWorkoutSession` (état persistant, timers basés sur l'heure), migration de schéma v2 idempotente (ids de séance, sauvegarde brute), reprise sans doublon, dates locales partout, alerte stockage plein, fallback mémoire.
- [x] **Produit** : dashboard « prochaine action » + semaine/tendance/série, historique groupé par mois + badges records, onboarding 3 écrans, réglages (thème, rappels, installation, vie privée).
- [x] **Perf/sécurité** : vues lourdes en lazy-load (précachées), CSP stricte + en-têtes nginx, backend validé/limité par IP/timeout, logs sans données sensibles, `npm audit fix` non forcé.
- [ ] **À valider sur iPhone réel** : voir HISTORIQUE 05/10/2026 (safe-area/status bar, capture caméra, clavier, son du minuteur, install, offline).

## Phase 5 — Backend & qualité 🔧
*Effort : continu. Valeur : robustesse, maintenabilité.*

- [x] **Tests backend** : logique pure extraite dans `backend/lib.js` (35 tests `node --test`). Reste : injecter `fetch` pour tester les routes avec NIM mocké.
- [ ] **Fallback modèle** : si NIM 5xx/timeout répétés → second modèle (`NVIDIA_MODEL_FALLBACK`) avant d'échouer.
- [ ] **CI GitHub Actions** : build + tests front/backend sur chaque push (le repo existe : wilf974/MuscuGain).
- [x] **Rate-limit par IP** (X-Real-IP du proxy VPS ; 60/min global, 12/min image, 20/min texte). Reste : petite télémétrie d'usage (compteurs, pas de données perso).
- [x] **Headers sécurité nginx** : `nginx-security-headers.conf` (CSP stricte, nosniff, Referrer-Policy, Permissions-Policy, COOP).
- [x] **Découper `App.jsx`** : machine séance extraite dans `hooks/useWorkoutSession.js`.
- [ ] **CI** : `npm run check` + `cd backend && npm test` sur chaque push.
- [ ] **Tailwind 4** : seule façon de purger les 5 alertes `npm audit` restantes (braces/micromatch/chokidar, outillage de build) — migration majeure.

## Phase 6 — Polish (nice to have) ✨
- [x] Mode clair (palette CSS « miroir », toggle Sombre/Clair/Système dans Réglages).
- [ ] Sons d'alarme personnalisables + vibration réglable.
- [x] Onboarding 1er lancement (3 écrans : carnet, scanner, coach + installation).
- [x] Accessibilité : focus visibles, aria-labels sur les boutons icône, tailles tap ≥ 44px (audit VoiceOver réel à faire).
- [ ] Transitions de vue (slide léger) + skeletons de chargement.
- [ ] Notification de fin de repos écran verrouillé (nécessite Web Push + backend ; iOS ≥ 16.4 installé).
- [ ] Vidéo pour « Face Pull » : l'ID du mapping est invalide (12 car.) → ignoré ; à remplacer par un ID vérifié.

---

## Ordre recommandé
**P1 → P2 → P3** (P1 prépare la rétention, P2 est le différenciateur, P3 protège les données — urgent vu l'absence d'export). P4/P5 en parallèle selon dispo. P6 au fil de l'eau.

## Fait (référence)
Migration Vite/React multi-fichiers · import xlsx · reco machine par photo · séance libre · histo détaillé accordéon · graphique volume SVG · records PR 🏆 · onglet Analyse corporelle IA (consentement, photo non conservée) · retrait export/import JSON (choix produit : néophyte ne manipule pas de fichiers).
