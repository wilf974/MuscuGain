import { useState } from 'react';
import { Wind, X, Trophy } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatTime, formatDuration, calculateVolume } from '../utils/format';
import { detectNewPRs } from '../utils/records.core';

export default function Cooldown({ cancelSession, phaseTimer, sessionDuration, workoutData, saveAndExit, history }) {
  const newPRs = detectNewPRs(history || [], { exercises: workoutData });
  const [notes, setNotes] = useState('');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in pb-24 relative">
      <button onClick={cancelSession} className="absolute top-6 left-6 text-slate-400 hover:text-white z-20"><X size={24} /></button>
      <div className="bg-blue-400/10 p-6 rounded-full mb-6">
        <Wind size={64} className="text-blue-400" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Récupération</h2>
      <div className="text-6xl font-mono font-bold text-blue-300 mb-8 tabular-nums">{formatTime(phaseTimer)}</div>

      {newPRs.length > 0 && (
        <div className="w-full max-w-sm mb-6 bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-left fade-in">
          <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
            <Trophy size={18} /> Nouveau{newPRs.length > 1 ? 'x' : ''} record{newPRs.length > 1 ? 's' : ''} !
          </div>
          <ul className="space-y-1">
            {newPRs.map((pr) => (
              <li key={pr.exercise} className="text-sm text-amber-200 flex justify-between">
                <span>{pr.exercise}</span>
                <span className="font-mono font-bold">{pr.weight} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
        <div className="bg-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-500 uppercase font-bold mb-1">Durée</div>
          <div className="text-xl font-bold text-white">{formatDuration(sessionDuration)}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-500 uppercase font-bold mb-1">Volume</div>
          <div className="text-xl font-bold text-green-400">{Math.round(calculateVolume(workoutData))} kg</div>
        </div>
      </div>
      <div className="w-full max-w-sm mb-4 text-left">
        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Notes (optionnel)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ressenti, douleurs, remarques…"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none resize-none"
        />
      </div>
      <Button fullWidth onClick={() => saveAndExit(notes)} className="bg-green-600 hover:bg-green-500 shadow-green-900/50 max-w-sm">
        Enregistrer et Quitter
      </Button>
    </div>
  );
}
