import { useCallback, useRef } from 'react';

// Bip de fin de repos (Web Audio). iOS crée l'AudioContext « suspendu » hors geste utilisateur :
// `unlock()` doit être appelé dans un tap (ex. validation d'une série) pour que l'alarme sonne ensuite.
// À valider sur iPhone : aucun son si l'app est en arrière-plan / écran verrouillé, ni en mode silencieux.
export default function useAlarm() {
  const audioCtxRef = useRef(null);

  const getCtx = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  };

  const unlock = useCallback(() => {
    try {
      const ctx = getCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    } catch {
      /* Audio non disponible */
    }
  }, []);

  const playAlarmSound = useCallback(() => {
    try {
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      [0, 0.2, 0.4].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 660 + i * 220;
        gain.gain.setValueAtTime(0.3, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.15);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } catch {
      /* Audio non disponible */
    }
  }, []);

  return { playAlarmSound, unlock };
}
