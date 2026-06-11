import { useMemo } from 'react';
import { Dumbbell, Activity, Plus, Play, User, Trash2, Upload, Pencil, Copy } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { DEFAULT_ROUTINES } from '../data/routines';

export default function Dashboard({
  history,
  customRoutines,
  activeRoutine,
  lastFinishedSession,
  setView,
  triggerSetup,
  startFreeSession,
  requestDeleteRoutine,
  resumeLastSession,
  canResumeSession,
  onImportClick,
  onCreateClick,
  onEditRoutine,
  onDuplicateRoutine,
}) {
  const coachAdvice = useMemo(() => {
    if (history.length === 0) {
      return { type: 'info', title: 'Bienvenue !', text: "Complétez votre première séance pour débloquer l'analyse du coach.", icon: 'star' };
    }
    const lastSession = history[0];
    const daysSinceLast = Math.floor((Date.now() - new Date(lastSession.date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLast > 7) {
      return { type: 'warning', title: 'Attention au rythme', text: "Cela fait plus d'une semaine. La régularité est la clé.", icon: 'alert-triangle' };
    }
    const previousSameRoutine = history.slice(1).find((h) => h.routineName === lastSession.routineName);
    if (previousSameRoutine) {
      const volDiff = lastSession.totalVolume - previousSameRoutine.totalVolume;
      if (volDiff > 50) return { type: 'success', title: 'Excellente progression !', text: `Volume augmenté de ${Math.round(volDiff)}kg. Continuez !`, icon: 'trending-up' };
      else if (volDiff < -50) return { type: 'neutral', title: 'Volume en baisse', text: 'Volume en baisse. Assurez-vous de bien récupérer.', icon: 'activity' };
    }
    const tips = ['Visez 8-12 répétitions.', 'Pensez à la semaine de décharge.', 'Dormez 7-9h.', 'Mangez ~1.8g de protéines/kg.', 'Contrôlez la descente.'];
    return { type: 'info', title: 'Conseil du Coach', text: tips[history.length % tips.length], icon: 'lightbulb' };
  }, [history]);

  const coachColors = {
    success: { bg: 'bg-green-900/20 border-green-500/30', badge: 'bg-green-500/20 text-green-400', text: 'text-green-400' },
    warning: { bg: 'bg-orange-900/20 border-orange-500/30', badge: 'bg-orange-500/20 text-orange-400', text: 'text-orange-400' },
    info: { bg: 'bg-blue-900/20 border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400', text: 'text-blue-400' },
    neutral: { bg: 'bg-blue-900/20 border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400', text: 'text-blue-400' },
  };
  const colors = coachColors[coachAdvice.type] || coachColors.info;

  // Map icon names to lucide-react components dynamically
  const iconMap = {
    star: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    'alert-triangle': () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
    'trending-up': () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    activity: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    lightbulb: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>,
  };
  const CoachIcon = iconMap[coachAdvice.icon] || iconMap.lightbulb;

  return (
    <div className="space-y-6 pb-24 fade-in">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white neon-text">MuscuGain</h1>
          <p className="text-slate-400 text-sm">Mode Local &bull; Privé</p>
        </div>
        <div className="bg-slate-800 p-2 rounded-full">
          <Dumbbell className="text-blue-500" size={20} />
        </div>
      </header>

      {/* Coach */}
      <div className={`p-4 rounded-xl border flex items-start gap-4 shadow-lg ${colors.bg}`}>
        <div className={`p-2 rounded-full ${colors.badge}`}><CoachIcon /></div>
        <div>
          <h3 className={`font-bold ${colors.text}`}>{coachAdvice.title}</h3>
          <p className="text-sm text-slate-300 mt-1">{coachAdvice.text}</p>
        </div>
      </div>

      {/* Active session */}
      {activeRoutine && (
        <div className="bg-blue-600/20 border border-blue-500/50 rounded-xl p-4 mb-6 flex justify-between items-center animate-pulse-soft">
          <div>
            <h3 className="text-blue-400 font-bold">Séance en cours</h3>
            <p className="text-xs text-blue-200">{activeRoutine.name}</p>
          </div>
          <Button onClick={() => setView('workout')} className="py-2 text-xs">Reprendre</Button>
        </div>
      )}

      {/* Resume session */}
      {!activeRoutine && canResumeSession() && (
        <div className="bg-amber-600/20 border border-amber-500/50 rounded-xl p-4 mb-6 flex justify-between items-center animate-pulse-soft">
          <div>
            <h3 className="text-amber-400 font-bold">Séance à reprendre</h3>
            <p className="text-xs text-amber-200">{lastFinishedSession?.activeRoutine?.name}</p>
          </div>
          <Button onClick={resumeLastSession} className="py-2 text-xs bg-amber-600 hover:bg-amber-500">Reprendre</Button>
        </div>
      )}

      {/* Séance libre */}
      {!activeRoutine && (
        <Button fullWidth onClick={startFreeSession} className="bg-blue-600 hover:bg-blue-500 shadow-blue-900/50">
          <Play size={16} /> Séance libre
        </Button>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center justify-center py-6">
          <span className="text-3xl font-bold text-blue-400">{history.length}</span>
          <span className="text-xs text-slate-400 uppercase tracking-wide mt-1">Séances</span>
        </Card>
        <Card className="flex flex-col items-center justify-center py-6">
          <span className="text-3xl font-bold text-green-400">
            {history.length > 0 ? Math.round(history.reduce((acc, curr) => acc + curr.totalVolume, 0) / 1000) + 'k' : '0'}
          </span>
          <span className="text-xs text-slate-400 uppercase tracking-wide mt-1">Volume (kg)</span>
        </Card>
      </div>

      {/* Programmes */}
      <div className="flex justify-between items-end mt-8 mb-4">
        <h2 className="text-lg font-semibold text-white">Programmes</h2>
        <div className="flex items-center gap-2">
          <button onClick={onImportClick} className="bg-slate-700/50 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-slate-600">
            <Upload size={14} /> Importer
          </button>
          <button onClick={onCreateClick} className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-blue-500/30">
            <Plus size={14} /> Créer
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {customRoutines.length > 0 && (
          <div className="space-y-4 mb-6">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider ml-1">Mes Programmes</div>
            {customRoutines.map((routine) => (
              <Card key={routine.id} className="relative overflow-hidden group border-blue-500/30 bg-slate-800/80">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-400"><User size={60} /></div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{routine.name}</h3>
                      <button type="button" onClick={() => onEditRoutine(routine)} className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 p-1 rounded transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => onDuplicateRoutine(routine)} className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 p-1 rounded transition-colors">
                        <Copy size={14} />
                      </button>
                      <button type="button" onClick={() => requestDeleteRoutine(routine.id)} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-4 line-clamp-1">{routine.exercises.length} exercices &bull; Personnalisé</p>
                <Button fullWidth onClick={() => triggerSetup(routine)} className="bg-slate-700 hover:bg-blue-600 transition-colors">
                  Commencer <Play size={16} />
                </Button>
              </Card>
            ))}
          </div>
        )}

        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider ml-1">Exemples</div>
        {DEFAULT_ROUTINES.map((routine) => (
          <Card key={routine.id} className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={60} /></div>
            <h3 className="text-xl font-bold text-white">{routine.name}</h3>
            <p className="text-slate-400 text-sm mb-4 line-clamp-1">{routine.desc}</p>
            <Button fullWidth onClick={() => triggerSetup(routine)}>
              Commencer <Play size={16} />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
