// Bandeau d'installation compact (mobile uniquement) au-dessus de la barre d'onglets :
// une ligne, étapes dépliables, masqué 30 jours après fermeture.
// Android/Chrome : vrai bouton « Installer » via beforeinstallprompt.
import { useEffect, useState } from 'react';
import { Download, X, ChevronDown } from 'lucide-react';
import InstallHelp from './InstallHelp';
import { isIOS, isAndroid, isStandalone } from '../utils/platform';
import { KEYS, loadFlag, saveFlag } from '../utils/storage';

const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

function shouldShow() {
  if (isStandalone() || !(isIOS() || isAndroid())) return false;
  const dismissed = Number(loadFlag(KEYS.installDismissed));
  return !(dismissed && Date.now() - dismissed < SNOOZE_MS);
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(shouldShow);
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState(null);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    saveFlag(KEYS.installDismissed, Date.now());
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) {
      setOpen((o) => !o);
      return;
    }
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
    setVisible(false);
  };

  return (
    <aside aria-label="Installer l'application" className="fixed inset-x-0 bottom-nav z-40 mx-auto max-w-md px-3 fade-in">
      <div className="bg-slate-800/95 backdrop-blur border border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-2 pl-3">
          <Download className="text-blue-400 shrink-0" size={18} aria-hidden="true" />
          <button
            type="button"
            onClick={install}
            aria-expanded={deferred ? undefined : open}
            className="flex-1 min-h-11 text-left text-sm font-semibold text-white flex items-center gap-1"
          >
            {deferred ? 'Installer MuscuGain' : 'Installer sur l’écran d’accueil'}
            {!deferred && <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />}
          </button>
          <button type="button" onClick={dismiss} aria-label="Masquer l’aide à l’installation" className="min-w-11 min-h-11 inline-flex items-center justify-center text-slate-400 hover:text-white rounded-xl">
            <X size={18} />
          </button>
        </div>
        {open && !deferred && (
          <div className="px-3 pb-3">
            <InstallHelp />
          </div>
        )}
      </div>
    </aside>
  );
}
