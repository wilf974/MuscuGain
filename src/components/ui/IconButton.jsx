// Bouton icône accessible : cible 44×44 px, libellé obligatoire (aria-label + title).
export default function IconButton({ label, onClick, children, className = '', tone = 'default', ...rest }) {
  const tones = {
    default: 'text-slate-400 hover:text-white hover:bg-slate-800',
    blue: 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10',
    danger: 'text-slate-400 hover:text-red-400 hover:bg-red-500/10',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl transition-colors touch-manipulation shrink-0 ${tones[tone] || tones.default} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
