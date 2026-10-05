// Détection plateforme (affichage de l'aide d'installation uniquement, jamais pour bloquer).

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}

// iPhone/iPod + iPadOS (qui se présente comme un Mac avec écran tactile).
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Navigateur tiers sur iOS (Chrome, Firefox, Edge…) : l'ajout passe par leur menu Partager (iOS ≥ 16.4).
export function isIOSThirdPartyBrowser() {
  if (!isIOS()) return false;
  return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(navigator.userAgent || '');
}

export function isAndroid() {
  return typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent || '');
}
