import { X, AlertCircle, Youtube, Search, Info } from 'lucide-react';
import { VIDEO_MAPPING } from '../../data/videos';

export default function VideoModal({ exerciseName, onClose }) {
  const videoId = VIDEO_MAPPING[exerciseName];
  const youtubeWebUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const searchUrl = `https://www.youtube.com/results?search_query=technique+execution+${encodeURIComponent(exerciseName)}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm fade-in" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50">
          <h3 className="font-bold text-white text-lg pr-4 truncate">{exerciseName}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {videoId ? (
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-lg border border-slate-700">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-0 p-4 text-center">
                  <AlertCircle size={32} className="mb-2 opacity-50" />
                  <span className="text-xs">Si la vidéo ne charge pas (Erreur 150/153), le propriétaire l'a bloquée sur les sites externes.</span>
                </div>
                <iframe
                  className="relative z-10 w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&origin=${window.location.origin}`}
                  title={exerciseName}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                ></iframe>
              </div>

              <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-700/50">
                <p className="text-sm text-slate-300 mb-3 font-medium flex items-center gap-2">
                  <Info size={16} className="text-blue-400" />
                  La vidéo ne se lance pas ?
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <a
                    href={youtubeWebUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg font-bold transition-all shadow-lg active:scale-95"
                  >
                    <Youtube size={20} />
                    Ouvrir dans l'app YouTube
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
                <Search size={32} className="text-red-500" />
              </div>
              <h4 className="text-white font-bold mb-2">Pas de vidéo intégrée</h4>
              <p className="text-slate-400 text-sm mb-6 px-4">Nous n'avons pas encore sélectionné de tutoriel spécifique pour cet exercice.</p>
              <a
                href={searchUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95"
              >
                <Search size={18} />
                Rechercher sur YouTube
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
