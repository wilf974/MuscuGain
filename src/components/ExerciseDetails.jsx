// Fiche exercice : groupe musculaire, conseils de sécurité, état de la vidéo.
// Ne montre une vidéo que si l'ID provient du mapping existant et est valide.
import { ShieldCheck, Dumbbell, PlayCircle, VideoOff } from 'lucide-react';
import { SAFETY_DISCLAIMER } from '../data/safety';

export default function ExerciseDetails({ info, onPlayVideo, compact = false }) {
  if (!info) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
          <Dumbbell size={13} aria-hidden="true" /> {info.muscleLabel}
        </span>
        {!info.known && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Hors catalogue
          </span>
        )}
      </div>

      {info.videoId ? (
        onPlayVideo && (
          <button
            type="button"
            onClick={onPlayVideo}
            className="w-full min-h-11 flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-700 hover:border-red-500/50 transition-colors text-left"
          >
            <img
              src={`https://i.ytimg.com/vi/${info.videoId}/mqdefault.jpg`}
              alt=""
              loading="lazy"
              className="w-24 h-14 rounded-lg object-cover bg-slate-800 shrink-0"
            />
            <span className="flex-1 text-sm font-semibold text-white">Voir la démo vidéo</span>
            <PlayCircle size={22} className="text-red-400 shrink-0" aria-hidden="true" />
          </button>
        )
      ) : (
        <p className="flex items-start gap-2 text-xs text-slate-400 bg-slate-900/40 rounded-xl p-3 border border-slate-700/60">
          <VideoOff size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
          Pas encore de vidéo validée pour cet exercice.
        </p>
      )}

      <div className="rounded-xl p-3 bg-green-500/10 border border-green-500/25">
        <h4 className="flex items-center gap-2 text-sm font-bold text-green-400 mb-1.5">
          <ShieldCheck size={16} aria-hidden="true" /> Sécurité
        </h4>
        <ul className="space-y-1">
          {(compact ? info.safetyTips.slice(0, 2) : info.safetyTips).map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm text-slate-200">
              <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0 bg-green-400" aria-hidden="true" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500 mt-2">{SAFETY_DISCLAIMER}</p>
      </div>
    </div>
  );
}
