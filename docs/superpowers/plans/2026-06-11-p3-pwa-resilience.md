# P3 PWA & résilience — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Rendre MuscuGain installable + utilisable hors-ligne (salle sans réseau), protéger le localStorage contre l'éviction (`storage.persist()`), et rappeler de s'entraîner après inactivité. Pas de migration IndexedDB (hors scope).

**Architecture:** vite-plugin-pwa (Workbox) génère SW + manifest + precache de l'app shell ; les appels `/api/*` (IA) restent réseau-only (jamais cachés). Icônes PNG locales (générées via ImageMagick). `storage.persist()` au mount. Rappels via Notification API (opt-in), déclenchés à l'ouverture si inactivité.

**Tech Stack:** vite-plugin-pwa, React 19, ImageMagick (génération icônes), nginx.

---

## File Structure
| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `public/icon.svg` | Créer | Source SVG de l'icône |
| `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-512x512.png`, `public/apple-touch-icon.png` | Créer | Icônes PWA (générées) |
| `public/manifest.json` | Supprimer | Remplacé par le manifest généré par le plugin |
| `vite.config.js` | Modifier | Plugin VitePWA (manifest + workbox) |
| `index.html` | Modifier | Retirer l'ancien `<link manifest>`, ajouter apple-touch-icon |
| `src/main.jsx` | Modifier | Enregistrer le SW (`virtual:pwa-register`) |
| `package.json` / lock | Modifier | devDep `vite-plugin-pwa` |
| `nginx-container.conf` | Modifier | sw.js + manifest servis sans cache agressif |
| `src/utils/persistence.js` | Créer | `requestPersistentStorage()` |
| `src/utils/reminder.js` | Créer | logique rappel (pur + IO Notification) |
| `src/App.jsx` | Modifier | appel persist + rappel au mount |
| `src/views/Dashboard.jsx` | Modifier | toggle « Activer les rappels » |

---

### Task 1: Icônes PWA (ImageMagick)

**Files:** Create `public/icon.svg` + 4 PNG.

- [ ] **Step 1: Create `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <g transform="translate(256,256)" stroke="#3b82f6" stroke-width="34" stroke-linecap="round" fill="none">
    <line x1="-150" y1="0" x2="150" y2="0"/>
    <line x1="-150" y1="-70" x2="-150" y2="70"/>
    <line x1="150" y1="-70" x2="150" y2="70"/>
    <line x1="-110" y1="-95" x2="-110" y2="95"/>
    <line x1="110" y1="-95" x2="110" y2="95"/>
  </g>
</svg>
```

- [ ] **Step 2: Generate PNGs** (ImageMagick is installed: `/usr/bin/convert`)

Run from `/opt/apps/MuscuGain`:
```bash
cd /opt/apps/MuscuGain/public
convert -background none icon.svg -resize 192x192 pwa-192x192.png
convert -background none icon.svg -resize 512x512 pwa-512x512.png
convert -background none icon.svg -resize 180x180 apple-touch-icon.png
# maskable: même glyphe mais avec padding de sécurité (safe zone) — fond plein déjà présent
convert -background "#0f172a" icon.svg -resize 410x410 -gravity center -extent 512x512 maskable-512x512.png
```
Expected: 4 PNG files created in `public/`. Verify: `ls -la public/*.png` shows 4 non-empty files.

- [ ] **Step 3: Commit**
```bash
cd /opt/apps/MuscuGain && git add public/icon.svg public/pwa-192x192.png public/pwa-512x512.png public/apple-touch-icon.png public/maskable-512x512.png && git commit -m "feat(muscugain): icônes PWA locales (dumbbell, générées)"
```

---

### Task 2: vite-plugin-pwa

**Files:** `package.json`, `vite.config.js`, `src/main.jsx`, `index.html`, delete `public/manifest.json`.

- [ ] **Step 1: Install plugin**
Run: `cd /opt/apps/MuscuGain && npm install -D vite-plugin-pwa`
Expected: added to devDependencies + package-lock updated.

- [ ] **Step 2: Configure `vite.config.js`**
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      manifest: {
        name: 'MuscuGain',
        short_name: 'MuscuGain',
        description: 'Suivi de musculation local-first avec coach IA',
        start_url: '.',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // Ne JAMAIS cacher les appels IA (dynamiques) : NetworkOnly
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
```

- [ ] **Step 3: Register SW in `src/main.jsx`**
Add near the top (after imports):
```js
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });
```
(Keep the existing ReactDOM render + ToastProvider intact.)

- [ ] **Step 4: `index.html`** — remove the line `<link rel="manifest" href="/manifest.json">` (the plugin injects its own manifest link). Add inside `<head>`: `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`.

- [ ] **Step 5: Delete the old static manifest**
```bash
cd /opt/apps/MuscuGain && git rm public/manifest.json
```

- [ ] **Step 6: Build** `npm run build` → must succeed and emit `dist/sw.js`, `dist/manifest.webmanifest`, `dist/registerSW.js`. Verify: `ls dist/sw.js dist/manifest.webmanifest`.

- [ ] **Step 7: Commit**
```bash
cd /opt/apps/MuscuGain && git add package.json package-lock.json vite.config.js src/main.jsx index.html && git commit -m "feat(muscugain): PWA via vite-plugin-pwa (SW offline, manifest, autoUpdate)"
```

---

### Task 3: nginx — servir SW & manifest correctement

**Files:** `nginx-container.conf`

- [ ] **Step 1: Add no-cache for the service worker + manifest**, before the `location /` block:
```nginx
    # Service worker & manifest : toujours revalider (évite un SW figé)
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires off;
    }
    location = /registerSW.js {
        add_header Cache-Control "no-cache";
        expires off;
    }
    location = /manifest.webmanifest {
        add_header Cache-Control "no-cache";
        types { } default_type application/manifest+json;
    }
```
(Keep `/assets/` immutable, `/api/` proxy, and the SPA fallback as-is.)

- [ ] **Step 2: Commit**
```bash
cd /opt/apps/MuscuGain && git add nginx-container.conf && git commit -m "feat(muscugain): nginx no-cache pour sw.js/manifest (PWA)"
```

---

### Task 4: `storage.persist()`

**Files:** Create `src/utils/persistence.js` ; Modify `src/App.jsx`.

- [ ] **Step 1: Create `src/utils/persistence.js`**
```js
// Demande au navigateur de ne pas évincer le localStorage (anti perte de données).
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return false;
    const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    if (already) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Call it in `src/App.jsx`** — inside the mount `useEffect` (the one that loads localStorage), add at the end:
```js
import { requestPersistentStorage } from './utils/persistence';
// ... in the mount useEffect:
requestPersistentStorage();
```
(Fire-and-forget; no UI needed.)

- [ ] **Step 3: Build** `npm run build`.

- [ ] **Step 4: Commit**
```bash
cd /opt/apps/MuscuGain && git add src/utils/persistence.js src/App.jsx && git commit -m "feat(muscugain): storage.persist() au démarrage (anti-éviction localStorage)"
```

---

### Task 5: Rappel de séance (Notification opt-in)

**Files:** Create `src/utils/reminder.js` ; Modify `src/App.jsx`, `src/views/Dashboard.jsx`.

**Spec :**
- `src/utils/reminder.js` :
  - `daysSince(iso)` (pur) → nombre de jours entiers depuis `iso` (utilise un `now` injectable : `daysSince(iso, now = Date.now())`).
  - `shouldRemind({ lastDateISO, enabled, lastRemindedDate, today, now, thresholdDays = 3 })` (pur) → bool : `enabled` ET `lastDateISO` ET `daysSince(lastDateISO, now) >= thresholdDays` ET `lastRemindedDate !== today` (pas déjà rappelé aujourd'hui).
  - `requestReminderPermission()` (IO) → `Notification.requestPermission()` si dispo, retourne `'granted'|'denied'|'unsupported'`.
  - `fireReminder(days)` (IO) → si `Notification.permission === 'granted'`, `new Notification('MuscuGain', { body: ... })`. No-op sinon.
- App mount : si `localStorage.muscuGainReminders === '1'` et `Notification.permission === 'granted'`, calculer `shouldRemind(...)` à partir de `history[0]?.date`, `localStorage.muscuGainLastReminder` ; si vrai → `fireReminder(days)` + `localStorage.setItem('muscuGainLastReminder', today)`.
- Dashboard : si pas encore activé (`localStorage.muscuGainReminders !== '1'`), afficher un petit bouton « 🔔 Activer les rappels » (sous la carte coach ou dans les stats) → `requestReminderPermission()` → si `'granted'` : `localStorage.setItem('muscuGainReminders','1')` + toast « Rappels activés » ; si `'denied'` : toast info « Notifications refusées ». Une fois activé, masquer le bouton.

- [ ] **Step 1: Create `src/utils/reminder.js`** with pure `daysSince`/`shouldRemind` + IO `requestReminderPermission`/`fireReminder`.
- [ ] **Step 2: Create `src/utils/reminder.core.test.js`** (TDD pour les fns pures) :
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysSince, shouldRemind } from './reminder.js';

const NOW = Date.parse('2026-06-11T12:00:00.000Z');
test('daysSince computes whole days', () => {
  assert.equal(daysSince('2026-06-08T12:00:00.000Z', NOW), 3);
  assert.equal(daysSince('2026-06-11T00:00:00.000Z', NOW), 0);
});
test('shouldRemind true when inactive >= threshold and not reminded today', () => {
  assert.equal(shouldRemind({ lastDateISO: '2026-06-07T12:00:00.000Z', enabled: true, lastRemindedDate: '2026-06-10', today: '2026-06-11', now: NOW }), true);
});
test('shouldRemind false when disabled / recent / already reminded', () => {
  assert.equal(shouldRemind({ lastDateISO: '2026-06-07T12:00:00.000Z', enabled: false, lastRemindedDate: null, today: '2026-06-11', now: NOW }), false);
  assert.equal(shouldRemind({ lastDateISO: '2026-06-10T12:00:00.000Z', enabled: true, lastRemindedDate: null, today: '2026-06-11', now: NOW }), false);
  assert.equal(shouldRemind({ lastDateISO: '2026-06-01T12:00:00.000Z', enabled: true, lastRemindedDate: '2026-06-11', today: '2026-06-11', now: NOW }), false);
});
```
Note: `reminder.js` must not import any browser-only symbol at module top level in a way that breaks `node --test` — keep `daysSince`/`shouldRemind` as pure top-level exports; guard `Notification`/`navigator` usage inside the IO functions only.

- [ ] **Step 3: Run tests** `node --test src/utils/reminder.core.test.js` → 3 pass.
- [ ] **Step 4: Wire App.jsx mount + Dashboard toggle** per spec (import reminder fns, `useToast` already available in Dashboard? — pass an `onEnableReminders` handler from App OR call directly in Dashboard with `useToast`). Keep it simple: implement the toggle inside Dashboard using `useToast()` + the reminder IO fns directly; App handles the mount-time `fireReminder`.
- [ ] **Step 5: Build** `npm run build`.
- [ ] **Step 6: Commit**
```bash
cd /opt/apps/MuscuGain && git add src/utils/reminder.js src/utils/reminder.core.test.js src/App.jsx src/views/Dashboard.jsx && git commit -m "feat(muscugain): rappels de séance (Notification opt-in, seuil 3j)"
```

---

### Task 6: Deploy + verify + docs

- [ ] **Step 1: tests + build** `cd /opt/apps/MuscuGain && node --test src/utils/ && npm run build` → pass ; confirm `dist/sw.js` + `dist/manifest.webmanifest` exist.
- [ ] **Step 2: deploy** `docker compose up -d --build` ; wait healthy.
- [ ] **Step 3: verify served artifacts**:
```bash
curl -sI http://127.0.0.1:8080/sw.js | head -1
curl -s http://127.0.0.1:8080/manifest.webmanifest | head -c 200
curl -sI http://127.0.0.1:8080/pwa-192x192.png | head -1
curl -sI http://127.0.0.1:8080/sw.js | grep -i cache-control
```
Expected: sw.js 200, manifest JSON with icons, png 200, sw.js has no-cache header.
- [ ] **Step 4: docs** : `HISTORIQUE.MD` (entrée P3), `CLAUDE.md` (PWA/SW, persist, rappels ; coches), `ROADMAP.md` (cocher P3 items livrés ; laisser IndexedDB non coché = reporté). Commit `docs(muscugain): P3 PWA & résilience livré`.

---

## Self-Review
- storage.persist() → Task 4 ✓ ; SW offline + installable (vite-plugin-pwa, icônes locales, manifest, autoUpdate, /api NetworkOnly) → Tasks 1,2,3 ✓ ; rappel séance (opt-in, seuil 3j, pure testé) → Task 5 ✓.
- IndexedDB migration : **hors scope** (désélectionné), reste coché « à faire » dans ROADMAP.
- **Type consistency** : manifest icons ↔ fichiers PNG générés (noms identiques) ; `shouldRemind` params ↔ clés localStorage (`muscuGainReminders`, `muscuGainLastReminder`) ↔ usage App. nginx `location = /sw.js` ↔ fichier émis par le plugin (`dist/sw.js`). ✓
- **Risques** : SW peut servir une version figée → autoUpdate + nginx no-cache sur sw.js. `/api` en NetworkOnly → jamais de réponse IA périmée. Notification non supportée/refusée → no-op gracieux.
