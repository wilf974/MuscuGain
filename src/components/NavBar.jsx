import { LayoutDashboard, Dumbbell, History } from 'lucide-react';

export default function NavBar({ view, setView, activeRoutine }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-safe pt-2 px-6">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        <button
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'dashboard' ? 'text-blue-500' : 'text-slate-500'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-medium">Accueil</span>
        </button>
        <div className="relative -top-6">
          <button
            onClick={() => {
              if (['workout', 'warmup', 'cooldown', 'setup'].includes(view)) return;
              if (activeRoutine) setView('workout');
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/40 border-4 border-slate-900 transition-transform active:scale-95 ${
              ['workout', 'warmup', 'cooldown', 'setup'].includes(view)
                ? 'bg-green-500 text-slate-900'
                : 'bg-blue-600 text-white'
            }`}
          >
            <Dumbbell size={24} />
          </button>
        </div>
        <button
          onClick={() => setView('history')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'history' ? 'text-blue-500' : 'text-slate-500'}`}
        >
          <History size={20} />
          <span className="text-[10px] font-medium">Historique</span>
        </button>
      </div>
    </div>
  );
}
