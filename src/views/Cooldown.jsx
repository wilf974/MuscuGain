import { useMemo, useState } from 'react';
import { Wind, X, Trophy, Dumbbell, ChevronLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import { formatTime, formatDuration, calculateVolume } from '../utils/format';
import { detectNewPRs, detectRepPRs } from '../utils/records.core';

export default function Cooldown({ cancelSession, backToWorkout, phaseTimer, sessionDuration, workoutData, saveAndExit, history, previousNotes = '' }) {
  // Memo : la vue re-render 2×/s (timers App), pas besoin de rescanner l'historique.
  const newPRs = useMemo(() => detectNewPRs(history || [], { exercises: workoutData }), [history, workoutData]);
  const repPRs = useMemo(() => detectRepPRs(history || [], { exercises: workoutData }), [history, workoutData]);
  const [notes, setNotes] = useState(previousNotes);
  const [saving, setSaving] = useState(false);
  const doneSets = Object.values(workoutData).flat().filter((s) => s && s.done).length;

  return (
    <div className="min-h-screen-safe flex flex-col items-center justify-center py-6 text-center fade-in pb-24 relative">
      <div className="absolute top-0 inset-x-0 flex justify-between z-20">
        <IconButton label="Retour à la séance" onClick={backToWorkout}><ChevronLeft size={24} /></IconButton>
        <IconButton label="Annuler la séance" tone="danger" onClick={cancelSession}><X size={22} /></IconButton>
      </div>
      <div className="bg-blue-400/10 p-6 rounded-full mb-6">
        <Wind size={64} className="text-blue-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Récupération</h1>
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

      {repPRs.length > 0 && (
        <div className="w-full max-w-sm mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-left fade-in">
          <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
            <Dumbbell size={18} /> Record{repPRs.length > 1 ? 's' : ''} de répétitions !
          </div>
          <ul className="space-y-1">
            {repPRs.map((pr) => (
              <li key={pr.exercise} className="text-sm text-slate-300">
                <span className="font-semibold text-white">{pr.exercise}</span> — {pr.reps} reps à {pr.weight} kg (avant : {pr.prevReps})
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
      {doneSets === 0 && (
        <p role="status" className="w-full max-w-sm mb-4 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-left">
          Aucune série validée : la séance sera enregistrée avec un volume de 0 kg.
        </p>
      )}
      <div className="w-full max-w-sm mb-4 text-left">
        <label htmlFor="session-notes" className="block text-xs text-slate-500 uppercase font-bold mb-1">Notes (optionnel)</label>
        <textarea
          id="session-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ressenti, douleurs, remarques…"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none resize-none"
        />
      </div>
      <Button
        fullWidth
        variant="success"
        disabled={saving}
        onClick={() => { setSaving(true); if (saveAndExit(notes) === false) setSaving(false); }}
        className="max-w-sm"
      >
        Enregistrer et quitter
      </Button>
    </div>
  );
}
