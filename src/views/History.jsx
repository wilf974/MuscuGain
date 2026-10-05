import { useMemo, useState } from 'react';
import { CalendarX, Trash2, ChevronDown, Check, Trophy, Clock, Dumbbell } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import { formatDuration } from '../utils/format';
import { computePRs, compute1RMs, epley1RM } from '../utils/records.core';
import { prCountBySession, weekSummary } from '../utils/stats.core';
import VolumeChart from '../components/ui/VolumeChart';
import LineChart from '../components/ui/LineChart';

const PAGE = 20;

const monthLabel = (iso) => new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
const dayLabel = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const timeLabel = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmtKg = (v) => `${Math.round(v).toLocaleString('fr-FR')} kg`;

export default function History({ history, requestDeleteHistory }) {
  const [expanded, setExpanded] = useState(null);
  const [chartExercise, setChartExercise] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const prs = useMemo(() => computePRs(history), [history]);
  const oneRMs = useMemo(() => compute1RMs(history), [history]);
  const prCounts = useMemo(() => prCountBySession(history), [history]);
  const week = useMemo(() => weekSummary(history), [history]);
  const exerciseNames = useMemo(
    () => [...new Set(history.flatMap((s) => Object.keys(s.exercises || {})))].sort((a, b) => a.localeCompare(b, 'fr')),
    [history],
  );

  // Poids max (série done) par séance pour l'exo choisi + 1RM estimé correspondant.
  const progressSeries = useMemo(() => {
    if (!chartExercise) return null;
    const maxPts = [];
    const rmPts = [];
    for (const s of history) {
      const sets = (s.exercises || {})[chartExercise];
      if (!sets) continue;
      let bestW = null;
      let bestRM = null;
      for (const set of sets) {
        if (!set.done) continue;
        const w = Number(set.weight);
        if (Number.isFinite(w) && w > 0 && (bestW === null || w > bestW)) bestW = w;
        const rm = epley1RM(set.weight, set.reps);
        if (rm !== null && (bestRM === null || rm > bestRM)) bestRM = rm;
      }
      if (bestW !== null) maxPts.push({ x: s.date, y: bestW });
      if (bestRM !== null) rmPts.push({ x: s.date, y: bestRM });
    }
    return [
      { label: 'Poids max', points: maxPts },
      { label: '1RM estimé', points: rmPts, color: '#f59e0b' },
    ];
  }, [history, chartExercise]);

  // Regroupement par mois (l'historique est trié récent → ancien).
  const groups = useMemo(() => {
    const out = [];
    for (const s of history.slice(0, limit)) {
      const m = monthLabel(s.date);
      if (!out.length || out[out.length - 1].month !== m) out.push({ month: m, sessions: [] });
      out[out.length - 1].sessions.push(s);
    }
    return out;
  }, [history, limit]);

  if (history.length === 0) {
    return (
      <div className="pb-nav fade-in">
        <h1 className="text-2xl font-bold text-white mb-6">Historique</h1>
        <div className="text-center py-12 text-slate-400">
          <CalendarX size={48} className="mx-auto mb-4 opacity-50" aria-hidden="true" />
          <p className="font-semibold text-slate-300">Aucune séance enregistrée.</p>
          <p className="text-sm mt-1">Termine une séance avec « Enregistrer » pour la retrouver ici.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-nav fade-in">
      <header>
        <h1 className="text-2xl font-bold text-white">Historique</h1>
        <p className="text-sm text-slate-400 mt-1">
          {history.length} séance{history.length > 1 ? 's' : ''} · {week.thisWeek.sessions} cette semaine
        </p>
      </header>

      <VolumeChart history={history} />

      {exerciseNames.length > 0 && (
        <div className="space-y-2">
          <label htmlFor="progress-exercise" className="text-xs font-bold uppercase tracking-wider text-slate-400">Progression par exercice</label>
          <select
            id="progress-exercise"
            value={chartExercise}
            onChange={(e) => setChartExercise(e.target.value)}
            className="w-full min-h-11 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Choisir un exercice…</option>
            {exerciseNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {progressSeries && <LineChart title={chartExercise} unit="kg" series={progressSeries} />}
          {chartExercise && oneRMs[chartExercise] && (
            <p className="text-xs text-slate-400">
              Record : <strong className="text-white">{prs[chartExercise] ?? '–'} kg</strong> · 1RM estimé : <strong className="text-white">{oneRMs[chartExercise]} kg</strong>
            </p>
          )}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.month} aria-label={g.month} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 sticky top-safe bg-slate-900/95 backdrop-blur py-2 z-10">{g.month}</h2>
          {g.sessions.map((session) => {
            const id = session.id;
            const isOpen = expanded === id;
            const prCount = prCounts[id] || 0;
            const exCount = Object.keys(session.exercises || {}).length;
            return (
              <Card key={id} className="p-0 overflow-hidden">
                <div className="flex items-start gap-1 p-4 pb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">{session.routineName}</h3>
                    <p className="text-xs text-slate-400 first-letter:uppercase">{dayLabel(session.date)} · {timeLabel(session.date)}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                      <span className="font-mono text-blue-300 bg-slate-700/60 px-2 py-0.5 rounded">{fmtKg(session.totalVolume || 0)}</span>
                      {session.durationSeconds > 0 && (
                        <span className="text-slate-400 flex items-center gap-1"><Clock size={12} aria-hidden="true" /> {formatDuration(session.durationSeconds)}</span>
                      )}
                      {prCount > 0 && (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <Trophy size={12} aria-hidden="true" /> {prCount} record{prCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <IconButton label={`Supprimer la séance ${session.routineName} du ${dayLabel(session.date)}`} tone="danger" onClick={() => requestDeleteHistory(id)}>
                    <Trash2 size={17} />
                  </IconButton>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : id)}
                  aria-expanded={isOpen}
                  aria-controls={`session-${id}`}
                  className="w-full min-h-11 px-4 text-sm text-slate-400 border-t border-slate-700/50 flex items-center justify-between hover:text-slate-200 transition-colors"
                >
                  <span className="flex items-center gap-1.5"><Dumbbell size={14} aria-hidden="true" /> {exCount} exercice{exCount > 1 ? 's' : ''}</span>
                  <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {isOpen && (
                  <div id={`session-${id}`} className="px-4 pb-4 space-y-3 fade-in">
                    {Object.entries(session.exercises || {}).map(([exName, sets]) => (
                      <div key={exName} className="bg-slate-900/60 rounded-xl p-3">
                        <div className="flex items-baseline justify-between gap-2 mb-2">
                          <div className="text-sm font-semibold text-white">{exName}</div>
                          {oneRMs[exName] && <div className="text-[11px] text-slate-500 font-mono shrink-0">1RM est. {oneRMs[exName]} kg</div>}
                        </div>
                        <table className="w-full text-sm">
                          <thead className="sr-only">
                            <tr><th>Série</th><th>Charge</th><th>Validée</th></tr>
                          </thead>
                          <tbody>
                            {sets.map((set, i) => {
                              const empty = !set.weight;
                              const isPR = set.done && Number(set.weight) > 0 && Number(set.weight) === prs[exName];
                              return (
                                <tr key={i} className={empty ? 'text-slate-500' : 'text-slate-300'}>
                                  <td className="py-0.5">
                                    <span className="flex items-center gap-1">
                                      Série {i + 1}
                                      {isPR && <Trophy size={12} className="text-amber-400" aria-label="Record" />}
                                    </span>
                                  </td>
                                  <td className="py-0.5 font-mono text-right tabular-nums">{set.weight || '–'} kg × {set.reps || '–'}</td>
                                  <td className="py-0.5 w-6 text-right">
                                    {set.done ? <Check size={15} className="inline text-green-400" aria-label="Validée" /> : <span className="sr-only">Non validée</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                    {session.notes && (
                      <div className="bg-slate-900/60 rounded-xl p-3">
                        <div className="text-xs font-semibold text-slate-400 mb-1">Notes</div>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{session.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </section>
      ))}

      {history.length > limit && (
        <Button variant="secondary" fullWidth onClick={() => setLimit((l) => l + PAGE)}>
          Afficher plus ({history.length - limit} restantes)
        </Button>
      )}
    </div>
  );
}
