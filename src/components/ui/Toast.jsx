import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { cls: 'bg-green-600/90 border-green-400/40 text-white', Icon: CheckCircle2 },
  error: { cls: 'bg-red-600/90 border-red-400/40 text-white', Icon: AlertTriangle },
  info: { cls: 'bg-blue-600/90 border-blue-400/40 text-white', Icon: Info },
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { id, message, type }

  const showToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${message}-${type}`;
    setToast({ id, message, type });
  }, []);

  const style = toast ? (STYLES[toast.type] || STYLES.info) : null;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <ToastView key={toast.id} toast={toast} style={style} onClose={() => setToast(null)} />
      )}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, style, onClose }) {
  const { Icon } = style;

  useEffect(() => {
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 pointer-events-none fade-in">
      <div className={`pointer-events-auto flex items-center gap-2 max-w-sm w-full rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md ${style.cls}`}>
        <Icon size={18} className="shrink-0" />
        <span className="text-sm font-medium flex-1">{toast.message}</span>
        <button onClick={onClose} className="opacity-70 hover:opacity-100"><X size={16} /></button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx || (() => {});
}
