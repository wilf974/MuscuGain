import { Flame, X } from 'lucide-react';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import { formatTime } from '../utils/format';

export default function Warmup({ cancelSession, phaseTimer, startMainWorkout }) {
  return (
    <div className="min-h-screen-safe flex flex-col items-center justify-center py-6 text-center fade-in pb-24 relative">
      <div className="absolute top-0 left-0 z-20">
        <IconButton label="Annuler la séance" onClick={cancelSession}><X size={24} /></IconButton>
      </div>
      <div className="bg-orange-500/10 p-6 rounded-full mb-6 relative">
        <Flame size={64} className="text-orange-500" />
        <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse"></div>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Échauffement</h1>
      <div role="timer" className="text-6xl font-mono font-bold text-orange-400 mb-4 tabular-nums">{formatTime(phaseTimer)}</div>
      <p className="text-sm text-slate-400 mb-8 max-w-xs">
        {phaseTimer === 0 ? 'Échauffement terminé : à toi de jouer !' : 'Cardio léger, mobilité, puis 1–2 séries légères du premier exercice.'}
      </p>
      <Button fullWidth onClick={startMainWorkout} variant={phaseTimer === 0 ? 'success' : 'primary'} className="max-w-sm">
        {phaseTimer === 0 ? 'Commencer la séance' : 'Passer à la séance'}
      </Button>
    </div>
  );
}
