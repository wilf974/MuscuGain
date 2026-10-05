import { useEffect, useState } from 'react';

// Horloge à faible fréquence pour les libellés relatifs (« il y a 5 min », reprise < 2 h).
// Rafraîchie aussi au retour au premier plan (iOS fige les timers en arrière-plan).
export default function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}
