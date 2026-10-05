import { useMemo, useState } from 'react';
import {
  Dumbbell, Activity, Plus, Play, User, Trash2, Upload, Pencil, Copy, Sparkles, Loader2, TrendingUp, TrendingDown,
  AlertTriangle, BarChart3, Scale, BatteryLow, UserCog, ScanLine, Settings, RotateCcw, Flame, CalendarCheck, Lightbulb,
} from 'lucide-react';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Card from '../components/ui/Card';
import { DEFAULT_ROUTINES } from '../data/routines';
import { categoryOf } from '../data/exercises';
import { buildHistorySummary } from '../utils/coach.core';
import { fetchCoachAnalysis, CoachError } from '../utils/coach';
import { weekSummary, nextRoutine } from '../utils/stats.core';
import { localDateKey, relativeDayLabel } from '../utils/dates.core';
import { formatTime } from '../utils/format';
import useOnlineStatus from '../hooks/useOnlineStatus';
import useNow from '../hooks/useNow';

const fmtVolume = (v) => (v >= 10000 ? `${Math.round(v / 1000)}k` : v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')}k` : String(Math.round(v)));

const TIPS = ['Vise 8 à 12 répétitions pour l’hypertrophie.', 'Pense à une semaine plus légère toutes les 6–8 semaines.', 'Dors 7 à 9 h : c’est là que tu progresses.', 'Environ 1,6–2 g de protéines par kg de poids de corps.', 'Contrôle la descente : 2–3 secondes.'];

export default function Dashboard({
  history,
  customRoutines,
  activeRoutine,
  sessionPhase,
  sessionDuration,
  lastFinishedSession,
  resumable,
  triggerSetup,
  startFreeSession,
  openSession,
  openScanner,
  openSettings,
  requestDeleteRoutine,
  resumeLastSession,
  onImportClick,
  onGenerateClick,
  onCreateClick,
  onEditRoutine,
  onDuplicateRoutine,
  coachAnalysis,
  onCoachAnalyzed,
  bodyAnalyses = [],
}) {
  const online = useOnlineStatus();
  const now = useNow(60_000);
  const today = localDateKey(now);
  const cachedToday = coachAnalysis && coachAnalysis.date === today ? coachAnalysis.data : null;
  const [coachStatus, setCoachStatus] = useState('idle'); // idle | loading | error
  const [coachError, setCoachError] = useState('');

  const week = useMemo(() => weekSummary(history, new Date(now)), [history, now]);
  const allRoutines = useMemo(() => [...customRoutines, ...DEFAULT_ROUTINES], [customRoutines]);
  const suggestion = useMemo(() => nextRoutine(allRoutines, history), [allRoutines, history]);

  const runCoachAnalysis = async () => {
    setCoachStatus('loading');
    setCoachError('');
    try {
      const summary = buildHistorySummary(history, categoryOf);
      const data = await fetchCoachAnalysis(summary, bodyAnalyses[0] || null);
      onCoachAnalyzed(data);
      setCoachStatus('idle');
    } catch (err) {
      setCoachError(err instanceof CoachError ? err.message : 'Coach IA indisponible, réessaie plus tard.');
      setCoachStatus('error');
    }
  };

  // Conseil « règle » (sans IA, hors ligne) basé sur le rythme et le volume récents.
  const tip = useMemo(() => {
    if (!history.length) return null;
    if (week.daysSinceLast !== null && week.daysSinceLast > 7) {
      return { tone: 'warning', icon: AlertTriangle, title: 'On reprend ?', text: 'Plus d’une semaine sans séance : une séance légère suffit pour relancer la machine.' };
    }
    const [last, ...rest] = history;
    const prevSame = rest.find((h) => h.routineName === last.routineName);
    if (prevSame) {
      const diff = last.totalVolume - prevSame.totalVolume;
      if (diff > 50) return { tone: 'success', icon: TrendingUp, title: 'Belle progression', text: `+${Math.round(diff)} kg de volume sur « ${last.routineName} » par rapport à la fois précédente.` };
      if (diff < -50) return { tone: 'neutral', icon: Activity, title: 'Volume en baisse', text: 'Normal de temps en temps : vérifie sommeil et récupération.' };
    }
    return { tone: 'info', icon: Lightbulb, title: 'Conseil du coach', text: TIPS[history.length % TIPS.length] };
  }, [history, week.daysSinceLast]);

  const toneClasses = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    neutral: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  const dateLabel = new Date(now).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const lastLabel = week.lastSession ? relativeDayLabel(week.lastSession.date, new Date(now)) : null;

  return (
    <div className="space-y-5 pb-nav fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white neon-text">MuscuGain</h1>
          <p className="text-slate-400 text-sm first-letter:uppercase">{dateLabel}</p>
        </div>
        <IconButton label="Réglages" onClick={openSettings}>
          <Settings size={22} />
        </IconButton>
      </header>

      {/* ── Prochaine action ── */}
      {activeRoutine ? (
        <section aria-label="Séance en cours" className="rounded-2xl p-5 bg-green-600/15 border border-green-500/40">
          <p className="text-xs font-bold uppercase tracking-wider text-green-400">Séance en cours</p>
          <h2 className="text-xl font-bold text-white mt-1 truncate">{activeRoutine.name}</h2>
          <p className="text-sm text-slate-300 mt-1">
            {sessionPhase === 'workout' ? <>Chrono <span className="font-mono tabular-nums">{formatTime(sessionDuration)}</span></> : sessionPhase === 'cooldown' ? 'Récupération : pense à enregistrer.' : 'Pas encore commencée.'}
          </p>
          <div className="grid grid-cols-[1fr_auto] gap-3 mt-4">
            <Button variant="success" onClick={openSession}><Play size={18} aria-hidden="true" /> Reprendre</Button>
            <Button variant="soft" onClick={openScanner} aria-label="Scanner une machine"><ScanLine size={20} aria-hidden="true" /></Button>
          </div>
        </section>
      ) : (
        <section aria-label="Prochaine séance" className="rounded-2xl p-5 bg-blue-600/15 border border-blue-500/40">
          {suggestion && history.length > 0 ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Prochaine séance suggérée</p>
              <h2 className="text-xl font-bold text-white mt-1 truncate">{suggestion.routine.name}</h2>
              <p className="text-sm text-slate-300 mt-1">
                {suggestion.routine.exercises.length} exercices · {suggestion.lastDone ? `dernière fois ${relativeDayLabel(suggestion.lastDone, new Date(now))}` : 'jamais faite'}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Pour commencer</p>
              <h2 className="text-xl font-bold text-white mt-1">Ta première séance</h2>
              <p className="text-sm text-slate-300 mt-1">Lance un programme d’exemple, ou une séance libre en scannant les machines au fil de l’eau.</p>
            </>
          )}
          <Button fullWidth className="mt-4" onClick={() => triggerSetup(suggestion ? suggestion.routine : allRoutines[0])}>
            <Play size={18} aria-hidden="true" /> Commencer
          </Button>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Button variant="secondary" onClick={startFreeSession}><Dumbbell size={18} aria-hidden="true" /> Séance libre</Button>
            <Button variant="soft" onClick={openScanner}><ScanLine size={18} aria-hidden="true" /> Scanner</Button>
          </div>
        </section>
      )}

      {resumable && lastFinishedSession && (
        <section aria-label="Séance à reprendre" className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/40 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-amber-400 font-bold text-sm">Oublié une série ?</h3>
            <p className="text-xs text-slate-300 truncate">Rouvre « {lastFinishedSession.activeRoutine?.name} » (terminée il y a moins de 2 h).</p>
          </div>
          <Button variant="warning" onClick={resumeLastSession} className="shrink-0 text-sm"><RotateCcw size={16} aria-hidden="true" /> Reprendre</Button>
        </section>
      )}

      {/* ── Semaine ── */}
      <section aria-label="Cette semaine" className="grid grid-cols-3 gap-3">
        <Card className="flex flex-col items-center justify-center py-4 px-2 text-center">
          <CalendarCheck size={18} className="text-blue-400 mb-1" aria-hidden="true" />
          <span className="text-2xl font-bold text-white tabular-nums">{week.thisWeek.sessions}</span>
          <span className="text-[11px] text-slate-400 leading-tight">séance{week.thisWeek.sessions > 1 ? 's' : ''} cette semaine</span>
        </Card>
        <Card className="flex flex-col items-center justify-center py-4 px-2 text-center">
          {week.volumeTrendPct !== null && week.volumeTrendPct < 0
            ? <TrendingDown size={18} className="text-amber-400 mb-1" aria-hidden="true" />
            : <TrendingUp size={18} className="text-green-400 mb-1" aria-hidden="true" />}
          <span className="text-2xl font-bold text-white tabular-nums">{fmtVolume(week.thisWeek.volume)}</span>
          <span className="text-[11px] text-slate-400 leading-tight">
            kg soulevés{week.volumeTrendPct !== null && <> · <span className={week.volumeTrendPct < 0 ? 'text-amber-400' : 'text-green-400'}>{week.volumeTrendPct > 0 ? '+' : ''}{week.volumeTrendPct} %</span></>}
          </span>
        </Card>
        <Card className="flex flex-col items-center justify-center py-4 px-2 text-center">
          <Flame size={18} className="text-orange-400 mb-1" aria-hidden="true" />
          <span className="text-2xl font-bold text-white tabular-nums">{week.weekStreak}</span>
          <span className="text-[11px] text-slate-400 leading-tight">sem. d’affilée</span>
        </Card>
      </section>
      {lastLabel && (
        <p className="text-xs text-slate-500 -mt-2 text-center">
          Dernière séance {lastLabel} · {history.length} au total
        </p>
      )}

      {tip && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${toneClasses[tip.tone]}`}>
          <tip.icon size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="font-bold text-sm">{tip.title}</h3>
            <p className="text-sm text-slate-300 mt-0.5">{tip.text}</p>
          </div>
        </div>
      )}

      {/* ── Coach IA — bilan de l'historique ── */}
      {history.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-900/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-500/20 text-blue-400"><Sparkles size={18} aria-hidden="true" /></div>
              <h2 className="font-bold text-white">Coach IA</h2>
            </div>
            {cachedToday && coachStatus !== 'loading' && online && (
              <button type="button" onClick={runCoachAnalysis} className="min-h-11 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors">
                <Sparkles size={13} aria-hidden="true" /> Rafraîchir
              </button>
            )}
          </div>

          {coachStatus === 'loading' && (
            <div role="status" className="flex items-center gap-2 text-slate-300 text-sm py-4 justify-center">
              <Loader2 size={18} className="animate-spin text-blue-400" aria-hidden="true" /> Analyse en cours…
            </div>
          )}

          {coachStatus === 'error' && (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-amber-400">{coachError}</p>
              <Button onClick={runCoachAnalysis} disabled={!online} className="text-sm"><Sparkles size={15} aria-hidden="true" /> Réessayer</Button>
            </div>
          )}

          {coachStatus === 'idle' && !cachedToday && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">Un bilan personnalisé de ta progression à partir de ton historique (résumé chiffré, rien d’autre).</p>
              <Button onClick={runCoachAnalysis} fullWidth disabled={!online} className="text-sm">
                <Sparkles size={16} aria-hidden="true" /> {online ? 'Demander un bilan' : 'Disponible en ligne'}
              </Button>
            </div>
          )}

          {coachStatus === 'idle' && cachedToday && (
            <div className="space-y-4 fade-in">
              {cachedToday.overview && <p className="text-sm text-slate-200 leading-relaxed">{cachedToday.overview}</p>}
              {cachedToday.progression.length > 0 && (
                <CoachSection icon={TrendingUp} iconColor="text-green-400" title="Progression">
                  <BulletList items={cachedToday.progression} dot="bg-green-400" text="text-green-300" />
                </CoachSection>
              )}
              {cachedToday.plateaus.length > 0 && (
                <CoachSection icon={AlertTriangle} iconColor="text-amber-400" title="Plateaux">
                  <BulletList items={cachedToday.plateaus} dot="bg-amber-400" text="text-amber-300" />
                </CoachSection>
              )}
              {cachedToday.weeklyVolume && <CoachText icon={BarChart3} title="Volume hebdo" text={cachedToday.weeklyVolume} />}
              {cachedToday.balance && <CoachText icon={Scale} title="Équilibre" text={cachedToday.balance} />}
              {cachedToday.deload && <CoachText icon={BatteryLow} iconColor="text-amber-400" title="Deload" text={cachedToday.deload} />}
              {cachedToday.bodyCross && <CoachText icon={UserCog} title="Corps × training" text={cachedToday.bodyCross} />}
            </div>
          )}
        </Card>
      )}

      {/* ── Programmes ── */}
      <section aria-labelledby="programs-title" className="pt-2">
        <h2 id="programs-title" className="text-lg font-semibold text-white mb-3">Programmes</h2>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="soft" onClick={onGenerateClick} disabled={!online} className="text-xs px-2"><Sparkles size={16} aria-hidden="true" /> IA</Button>
          <Button variant="secondary" onClick={onImportClick} className="text-xs px-2"><Upload size={16} aria-hidden="true" /> Importer</Button>
          <Button variant="soft" onClick={onCreateClick} className="text-xs px-2"><Plus size={16} aria-hidden="true" /> Créer</Button>
        </div>
      </section>

      <div className="space-y-4">
        {customRoutines.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider ml-1">Mes programmes</h3>
            {customRoutines.map((routine) => (
              <Card key={routine.id} className="relative overflow-hidden border-blue-500/30 bg-slate-800/80">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-400 pointer-events-none" aria-hidden="true"><User size={60} /></div>
                <div className="relative z-10 flex items-start gap-1">
                  <div className="flex-1 min-w-0 pt-2">
                    <h4 className="text-lg font-bold text-white truncate">{routine.name}</h4>
                    <p className="text-slate-400 text-sm">{routine.exercises.length} exercices · {routine.desc || 'Personnalisé'}</p>
                  </div>
                  <IconButton label={`Modifier ${routine.name}`} tone="blue" onClick={() => onEditRoutine(routine)}><Pencil size={17} /></IconButton>
                  <IconButton label={`Dupliquer ${routine.name}`} tone="blue" onClick={() => onDuplicateRoutine(routine)}><Copy size={17} /></IconButton>
                  <IconButton label={`Supprimer ${routine.name}`} tone="danger" onClick={() => requestDeleteRoutine(routine.id)}><Trash2 size={17} /></IconButton>
                </div>
                <Button fullWidth variant="secondary" onClick={() => triggerSetup(routine)} className="mt-3 relative z-10" disabled={!!activeRoutine}>
                  Commencer <Play size={16} aria-hidden="true" />
                </Button>
              </Card>
            ))}
          </div>
        )}

        <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider ml-1">Exemples</h3>
        {DEFAULT_ROUTINES.map((routine) => (
          <Card key={routine.id} className="relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none" aria-hidden="true"><Activity size={60} /></div>
            <h4 className="text-lg font-bold text-white">{routine.name}</h4>
            <p className="text-slate-400 text-sm mb-3 line-clamp-2">{routine.desc}</p>
            <Button fullWidth onClick={() => triggerSetup(routine)} disabled={!!activeRoutine}>
              Commencer <Play size={16} aria-hidden="true" />
            </Button>
          </Card>
        ))}
        {activeRoutine && <p className="text-xs text-slate-500 text-center">Termine ou annule la séance en cours pour en démarrer une autre.</p>}
      </div>
    </div>
  );
}

function CoachSection({ icon: Icon, iconColor, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon size={15} className={iconColor} aria-hidden="true" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CoachText({ icon, iconColor = 'text-blue-400', title, text }) {
  return (
    <CoachSection icon={icon} iconColor={iconColor} title={title}>
      <p className="text-sm text-slate-200 mt-1 leading-relaxed">{text}</p>
    </CoachSection>
  );
}

function BulletList({ items, dot, text }) {
  return (
    <ul className="space-y-1 mt-2">
      {items.map((t, i) => (
        <li key={i} className={`flex items-start gap-2 text-sm ${text}`}>
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
