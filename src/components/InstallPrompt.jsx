import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, MoreVertical } from 'lucide-react';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/.test(ua);

    if (isIOS) {
      setPlatform('ios');
      setShowPrompt(true);
    } else if (isAndroid) {
      setPlatform('android');
      setShowPrompt(true);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 border-t border-slate-700 p-4 shadow-2xl fade-in">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Download className="text-white" size={20} />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Installer l'application</h4>
            <p className="text-xs text-slate-400">Pour une meilleure expérience</p>
          </div>
        </div>
        <button onClick={() => setShowPrompt(false)} className="text-slate-500 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="text-sm text-slate-300 mt-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
        {platform === 'ios' ? (
          <div className="flex items-center gap-2">
            <span>Appuyez sur</span>
            <Share size={16} className="text-blue-400" />
            <span>puis <strong>"Sur l'écran d'accueil"</strong></span>
            <PlusSquare size={16} className="text-slate-400" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span>Appuyez sur le menu</span>
            <MoreVertical size={16} className="text-slate-400" />
            <span>puis <strong>"Ajouter à l'écran d'accueil"</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
