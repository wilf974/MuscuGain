import { Settings2, X } from 'lucide-react';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';

export default function SessionSetup({ routineName, exerciseCount = 0, cancelSession, targetWarmupTime, setTargetWarmupTime, confirmSetupAndStart }) {
  return (
    <div className="min-h-screen-safe flex flex-col items-center justify-center py-6 text-center fade-in pb-24 relative">
      <div className="absolute top-0 left-0 z-20">
        <IconButton label="Annuler la séance" onClick={cancelSession}><X size={24} /></IconButton>
      </div>
      <div className="bg-slate-800/50 p-6 rounded-2xl w-full max-w-sm border border-slate-700">
        <div className="mb-6">
          <Settings2 size={48} className="text-blue-400 mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-white">{routineName || 'Configuration'}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {exerciseCount > 0 ? `${exerciseCount} exercice${exerciseCount > 1 ? 's' : ''}` : 'Séance libre : ajoute tes exercices au fil de l’eau'}
          </p>
        </div>
        <div className="mb-8">
          <h2 id="warmup-label" className="block text-xs text-slate-400 uppercase font-bold mb-3 text-left">Durée échauffement</h2>
          <div role="radiogroup" aria-labelledby="warmup-label" className="grid grid-cols-2 gap-2 mb-2">
            {[5, 10, 15].map((min) => (
              <button
                type="button"
                role="radio"
                aria-checked={targetWarmupTime === min * 60}
                key={min}
                onClick={() => setTargetWarmupTime(min * 60)}
                className={`min-h-11 py-3 rounded-xl font-bold text-sm transition-all ${
                  targetWarmupTime === min * 60
                    ? 'bg-blue-600 text-onaccent shadow-lg shadow-blue-900/40'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {min} min
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={targetWarmupTime === 0}
              onClick={() => setTargetWarmupTime(0)}
              className={`min-h-11 py-3 rounded-xl font-bold text-sm transition-all ${
                targetWarmupTime === 0
                  ? 'bg-slate-600 text-white border-2 border-slate-500'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Aucun
            </button>
          </div>
          <div className="text-xs text-right text-slate-500">
            {targetWarmupTime > 0 ? `Décompte de ${Math.floor(targetWarmupTime / 60)} minutes` : "Pas d'échauffement"}
          </div>
        </div>
        <Button fullWidth variant="success" onClick={confirmSetupAndStart} className="text-lg py-4">
          C'est parti !
        </Button>
      </div>
    </div>
  );
}
