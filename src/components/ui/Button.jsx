const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-onaccent shadow-lg shadow-blue-900/50',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
  soft: 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30',
  danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white',
  success: 'bg-green-600 hover:bg-green-500 text-onaccent shadow-lg shadow-green-900/50',
  warning: 'bg-amber-600 hover:bg-amber-500 text-onaccent',
};

// min-h-11 = 44px : cible tactile minimale recommandée par Apple.
export default function Button({ children, onClick, variant = 'primary', className = '', fullWidth = false, type = 'button', disabled = false, ...rest }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 px-4 py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed ${VARIANTS[variant] || VARIANTS.primary} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
