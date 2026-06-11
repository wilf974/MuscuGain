# MuscuGain — Roadmap

Mise à jour : 2026-06-11. Vision : **le coach de musculation dans la poche d'un néophyte** — l'app observe, l'IA conseille, l'utilisateur ne manipule jamais de données techniques.

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

## Phase 3 — PWA & résilience des données 📱
*Effort : moyen. Valeur : fiabilité (le localStorage est fragile) + usage salle sans réseau.*

- [ ] **Service worker + offline complet** : l'app doit fonctionner en sous-sol de salle de sport. Cache statique + app shell (vite-plugin-pwa).
- [ ] **Installable** (manifest déjà partiel via InstallPrompt — compléter icônes/splash).
- [ ] **`navigator.storage.persist()`** : demander la persistance du stockage pour éviter l'éviction silencieuse du localStorage (cause n°1 de perte de données ; l'export JSON a été rejeté, c'est LA protection restante).
- [ ] **Migration localStorage → IndexedDB** (via wrapper léger) : quotas plus larges, transactions, prépare la suite. Migration transparente au premier lancement.
- [ ] **Rappel de séance** : notification locale si inactif > X jours (Notification API, opt-in).

## Phase 4 — Suivi corporel élargi 📊
*Effort : moyen. Valeur : fidélisation, complète l'onglet Analyse.*

- [ ] **Poids corporel + mensurations** : saisie rapide (poids, tour de bras/taille/cuisses), courbe SVG maison (réutiliser le pattern VolumeChart).
- [ ] **Timeline corporelle enrichie** : superposer analyses IA + poids + volume d'entraînement sur une même frise → l'évolution devient visible.
- [ ] **1RM estimé** (Epley : poids × (1 + reps/30)) par exercice, affiché dans l'histo détaillé + détection de PR « force » (plus de reps à poids égal).
- [ ] **Graphique par exercice** : progression du poids max sur un exercice donné (sélecteur + SVG).

## Phase 5 — Backend & qualité 🔧
*Effort : continu. Valeur : robustesse, maintenabilité.*

- [ ] **Tests backend** : extraire la logique pure de `server.js` (prompts, normalisation, extractJson) en modules testés `node --test` ; injecter `fetch` pour mocker NIM.
- [ ] **Fallback modèle** : si NIM 5xx/timeout répétés → second modèle (`NVIDIA_MODEL_FALLBACK`) avant d'échouer.
- [ ] **CI GitHub Actions** : build + tests front/backend sur chaque push (le repo existe : wilf974/MuscuGain).
- [ ] **Rate-limit par IP** (actuel : global 30/min) + petite télémétrie d'usage des endpoints (compteurs, pas de données perso).
- [ ] **Headers sécurité nginx** : CSP, X-Content-Type-Options, Referrer-Policy sur le vhost.
- [ ] **Découper `App.jsx`** (~470 lignes) : extraire la machine séance (timers/autosave/resume) en hook `useWorkoutSession` — App devient routeur + état métier.

## Phase 6 — Polish (nice to have) ✨
- [ ] Mode clair (toggle, classes Tailwind `dark:` inversées).
- [ ] Sons d'alarme personnalisables + vibration réglable.
- [ ] Onboarding 1er lancement (3 écrans : programmes, séance, analyse).
- [ ] Accessibilité : focus visibles, aria-labels sur les boutons icône, tailles tap ≥ 44px.
- [ ] Transitions de vue (slide léger) + skeletons de chargement.

---

## Ordre recommandé
**P1 → P2 → P3** (P1 prépare la rétention, P2 est le différenciateur, P3 protège les données — urgent vu l'absence d'export). P4/P5 en parallèle selon dispo. P6 au fil de l'eau.

## Fait (référence)
Migration Vite/React multi-fichiers · import xlsx · reco machine par photo · séance libre · histo détaillé accordéon · graphique volume SVG · records PR 🏆 · onglet Analyse corporelle IA (consentement, photo non conservée) · retrait export/import JSON (choix produit : néophyte ne manipule pas de fichiers).
