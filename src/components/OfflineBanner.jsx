import { WifiOff } from 'lucide-react';
import useOnlineStatus from '../hooks/useOnlineStatus';

// Bandeau hors ligne : rassure (séances et historique restent disponibles) et prévient (IA indisponible).
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className="mb-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
      <WifiOff size={16} className="shrink-0" aria-hidden="true" />
      <span>Hors ligne : séances, programmes et historique fonctionnent. Scanner et coach IA reviendront avec le réseau.</span>
    </div>
  );
}
