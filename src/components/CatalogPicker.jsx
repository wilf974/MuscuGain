// Catalogue manuel (intégré + perso) avec recherche insensible aux accents.
// Fallback toujours disponible du scanner (hors ligne, échec IA, mauvaise reco).
import { useMemo, useState } from 'react';
import { Search, Check } from 'lucide-react';
import { filterCatalog } from '../utils/scanner.core';

export default function CatalogPicker({ catalog, onPick, disabledNames = [] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterCatalog(catalog, query), [catalog, query]);
  const disabled = useMemo(() => new Set(disabledNames.map((n) => n.toLowerCase())), [disabledNames]);

  return (
    <div>
      <label className="relative block mb-3">
        <span className="sr-only">Rechercher un exercice</span>
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (ex. presse, curl)…"
          enterKeyHint="search"
          autoComplete="off"
          className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 outline-none"
        />
      </label>
      {filtered.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6">Aucun exercice ne correspond à « {query} ».</p>
      )}
      <div className="space-y-4">
        {filtered.map(({ category, label, exercises }) => (
          <section key={category} aria-label={label}>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</h4>
            <ul className="space-y-1">
              {exercises.map((name) => {
                const isDisabled = disabled.has(name.toLowerCase());
                return (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => !isDisabled && onPick(name)}
                      disabled={isDisabled}
                      className={`w-full min-h-11 text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-2 transition-colors ${
                        isDisabled ? 'text-slate-500 bg-slate-700/30 cursor-not-allowed' : 'text-slate-200 hover:bg-blue-600/20 active:bg-blue-600/30'
                      }`}
                    >
                      <span>{name}</span>
                      {isDisabled && (
                        <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0"><Check size={13} aria-hidden="true" /> Déjà ajouté</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
