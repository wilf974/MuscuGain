---
name: project-muscugain
description: MuscuGain architecture & conventions for code review (local-first React gym tracker)
metadata:
  type: project
---

# MuscuGain

Local-first PWA: Vite 7 + React 19 + Tailwind 3 + lucide-react. No backend; state in localStorage
(keys `muscuGain*`). `App.jsx` is the central state container + persistence; views are presentational.

**Why:** offline gym tracker, single user, no auth/network — security surface is minimal, focus reviews
on React correctness, data-shape backward-compat (old localStorage entries), and UX.

**How to apply when reviewing:**
- Routine exercise model: `{name, targetSets, targetReps, startingWeight, restSeconds?}`. Empty-string
  fields are tolerated — App.jsx `startSession` does `parseInt(x)||default`. So storing `''` for
  targetSets/Reps/weight is acceptable by current convention (not a bug).
- `getRestSeconds` in Workout.jsx treats `restSeconds > 0` as set, else null → global default. Storing
  `restSeconds` only when `>0` is the right normalization.
- History entries are append-only objects; new optional fields (e.g. `notes`) must be guard-rendered
  (`session.notes && ...`) for backward-compat with pre-existing entries.
- Gate is `npm run build` (no lint/test step wired for components; `node --test src/utils/` for utils).
- Toast system: single-toast `ToastProvider` (state holds one toast), `useToast()` returns `showToast`
  fn, auto-dismiss via useEffect+setTimeout in ToastView keyed by toast.id (remount resets timer).
