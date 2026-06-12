// src/components/ui/LineChart.jsx
// Courbe SVG générique (axe X = temps réel). Multi-séries :
//  - normalizeEach=false : domaine Y commun (mêmes unités)
//  - normalizeEach=true  : chaque série sur son propre domaine (unités différentes, timeline)
// markers : dates (ISO) marquées par une ligne verticale pointillée (ex. analyses IA).
import { chartCoords, seriesDomain } from '../../utils/chart.core';

const COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444']; // blue-500, amber-500, green-500, red-500

export default function LineChart({ title, series, unit = '', height = 120, normalizeEach = false, markers = [] }) {
  const W = 320;
  const pad = 8;
  const opts = { width: W, height, pad };

  const domain = normalizeEach ? {} : seriesDomain(series);

  const drawn = (series || [])
    .map((s, i) => ({ ...s, color: s.color || COLORS[i % COLORS.length] }))
    .map((s) => {
      const { coords, min, max } = chartCoords(s.points, {
        ...opts,
        yMin: normalizeEach ? null : domain.min,
        yMax: normalizeEach ? null : domain.max,
      });
      return { ...s, coords, min, max };
    })
    .filter((s) => s.coords.length >= 2);

  if (drawn.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 text-center text-sm text-slate-500">
        Pas assez de données pour le graphique.
      </div>
    );
  }

  // Bornes temporelles globales pour le pied de graphe + markers.
  const allPts = drawn.flatMap((s) => s.points).map((p) => new Date(p.x).getTime()).filter(Number.isFinite);
  const t0 = Math.min(...allPts);
  const t1 = Math.max(...allPts);
  const tSpan = t1 - t0 || 1;
  const markerXs = (markers || [])
    .map((m) => new Date(m).getTime())
    .filter((t) => Number.isFinite(t) && t >= t0 && t <= t1)
    .map((t) => pad + ((t - t0) / tSpan) * (W - pad * 2));

  const fmtDate = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const single = drawn.length === 1;

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
        {single && (
          <span className="text-xs text-slate-500 font-mono">
            {drawn[0].min}–{drawn[0].max} {unit}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={title || 'Graphique'}>
        {markerXs.map((x, i) => (
          <line key={`m${i}`} x1={x} y1={pad} x2={x} y2={height - pad} stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
        ))}
        {drawn.map((s, si) => (
          <g key={si}>
            <polyline
              points={s.coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.coords.map((c, i) => (
              <circle key={i} cx={c.x} cy={c.y} r="2.5" fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>{fmtDate(t0)}</span>
        <span>{fmtDate(t1)}</span>
      </div>
      {!single && (
        <div className="flex flex-wrap gap-3 mt-2">
          {drawn.map((s, i) => (
            <span key={i} className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
