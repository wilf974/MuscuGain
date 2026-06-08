export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 ${className}`}>
      {children}
    </div>
  );
}
