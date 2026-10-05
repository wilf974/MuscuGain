import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Supprimer', cancelLabel = 'Annuler', tone = 'danger' }) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={title} icon={AlertTriangle} iconClass={tone === 'danger' ? 'text-red-400' : 'text-amber-400'} size="sm" z="z-[80]">
      <p className="text-slate-300 mb-5 text-sm">{message}</p>
      <div className="flex gap-3">
        <Button onClick={onClose} variant="ghost" fullWidth>{cancelLabel}</Button>
        <Button onClick={() => { onConfirm(); onClose(); }} variant={tone === 'danger' ? 'danger' : 'warning'} fullWidth>{confirmLabel}</Button>
      </div>
    </Sheet>
  );
}
