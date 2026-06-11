// Logique de rappel de séance.
// Les fonctions pures (daysSince / shouldRemind) n'utilisent aucun symbole
// navigateur au niveau module → testables avec `node --test`.
// Les fonctions IO (Notification) gardent leurs garde-fous à l'intérieur.

// Nombre de jours entiers écoulés depuis `iso` (now injectable pour les tests).
export function daysSince(iso, now = Date.now()) {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

// Doit-on rappeler ? Pur, aucune dépendance navigateur.
export function shouldRemind({ lastDateISO, enabled, lastRemindedDate, today, now, thresholdDays = 3 }) {
  if (!enabled) return false;
  if (!lastDateISO) return false;
  if (daysSince(lastDateISO, now) < thresholdDays) return false;
  if (lastRemindedDate === today) return false;
  return true;
}

// --- IO (navigateur uniquement) ---

// Demande la permission de notification. 'granted' | 'denied' | 'unsupported'.
export async function requestReminderPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

// Déclenche la notification de rappel. No-op si non supporté / non accordé.
export function fireReminder(days) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification('MuscuGain', {
      body: `Ça fait ${days} jours sans séance. C'est le moment de t'y remettre ! 💪`,
    });
  } catch {
    // ignore
  }
}
