// src/components/ui/VolumeChart.jsx
// Graphique SVG maison : volume total par séance (30 dernières), ordre chronologique.
export default function VolumeChart({ history }) {
  const sessions = (history || []).slice(0, 30).slice().reverse(); // ancien -> récent
  if (sessions.length < 2) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 text-center text-sm text-slate-500">
        Pas assez de données pour le graphique.
      </div>
    );
  }

  const vols = sessions.map((s) => Math.max(0, Math.round(s.totalVolume || 0)));
  const max = Math.max(...vols, 1);
  const W = 320;
  const H = 120;
  const pad = 8;
  const n = vols.length;
  const gap = 3;
  const barW = (W - pad * 2 - gap * (n - 1)) / n;

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-white">Volume par séance</h3>
        <span className="text-xs text-slate-500 font-mono">max {max} kg</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Graphique du volume par séance">
        {vols.map((v, i) => {
          const h = (v / max) * (H - pad * 2);
          const x = pad + i * (barW + gap);
          const y = H - pad - h;
          return <rect key={i} x={x} y={y} width={barW} height={h} rx="2" className="fill-blue-500" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>{fmtDate(sessions[0].date)}</span>
        <span>{fmtDate(sessions[n - 1].date)}</span>
      </div>
    </div>
  );
}
