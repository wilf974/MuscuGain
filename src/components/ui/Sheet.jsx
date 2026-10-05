// Modale accessible : feuille du bas sur mobile (pouce, encoche), centrée sur desktop.
// role=dialog + aria-modal, Échap ferme, focus piégé puis restauré, scroll de fond verrouillé.
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

let lockCount = 0;
function lockScroll() {
  lockCount += 1;
  document.documentElement.classList.add('scroll-locked');
}
function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.documentElement.classList.remove('scroll-locked');
}

// Pile des feuilles ouvertes : seule la plus haute réagit à Échap / Tab (modales imbriquées).
const stack = [];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export default function Sheet({
  isOpen,
  onClose,
  title,
  icon: Icon,
  iconClass = 'text-blue-400',
  children,
  footer,
  size = 'md', // sm | md | lg
  dismissible = true,
  z = 'z-[70]',
  labelledBy,
}) {
  const panelRef = useRef(null);
  const pressOnBackdrop = useRef(false);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const sheetId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    lockScroll();
    stack.push(sheetId);
    const panel = panelRef.current;
    // Focus sur le panneau (annoncé par les lecteurs d'écran) ; pas sur un champ, pour ne pas
    // ouvrir le clavier iOS d'office.
    panel?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (stack[stack.length - 1] !== sheetId) return;
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation();
        onCloseRef.current?.();
      } else if (e.key === 'Tab' && panel) {
        const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        // Focus sur le panneau lui-même ou hors de la feuille : on le ramène dedans.
        if (document.activeElement === panel || !panel.contains(document.activeElement)) {
          e.preventDefault();
          (e.shiftKey ? lastEl : firstEl).focus();
        } else if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.lastIndexOf(sheetId);
      if (i !== -1) stack.splice(i, 1);
      unlockScroll();
      if (previous && typeof previous.focus === 'function') previous.focus({ preventScroll: true });
    };
  }, [isOpen, dismissible, sheetId]);

  if (!isOpen) return null;

  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg' };

  return createPortal(
    <div
      className={`fixed inset-0 ${z} flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm fade-in`}
      // Fermeture seulement si le geste COMMENCE et finit sur le fond (une sélection de texte
      // qui déborde du panneau ne doit pas fermer la feuille ni perdre la saisie).
      onPointerDown={(e) => { pressOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (dismissible && pressOnBackdrop.current && e.target === e.currentTarget) onCloseRef.current?.();
        pressOnBackdrop.current = false;
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? titleId : undefined)}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`sheet-in w-full ${widths[size] || widths.md} bg-slate-800 border border-slate-700 shadow-2xl rounded-t-3xl sm:rounded-2xl flex flex-col max-h-sheet outline-none`}
      >
        <div className="sm:hidden flex justify-center pt-2" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-slate-600" />
        </div>
        {(title || dismissible) && (
          <div className="flex items-center gap-3 px-5 pt-3 pb-2">
            {Icon && <Icon size={22} className={`shrink-0 ${iconClass}`} aria-hidden="true" />}
            {title && <h2 id={titleId} className="text-lg font-bold text-white flex-1 min-w-0 truncate">{title}</h2>}
            {dismissible && (
              <button
                type="button"
                data-sheet-close="1"
                onClick={() => onCloseRef.current?.()}
                aria-label="Fermer"
                className="ml-auto min-w-11 min-h-11 -mr-2 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X size={22} />
              </button>
            )}
          </div>
        )}
        <div className="px-5 pb-4 overflow-y-auto overscroll-contain flex-1 min-h-0">{children}</div>
        {footer && <div className="px-5 pt-3 border-t border-slate-700/60 pb-safe-sheet">{footer}</div>}
        {!footer && <div className="pb-safe" />}
      </div>
    </div>,
    document.body,
  );
}
