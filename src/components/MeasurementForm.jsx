// src/components/MeasurementForm.jsx
// Saisie poids (requis) + mensurations (optionnelles). 1 entrée/jour, re-saisie = écrase.
import { useState } from 'react';
import { Scale } from 'lucide-react';
import { parseMeasurementInput } from '../utils/measurements.core';
import { localDateKey } from '../utils/dates.core';

const FIELDS = [
  { key: 'weight', label: 'Poids (kg) *', placeholder: '82,5' },
  { key: 'arms', label: 'Bras (cm)', placeholder: '38' },
  { key: 'waist', label: 'Taille (cm)', placeholder: '90' },
  { key: 'thighs', label: 'Cuisses (cm)', placeholder: '58' },
];

export default function MeasurementForm({ addMeasurement }) {
  const [values, setValues] = useState({ weight: '', arms: '', waist: '', thighs: '' });
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const today = localDateKey(); // jour LOCAL (pas UTC)
    const result = parseMeasurementInput({ date: today, ...values });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    addMeasurement(result.entry);
    setValues({ weight: '', arms: '', waist: '', thighs: '' });
  };

  return (
    <form onSubmit={submit} className="bg-slate-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Scale size={16} className="text-blue-400" /> Nouvelle mesure
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs text-slate-400">{f.label}</span>
            <input
              type="text"
              inputMode="decimal"
              enterKeyHint="next"
              autoComplete="off"
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="mt-1 w-full min-h-11 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-amber-400">{error}</p>}
      <button
        type="submit"
        className="w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-onaccent shadow-lg shadow-blue-900/50"
      >
        Enregistrer
      </button>
      <p className="text-[10px] text-slate-500">Une mesure par jour — ressaisir aujourd'hui remplace la mesure du jour.</p>
    </form>
  );
}
