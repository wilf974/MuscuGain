// Étapes d'installation sur l'écran d'accueil (iPhone : uniquement via le menu Partager).
import { Share, PlusSquare, MoreVertical, CheckCircle2 } from 'lucide-react';
import { isIOS, isIOSThirdPartyBrowser, isStandalone } from '../utils/platform';

export default function InstallHelp() {
  if (isStandalone()) {
    return (
      <p className="flex items-center gap-2 text-sm text-green-400">
        <CheckCircle2 size={18} aria-hidden="true" /> MuscuGain est déjà installée sur cet appareil.
      </p>
    );
  }
  if (isIOS()) {
    return (
      <ol className="space-y-2 text-sm text-slate-300 list-none">
        {isIOSThirdPartyBrowser() && (
          <li className="text-amber-300 text-xs">Astuce : l’installation est la plus fiable depuis Safari.</li>
        )}
        <li className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-blue-400">1.</span> Touche
          <Share size={18} className="text-blue-400" aria-label="Partager" /> <strong>Partager</strong>
          <span className="text-slate-500">(en bas de Safari)</span>
        </li>
        <li className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-blue-400">2.</span> Choisis
          <PlusSquare size={18} className="text-slate-300" aria-hidden="true" /> <strong>Sur l’écran d’accueil</strong>
        </li>
        <li className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-blue-400">3.</span> <span>Touche <strong>Ajouter</strong> : l’app s’ouvre en plein écran, même hors ligne.</span>
        </li>
      </ol>
    );
  }
  return (
    <p className="text-sm text-slate-300 flex items-center gap-2 flex-wrap">
      Menu du navigateur <MoreVertical size={16} aria-hidden="true" /> puis <strong>Installer l’application</strong> / <strong>Ajouter à l’écran d’accueil</strong>.
    </p>
  );
}
