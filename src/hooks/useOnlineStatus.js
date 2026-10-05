import { useSyncExternalStore } from 'react';

// État réseau (navigator.onLine). Indicatif : « en ligne » ne garantit pas que l'API répond.
function subscribe(cb) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}
const getSnapshot = () => navigator.onLine !== false;
const getServerSnapshot = () => true;

export default function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
