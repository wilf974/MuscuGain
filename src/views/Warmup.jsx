import { Flame, X } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatTime } from '../utils/format';

export default function Warmup({ cancelSession, phaseTimer, startMainWorkout }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in pb-24 relative">
      <button onClick={cancelSession} className="absolute top-6 left-6 text-slate-400 hover:text-white z-20"><X size={24} /></button>
      <div className="bg-orange-500/10 p-6 rounded-full mb-6 relative">
        <Flame size={64} className="text-orange-500" />
        <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse"></div>
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Échauffement</h2>
      <div className="text-6xl font-mono font-bold text-orange-400 mb-12 tabular-nums">{formatTime(phaseTimer)}</div>
      <Button fullWidth onClick={startMainWorkout} className="bg-orange-600 hover:bg-orange-500 shadow-orange-900/50 max-w-sm">
        Passer à la séance
      </Button>
    </div>
  );
}
