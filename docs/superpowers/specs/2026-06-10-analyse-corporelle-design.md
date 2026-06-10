# Design — Onglet « Analyse corporelle » (suivi photos de soi par IA)

Date : 2026-06-10
Statut : approuvé

## Contexte
4e onglet de MuscuGain. L'utilisateur photographie son corps (caméra ou galerie) ; l'IA vision (backend NVIDIA NIM, déjà en place pour la reco machine) renvoie une analyse : morphotype, équilibre musculaire, estimation masse grasse, conseils training, note d'évolution vs analyse précédente.

App local-first. Stack front : Vite 7 + React 19 + Tailwind 3 + lucide-react. Backend : Fastify ESM (`muscugain-backend`, NVIDIA NIM).

## Décisions verrouillées
1. **Photos envoyées à l'IA externe** (NVIDIA NIM) + écran de **consentement** au 1er usage (flag localStorage). Photo **jamais persistée serveur** ni stockée localement.
2. **Photo supprimée après analyse** — on ne conserve QUE le résultat texte/métriques. localStorage suffit (pas d'IndexedDB).
3. Périmètre IA : **morphotype + équilibre**, **estimation masse grasse** (fourchette indicative), **conseils training**, **suivi évolution**.
4. Capture : **caméra directe + galerie**.
5. **Disclaimer non médical** affiché. Estimations indicatives uniquement.

## Modèle de données
`localStorage.muscuGainBodyAnalyses` = tableau, plus récent en tête :
```
{
  date: ISO,
  morphotype: string,
  balance: string,            // équilibre/symétrie musculaire
  bodyFatRange: string,       // ex "15-18%"
  strengths: string[],
  weaknesses: string[],
  trainingAdvice: string[],
  evolutionNote: string       // commentaire vs analyse précédente ("" si 1ère)
}
```
Flag consentement : `localStorage.muscuGainBodyConsent = '1'`.

## Backend — `POST /analyze-body`
Nouveau handler dans `backend/server.js` (même style que `/recognize-exercise`).
- Body : `{ image: dataURL|base64, previousAnalysis?: object }`.
- 503 si `API_KEY` absente ; 400 si `image` manquante/non-string.
- Prompt vision cadré **coach fitness**, demande JSON strict :
  `{ "morphotype": "...", "balance": "...", "bodyFatRange": "...", "strengths": ["..."], "weaknesses": ["..."], "trainingAdvice": ["..."], "evolutionNote": "..." }`.
  - Consigne explicite : pas de diagnostic médical, estimations approximatives, ton bienveillant.
  - Si `previousAnalysis` fourni, l'inclure dans le prompt (résumé texte) pour produire `evolutionNote` (sinon `evolutionNote: ""`).
- Réutilise `extractJson()`, `fetch` NVIDIA, timeout 60s, gestion 502/504, `max_tokens` ~512, `temperature` 0.2.
- Normalise la sortie : champs string → string ; tableaux → arrays de strings (filtrés) ; coupe les tableaux à ~6 items.
- Photo non journalisée (ne pas logguer l'image).

## Frontend

### utils/analyzeBody.core.js (pur, testé)
- `normalizeBodyAnalysis(json)` → objet conforme au modèle (champs manquants → '' ou [] ; tableaux nettoyés/coupés ; types coercés). Jamais throw : renvoie un objet sûr.
- `summarizePrevious(analysis)` → string courte (pour log/debug ; le prompt côté backend gère l'inclusion). *(optionnel : si non nécessaire, omettre — YAGNI)*

### utils/analyzeBody.js (IO navigateur)
- Réutilise `fileToDataUrl` (importée depuis `recognizeMachine.js`) pour resize/JPEG.
- `analyzeBody(file, previousAnalysis)` → `POST /api/analyze-body` `{image, previousAnalysis}` → `normalizeBodyAnalysis(json)`.
- `AnalyzeBodyError` (kinds : unavailable/ratelimit/empty/image) avec messages FR, calqué sur `RecognizeError`.
- Après réception : le dataURL est en variable locale, non stocké → garbage-collecté (photo jetée).

### views/BodyAnalysis.jsx
États : `idle` → (si pas de consentement) `consent` → `loading` → `results` → `error`.
- **Consentement** : carte expliquant que la photo part vers une IA externe, n'est pas conservée, analyse indicative non médicale. Bouton « J'accepte » → set flag → idle. Bouton refuser → reste sans capture.
- **Capture** : 2 boutons — « 📷 Prendre une photo » (`<input type="file" accept="image/*" capture="environment">`) et « 🖼 Galerie » (`<input type="file" accept="image/*">`). Au choix d'un fichier : passe loading, appelle `analyzeBody(file, lastAnalysis)`.
- **loading** : spinner + texte « Analyse en cours… ».
- **results** : cartes — Morphotype, Équilibre, Masse grasse (fourchette), Forces (liste verte), Faiblesses (liste amber), Conseils training (liste blue), Note d'évolution (si non vide). Bouton « Nouvelle analyse ». **Disclaimer** non médical en pied.
- **error** : message + bouton réessayer.
- À la réception d'un résultat : `prepend` au localStorage `muscuGainBodyAnalyses`, mettre à jour le state, **ne pas stocker la photo**.
- **Timeline d'évolution** : sous les résultats / sur l'écran idle si analyses existantes — liste compacte des analyses passées (date + morphotype + masse grasse + 1 ligne évolution), pour visualiser la progression dans le temps. Cliquable → déplie le détail (réutilise le style accordéon de History).

### NavBar — 4e onglet
- Ajouter bouton « Analyse » (icône `ScanLine` lucide) → `setView('body')`. Conserver le FAB central séance. Ordre : Accueil, Analyse, [FAB], Historique.

### App.jsx
- State `bodyAnalyses` chargé depuis localStorage au mount (comme history).
- `view === 'body'` → `<BodyAnalysis bodyAnalyses={bodyAnalyses} setBodyAnalyses={...} />`.
- Handler `addBodyAnalysis(result)` : prepend + persist `muscuGainBodyAnalyses`.

### nginx
Aucune modif : `location /api/` existant proxifie déjà vers le backend, `client_max_body_size 10m` suffisant.

## Tests & gate
- TDD `node --test` sur `analyzeBody.core.js` : normalizeBodyAnalysis (champs manquants, types non-string coercés, tableaux nettoyés/coupés, json null → objet vide sûr).
- Build gate : `npm run build`.
- E2e backend : `curl /api/analyze-body` avec une image test → vérifier JSON structuré (ou message d'erreur clair si le modèle refuse les photos de personnes — auquel cas tester un modèle alternatif).
- Vérif visuelle finale via browser (consentement, capture, résultats, disclaimer).

## Risques
- **Refus modèle** : le modèle vision peut refuser/moraliser sur des photos de corps. `nemotron-nano-12b-v2-vl` accepte les personnes (0 refus sur reco machine) mais l'analyse corporelle est plus sensible → à valider e2e ; fallback : ajuster le prompt ou changer `NVIDIA_MODEL`.
- **Calibration masse grasse** : estimation visuelle peu fiable → toujours présentée en fourchette + disclaimer.
- **Vie privée** : egress de photos corporelles vers un tiers → consentement explicite obligatoire, photo non conservée.

## Hors scope (YAGNI)
- Pas de stockage des images, pas de galerie avant/après visuelle (puisque photos jetées).
- Pas de mensurations manuelles, pas de courbes de poids.
- Pas de comparaison multi-photos côté IA (seul le texte de l'analyse précédente est passé).
