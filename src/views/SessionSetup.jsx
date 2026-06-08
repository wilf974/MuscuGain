import { Settings2, X } from 'lucide-react';
import Button from '../components/ui/Button';

export default function SessionSetup({ cancelSession, targetWarmupTime, setTargetWarmupTime, confirmSetupAndStart }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in pb-24 relative">
      <button onClick={cancelSession} className="absolute top-6 left-6 text-slate-400 hover:text-white"><X size={24} /></button>
      <div className="bg-slate-800/50 p-6 rounded-2xl w-full max-w-sm border border-slate-700">
        <div className="mb-6">
          <Settings2 size={48} className="text-blue-400 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-white">Configuration</h2>
        </div>
        <div className="mb-8">
          <label className="block text-xs text-slate-400 uppercase font-bold mb-3 text-left">Durée échauffement</label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[5, 10, 15].map((min) => (
              <button
                key={min}
                onClick={() => setTargetWarmupTime(min * 60)}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  targetWarmupTime === min * 60
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {min} min
              </button>
            ))}
            <button
              onClick={() => setTargetWarmupTime(0)}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${
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
        <Button fullWidth onClick={confirmSetupAndStart} className="bg-green-600 hover:bg-green-500 shadow-green-900/50 text-lg py-4">
          C'est parti !
        </Button>
      </div>
    </div>
  );
}
