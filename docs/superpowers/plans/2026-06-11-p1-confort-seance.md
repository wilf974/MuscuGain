# P1 Confort de séance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** 7 quick-wins UX : éditer/réordonner/dupliquer un programme, pause par exercice dans l'UI, supprimer une série en séance, toasts de confirmation, notes de séance.

**Architecture:** Tout frontend. CreateRoutine passe d'ops par nom à ops par index (reorder/suppr/édition). Système Toast global via contexte React. Notes stockées dans l'entrée d'historique.

**Tech Stack:** React 19, Tailwind 3, lucide-react. Gate : `npm run build`.

---

## File Structure
| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `src/views/CreateRoutine.jsx` | Modifier | Édition + reorder + suppr + champ pause ; ops par index |
| `src/App.jsx` | Modifier | state `editingRoutine`, `startEditRoutine`, `duplicateRoutine`, save edit, notes dans saveAndExit, ToastProvider racine |
| `src/views/Dashboard.jsx` | Modifier | Boutons crayon (éditer) + dupliquer sur cartes perso |
| `src/views/Workout.jsx` | Modifier | `removeSet` (bouton suppr par ligne si >1) |
| `src/views/Cooldown.jsx` | Modifier | textarea notes → `saveAndExit(notes)` |
| `src/views/History.jsx` | Modifier | afficher `entry.notes` dans le détail |
| `src/components/ui/Toast.jsx` | Créer | Composant + `ToastProvider` + `useToast` |
| `src/main.jsx` | Modifier | Envelopper `<App/>` dans `<ToastProvider>` |

Modèle routine inchangé : `{ id, name, desc, exercises:[{name,targetSets,targetReps,startingWeight,restSeconds?}], isCustom }`.
History entry : ajout champ optionnel `notes: string`.

---

### Task 1: Toast system

**Files:**
- Create: `src/components/ui/Toast.jsx`
- Modify: `src/main.jsx`

- [ ] **Step 1: Create `src/components/ui/Toast.jsx`**

```jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { cls: 'bg-green-600/90 border-green-400/40 text-white', Icon: CheckCircle2 },
  error: { cls: 'bg-red-600/90 border-red-400/40 text-white', Icon: AlertTriangle },
  info: { cls: 'bg-blue-600/90 border-blue-400/40 text-white', Icon: Info },
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { id, message, type }

  const showToast = useCallback((message, type = 'success') => {
    const id = `${message}-${type}`;
    setToast({ id, message, type });
    // auto-dismiss handled by render below via setTimeout in effect-free way:
  }, []);

  // simple auto-dismiss: schedule clear whenever a toast is set
  const onShown = useCallback((id) => {
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2600);
  }, []);

  const style = toast ? (STYLES[toast.type] || STYLES.info) : null;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <ToastView key={toast.id} toast={toast} style={style} onMount={() => onShown(toast.id)} onClose={() => setToast(null)} />
      )}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, style, onMount, onClose }) {
  const { Icon } = style;
  // trigger auto-dismiss once on mount
  if (typeof window !== 'undefined' && !toast._scheduled) {
    toast._scheduled = true;
    onMount();
  }
  return (
    <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 pointer-events-none fade-in">
      <div className={`pointer-events-auto flex items-center gap-2 max-w-sm w-full rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md ${style.cls}`}>
        <Icon size={18} className="shrink-0" />
        <span className="text-sm font-medium flex-1">{toast.message}</span>
        <button onClick={onClose} className="opacity-70 hover:opacity-100"><X size={16} /></button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx || (() => {});
}
```

Note: the `onMount`/`_scheduled` trick avoids needing useEffect; if the implementer prefers, use a `useEffect(() => { const t = setTimeout(onClose, 2600); return () => clearTimeout(t); }, [])` inside `ToastView` instead — cleaner. **Prefer the useEffect version** if writing fresh. Keep behavior: auto-dismiss ~2.6s, manual close button, charte success/error/info.

- [ ] **Step 2: Wrap App in `src/main.jsx`**

Read current `src/main.jsx`; wrap `<App />` with `<ToastProvider>`:

```jsx
import { ToastProvider } from './components/ui/Toast';
// ...
<ToastProvider>
  <App />
</ToastProvider>
```
(Preserve existing StrictMode/root structure.)

- [ ] **Step 3: Build**

Run: `cd /opt/apps/MuscuGain && npm run build` → OK.

- [ ] **Step 4: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/components/ui/Toast.jsx src/main.jsx && git commit -m "feat(muscugain): système de toasts (ToastProvider + useToast)"
```

---

### Task 2: CreateRoutine — édition, reorder, suppression, pause

**Files:**
- Modify: `src/views/CreateRoutine.jsx`

**Spec comportementale (implémenter exactement) :**
- Nouvelle prop `editingRoutine` (objet routine ou `null`). Au montage, si présent : `newRoutineName = editingRoutine.name`, `newRoutineExercises = editingRoutine.exercises` (copie, normalisée pour avoir `restSeconds` éventuel). Titre header = « Modifier le programme » sinon « Créer un programme ». Bouton = « Mettre à jour » / « Sauvegarder le programme ».
- **Ops par INDEX** (les noms restent uniques mais on veut reorder) :
  - `removeAt(idx)` : retire l'exercice.
  - `moveUp(idx)` / `moveDown(idx)` : échange avec voisin (bornes respectées).
  - `updateFieldAt(idx, field, value)` : remplace `updateField`. `startingWeight` et nouveau `restSeconds` = libres (number ≥ 0, '' autorisé) ; `targetSets`/`targetReps` = `Math.max(1, parseInt||1)` ou ''.
  - Le picker (`toggleExerciseSelection` par nom) reste mais à la sélection ajoute `{ name, targetSets:'', targetReps:'', startingWeight:'', restSeconds:'' }`. La détection « déjà sélectionné » reste par nom.
- Chaque carte d'exercice sélectionné affiche : nom + ✕ (supprimer), flèches ↑/↓ (réordonner, désactivées aux bornes), et une grille de 4 champs : Séries, Reps, Poids (kg), **Pause (s)** (→ `restSeconds`, optionnel). Utiliser `ChevronUp`/`ChevronDown` (déjà importés) pour les flèches.
- `saveCustomRoutine` :
  - validation inchangée (nom + ≥1 exo).
  - normaliser chaque exo avant save : `restSeconds` → `parseInt` si renseigné et >0 sinon supprimer la clé (pour ne pas stocker `restSeconds:''`).
  - si `editingRoutine` : conserver `editingRoutine.id`, `desc`, `isCustom:true`, name+exercises mis à jour ; remplacer dans `customRoutines` par id (via setCustomRoutines + persist). Sinon : créer (id neuf) comme aujourd'hui.
  - **Ne PAS** persister/setView ici directement pour l'édition si App fournit un handler — MAIS pour rester simple, garder la persistance locale (`localStorage.setItem('muscuGainCustomRoutines', ...)`) et `setView('dashboard')` comme actuellement. App relira l'état via `setCustomRoutines`.
  - Appeler `showToast(editingRoutine ? 'Programme mis à jour' : 'Programme créé')` (importer `useToast`).
- Au montage en édition, le nom et les exos sont préremplis ; l'utilisateur peut ajouter/retirer/réordonner.

- [ ] **Step 1: Implement the changes in `src/views/CreateRoutine.jsx`** per the spec above. Add `import { useToast } from '../components/ui/Toast';` and `const showToast = useToast();`. Add `editingRoutine` to props (default null). Initialize state from `editingRoutine` (use lazy `useState` initializers). Replace name-keyed handlers with index-keyed ones. Add the 4th "Pause (s)" input and the ↑/↓ + ✕ controls per row. Update `saveCustomRoutine` for create/edit + toast.

- [ ] **Step 2: Build**

Run: `cd /opt/apps/MuscuGain && npm run build` → OK.

- [ ] **Step 3: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/views/CreateRoutine.jsx && git commit -m "feat(muscugain): CreateRoutine — édition, réordonner, supprimer, pause par exercice"
```

---

### Task 3: App + Dashboard — édition & duplication

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/views/Dashboard.jsx`

- [ ] **Step 1: App.jsx state + handlers**

In `src/App.jsx`:

a) Add state near `editing`/modal states:
```jsx
const [editingRoutine, setEditingRoutine] = useState(null);
```

b) Add handlers near `importRoutines`:
```jsx
const startEditRoutine = (routine) => {
  setEditingRoutine(routine);
  setView('create');
};

const startCreateRoutine = () => {
  setEditingRoutine(null);
  setView('create');
};

const duplicateRoutine = (routine) => {
  const copy = {
    ...routine,
    id: 'custom_' + Date.now(),
    name: `${routine.name} (copie)`,
    isCustom: true,
  };
  const updated = [copy, ...customRoutines];
  setCustomRoutines(updated);
  localStorage.setItem('muscuGainCustomRoutines', JSON.stringify(updated));
};
```

c) Update the `view === 'create'` block to pass `editingRoutine` and clear it on leave. Change CreateRoutine render to:
```jsx
{view === 'create' && (
  <CreateRoutine
    setView={(v) => { setEditingRoutine(null); setView(v); }}
    customRoutines={customRoutines}
    setCustomRoutines={setCustomRoutines}
    editingRoutine={editingRoutine}
  />
)}
```

d) In the `<Dashboard ... />` props, replace the create entry with edit-aware props. Add:
```jsx
onCreateClick={startCreateRoutine}
onEditRoutine={startEditRoutine}
onDuplicateRoutine={duplicateRoutine}
```
(Keep existing `requestDeleteRoutine`, `onImportClick`.)

- [ ] **Step 2: Dashboard.jsx — pencil + duplicate buttons**

In `src/views/Dashboard.jsx`:
- Add to props: `onCreateClick`, `onEditRoutine`, `onDuplicateRoutine`.
- Add lucide imports: `Pencil, Copy` → `import { Dumbbell, Activity, Plus, Play, User, Trash2, Upload, Pencil, Copy } from 'lucide-react';`
- Change the « Créer » button `onClick={() => setView('create')}` → `onClick={onCreateClick}`.
- On each custom routine card, next to the delete (Trash2) button, add edit + duplicate buttons:
```jsx
<button type="button" onClick={() => onEditRoutine(routine)} className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 p-1 rounded transition-colors">
  <Pencil size={14} />
</button>
<button type="button" onClick={() => onDuplicateRoutine(routine)} className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 p-1 rounded transition-colors">
  <Copy size={14} />
</button>
```
Place them in the same flex row as the existing Trash2 button (before it).

- [ ] **Step 3: Build**

Run: `cd /opt/apps/MuscuGain && npm run build` → OK.

- [ ] **Step 4: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/App.jsx src/views/Dashboard.jsx && git commit -m "feat(muscugain): éditer & dupliquer un programme (Dashboard + App)"
```

---

### Task 4: Workout — supprimer une série

**Files:**
- Modify: `src/views/Workout.jsx`

- [ ] **Step 1: Add removeSet + per-row delete control**

In `src/views/Workout.jsx`:
- Add handler after `addSet`:
```jsx
const removeSet = (exercise, index) => {
  const newData = { ...workoutData };
  if (!newData[exercise] || newData[exercise].length <= 1) return;
  newData[exercise] = newData[exercise].filter((_, i) => i !== index);
  setWorkoutData(newData);
};
```
- Add `Trash2` to the lucide import on line 2: `import { X, Plus, Check, Play, Dumbbell, Trash2 } from 'lucide-react';`
- In the set row (the `grid grid-cols-10`), the set-number cell is `col-span-2`. Replace its content so that when there is more than one set, a small delete button appears next to the number:
```jsx
<div className="col-span-2 flex items-center justify-center gap-1 font-mono text-slate-400">
  <span>{setIndex + 1}</span>
  {workoutData[exName].length > 1 && (
    <button onClick={() => removeSet(exName, setIndex)} className="text-slate-600 hover:text-red-400 transition-colors" aria-label="Supprimer la série">
      <Trash2 size={12} />
    </button>
  )}
</div>
```
(Replaces the existing `<div className="col-span-2 text-center font-mono text-slate-400">{setIndex + 1}</div>`.)

- [ ] **Step 2: Build**

Run: `cd /opt/apps/MuscuGain && npm run build` → OK.

- [ ] **Step 3: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/views/Workout.jsx && git commit -m "feat(muscugain): supprimer une série pendant la séance"
```

---

### Task 5: Notes de séance (Cooldown → History)

**Files:**
- Modify: `src/views/Cooldown.jsx`
- Modify: `src/App.jsx`
- Modify: `src/views/History.jsx`

- [ ] **Step 1: Cooldown — textarea notes**

In `src/views/Cooldown.jsx`:
- Add `import { useState } from 'react';` (merge with existing import line) and at top of component: `const [notes, setNotes] = useState('');`
- Before the « Enregistrer et Quitter » Button, add:
```jsx
<div className="w-full max-w-sm mb-4 text-left">
  <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Notes (optionnel)</label>
  <textarea
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    rows={2}
    placeholder="Ressenti, douleurs, remarques…"
    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none resize-none"
  />
</div>
```
- Change the save button to pass notes: `onClick={() => saveAndExit(notes)}`.

- [ ] **Step 2: App — store notes in history entry**

In `src/App.jsx` `saveAndExit`, change signature to `const saveAndExit = (notes = '') => {` and add `notes: (notes || '').trim()` to `newEntry`. Add a toast after saving: `showToast('Séance enregistrée');` (import `useToast` at top: `import { useToast } from './components/ui/Toast';` and `const showToast = useToast();` in the component). Also call `showToast('Programme supprimé')` in `handleConfirmDelete` for the routine branch, and `showToast('Séance supprimée')` for the history branch (optional but nice).

- [ ] **Step 3: History — show notes in detail**

In `src/views/History.jsx`, inside the expanded detail block (`isOpen && (...)`), after the exercises `.map(...)`, add:
```jsx
{session.notes && (
  <div className="bg-slate-900/60 rounded-lg p-3">
    <div className="text-xs font-semibold text-slate-400 mb-1">Notes</div>
    <p className="text-sm text-slate-300 whitespace-pre-wrap">{session.notes}</p>
  </div>
)}
```

- [ ] **Step 4: Build**

Run: `cd /opt/apps/MuscuGain && npm run build` → OK.

- [ ] **Step 5: Commit**

```bash
cd /opt/apps/MuscuGain && git add src/views/Cooldown.jsx src/App.jsx src/views/History.jsx && git commit -m "feat(muscugain): notes de séance (Cooldown → historique) + toasts"
```

---

### Task 6: Build final + deploy

- [ ] **Step 1: All tests + build**
Run: `cd /opt/apps/MuscuGain && node --test src/utils/ && npm run build` → tests pass, build OK.

- [ ] **Step 2: Deploy**
Run: `cd /opt/apps/MuscuGain && docker compose up -d --build` then `until docker ps --filter name=muscugain-app --format '{{.Status}}' | grep -q healthy; do sleep 3; done; docker ps --filter name=muscugain --format '{{.Names}}\t{{.Status}}'`
Expected: both healthy.

- [ ] **Step 3: Verify**
Run: `curl -sI http://127.0.0.1:8080/ | head -1` → 200. Check bundle has a P1 string: `JS=$(ls -t dist/assets/index-*.js | head -1); grep -qF "Mettre à jour" "$JS" && echo OK`

- [ ] **Step 4: Docs**
Update `HISTORIQUE.MD` (entrée P1) + project `CLAUDE.md` (mention édition/duplication programme, reorder, pause UI, suppr série, toasts, notes séance ; cocher P1 dans la roadmap). Commit:
```bash
cd /opt/apps/MuscuGain && git add HISTORIQUE.MD CLAUDE.md ROADMAP.md && git commit -m "docs(muscugain): P1 confort de séance livré (histo + CLAUDE.md)"
```

---

## Self-Review
- Toast système (provider + hook + auto-dismiss) → Task 1 ✓
- Éditer programme (prefill, garde id) → Task 2 + 3 ✓
- Réordonner exercices (↑↓) → Task 2 ✓
- Supprimer exercice du programme (✕) → Task 2 ✓ (existait partiellement, conservé par index)
- Pause par exercice dans l'UI (`restSeconds`) → Task 2 ✓
- Dupliquer programme → Task 3 ✓
- Supprimer une série en séance → Task 4 ✓
- Notes de séance (saisie + stockage + affichage) → Task 5 ✓
- Toasts branchés (save/édit/suppr/import) → Tasks 2 & 5 ✓
- Deploy + docs → Task 6 ✓

**Type consistency:** `editingRoutine` objet routine complet ; `saveCustomRoutine` garde l'`id` en édition. `saveAndExit(notes)` ⇒ `entry.notes` ⇒ lu par History. `useToast()` renvoie une fn `showToast(message, type)`. ✓
