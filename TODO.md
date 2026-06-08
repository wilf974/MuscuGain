# MuscuGain - TODO / Améliorations

## En cours : Refactorisation Architecture

### Migration single-file → Vite + React multi-fichiers
- [x] Initialiser projet Vite + React
- [x] Extraire les données (exercices, routines, vidéos) → `src/data/`
- [x] Créer les composants UI réutilisables → `src/components/ui/`
- [x] Créer les composants modaux → `src/components/modals/`
- [x] Extraire les hooks personnalisés → `src/hooks/`
- [x] Créer les vues → `src/views/`
- [x] Assembler App.jsx + main.jsx
- [x] Mettre à jour Dockerfile (multi-stage build)
- [x] Tester le build
- [x] Déployer

## Priorité Haute (UX directe)

- [ ] **Export/Import des données** - Bouton pour exporter l'historique et les programmes en JSON, et les réimporter. Protège contre la perte de données si le localStorage est vidé.

- [x] **Remplacer le `confirm()` natif dans cancelSession** - Utiliser le `ConfirmationModal` déjà présent au lieu du `confirm()` du navigateur (cohérence UI).

- [ ] **Timer de repos configurable par exercice** - Pouvoir définir un temps de repos différselon l'exercice (ex: 2min pour squat, 45s pour curl). Actuellement c'est global à 60s.

- [x] **Passer en React production** - Résolu par la migration Vite (build optimisé automatiquement).

- [ ] **Historique détaillé par exercice** - Dans l'historique, pouvoir cliquer sur une séance pour voir le détail (poids/reps de chaque série).

## Priorité Moyenne (Fonctionnalités utiles)

- [ ] **Graphique de progression** - Un petit graphique simple montrant l'évolution du volume total par séance au fil du temps.

- [ ] **Réordonner les exercices** - Pouvoir réordonner les exercices dans un programme personnalisé (flèches haut/bas).

- [ ] **Notes par séance** - Un champ texte libre pour ajouter des notes à chaque séance.

- [ ] **Supprimer une série** - Actuellement on peut ajouter des séries mais pas en supprimer pendant la séance.

- [ ] **Dupliquer un programme** - Bouton pour dupliquer un programme personnalisé existant et le modifier.

- [ ] **Records personnels (PR)** - Afficher automatiquement quand on bat un record personnel sur un exercice.

## Priorité Basse (Nice to have)

- [ ] **Mode sombre/clair** - Toggle pour un thème clair.
- [ ] **Service Worker pour mode offline** - Permettre l'utilisation complète sans connexion internet.
- [ ] **Rappel de séance** - Notification simple rappelant de s'entraîner si inactif depuis X jours.
- [ ] **Sons personnalisables** - Choix du son d'alarme du timer de repos.
- [ ] **Estimation du 1RM** - Calculer automatiquement le 1RM estimé à partir des séries effectuées.

## Corrections mineures

- [x] **Cohérence des labels de catégories** - Dans `AddExerciseModal`, utiliser les labels français (Pectoraux, Dos...) au lieu des clés anglaises.
- [ ] **Pas de feedback visuel quand on sauvegarde un programme** - Ajouter un toast/notification de confirmation.
- [ ] **Supprimer une série individuelle** - Seulement "Ajouter Série" existe, pas de suppression.
