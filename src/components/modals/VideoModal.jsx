import { Youtube, Search } from 'lucide-react';
import Sheet from '../ui/Sheet';
import ExerciseDetails from '../ExerciseDetails';
import { exerciseInfo, buildCatalogIndex } from '../../utils/scanner.core';
import { loadCustomExercises } from '../../data/customExercises';

// Fiche exercice + démo vidéo (ID YouTube du mapping existant uniquement).
export default function VideoModal({ exerciseName, onClose }) {
  const isOpen = !!exerciseName;
  const info = isOpen ? exerciseInfo(exerciseName, buildCatalogIndex(loadCustomExercises())) : null;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName || ''} technique exécution`)}`;

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={exerciseName} size="lg" z="z-[90]">
      {info && (
        <div className="space-y-4">
          {info.videoId && (
            <div className="space-y-2">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-slate-700">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${info.videoId}?rel=0&modestbranding=1&playsinline=1`}
                  title={`Démo vidéo : ${info.exercise}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  loading="lazy"
                />
              </div>
              <a
                href={`https://www.youtube.com/watch?v=${info.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-11 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-onaccent px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
              >
                <Youtube size={18} aria-hidden="true" /> La vidéo ne se lance pas ? Ouvrir dans YouTube
              </a>
            </div>
          )}
          <ExerciseDetails info={info} />
          {!info.videoId && (
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 flex items-center justify-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 rounded-xl border border-slate-700 px-4"
            >
              <Search size={16} aria-hidden="true" /> Rechercher sur YouTube (résultats non vérifiés)
            </a>
          )}
        </div>
      )}
    </Sheet>
  );
}
