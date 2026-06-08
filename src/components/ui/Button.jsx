const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
  danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white',
  success: 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50',
};

export default function Button({ children, onClick, variant = 'primary', className = '', fullWidth = false }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${VARIANTS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
