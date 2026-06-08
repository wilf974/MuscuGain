import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Supprimer' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4 text-red-400">
          <AlertTriangle size={24} />
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <p className="text-slate-300 mb-6 text-sm">{message}</p>
        <div className="flex gap-3">
          <Button onClick={onClose} variant="ghost" fullWidth>Annuler</Button>
          <Button onClick={() => { onConfirm(); onClose(); }} variant="danger" fullWidth>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
