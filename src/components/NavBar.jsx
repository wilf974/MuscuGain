import { useEffect, useState } from 'react';
import { LayoutDashboard, Dumbbell, History, Activity, ScanLine } from 'lucide-react';

// Masque la barre quand le clavier tactile est ouvert (sinon elle flotte au-dessus du clavier iOS).
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return undefined;
    const isField = (el) => el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' ||
      (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'file', 'range'].includes(el.type)));
    const onIn = (e) => { if (isField(e.target)) setOpen(true); };
    const onOut = () => setTimeout(() => setOpen(isField(document.activeElement)), 50);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);
  return open;
}

function Tab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 min-h-11 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors touch-manipulation ${active ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
    >
      <Icon size={22} aria-hidden="true" />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

// Onglets : Accueil · Historique · [bouton central] · Analyse.
// Bouton central : « Séance » (reprendre) si une séance est en cours, sinon « Scanner ».
export default function NavBar({ view, setView, hasActiveSession, openSession, openScanner }) {
  const keyboardOpen = useKeyboardOpen();
  if (keyboardOpen) return null;
  return (
    <nav aria-label="Navigation principale" className="fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-safe">
      <div className="flex items-end justify-around max-w-md mx-auto h-16 px-2 pl-safe pr-safe">
        <Tab active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={LayoutDashboard} label="Accueil" />
        <Tab active={view === 'history'} onClick={() => setView('history')} icon={History} label="Historique" />
        <div className="flex-1 flex flex-col items-center -translate-y-4">
          <button
            type="button"
            onClick={hasActiveSession ? openSession : openScanner}
            aria-label={hasActiveSession ? 'Reprendre la séance en cours' : 'Scanner une machine'}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-900 transition-transform active:scale-95 touch-manipulation ${
              hasActiveSession ? 'bg-green-500 text-onaccent shadow-green-900/40 animate-pulse-soft' : 'bg-blue-600 text-onaccent shadow-blue-900/40'
            }`}
          >
            {hasActiveSession ? <Dumbbell size={24} aria-hidden="true" /> : <ScanLine size={24} aria-hidden="true" />}
          </button>
          <span className={`text-[11px] font-semibold mt-0.5 ${hasActiveSession ? 'text-green-400' : 'text-blue-400'}`} aria-hidden="true">
            {hasActiveSession ? 'Séance' : 'Scanner'}
          </span>
        </div>
        <Tab active={view === 'body'} onClick={() => setView('body')} icon={Activity} label="Analyse" />
      </div>
    </nav>
  );
}
