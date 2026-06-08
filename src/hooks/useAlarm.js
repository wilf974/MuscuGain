import { useRef } from 'react';

export default function useAlarm() {
  const audioCtxRef = useRef(null);

  const playAlarmSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
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
  };

  return playAlarmSound;
}
