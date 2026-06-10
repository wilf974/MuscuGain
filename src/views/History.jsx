import { useState } from 'react';
import { CalendarX, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import Card from '../components/ui/Card';
import { formatDuration } from '../utils/format';

export default function History({ history, requestDeleteHistory }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-6 pb-24 fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Historique</h1>
      </header>
      {history.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <CalendarX size={48} className="mx-auto mb-4 opacity-50" />
          <p>Aucune séance enregistrée.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((session, idx) => {
            const isOpen = expanded === idx;
            return (
              <Card key={idx}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{session.routineName}</h3>
                      <button type="button" onClick={() => requestDeleteHistory(idx)} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="bg-slate-700 px-2 py-1 rounded text-xs font-mono text-blue-300 inline-block mb-1">
                      {Math.round(session.totalVolume)} kg
                    </div>
                    {session.durationSeconds > 0 && (
                      <div className="text-xs text-slate-500">⏱ {formatDuration(session.durationSeconds)}</div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : idx)}
                  className="w-full text-sm text-slate-400 border-t border-slate-700/50 pt-2 mt-2 flex items-center justify-between hover:text-slate-200 transition-colors"
                >
                  <span>{Object.keys(session.exercises).length} exercices complétés</span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isOpen && (
                  <div className="mt-3 space-y-3 fade-in">
                    {Object.entries(session.exercises).map(([exName, sets]) => (
                      <div key={exName} className="bg-slate-900/60 rounded-lg p-3">
                        <div className="text-sm font-semibold text-white mb-2">{exName}</div>
                        <div className="space-y-1">
                          {sets.map((set, i) => {
                            const empty = !set.weight;
                            return (
                              <div key={i} className={`flex items-center justify-between text-xs ${empty ? 'text-slate-600' : 'text-slate-300'}`}>
                                <span>Série {i + 1}</span>
                                <span className="font-mono">{set.weight || '–'} kg × {set.reps || '–'}</span>
                                {set.done ? <Check size={14} className="text-green-400" /> : <span className="w-3.5" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
