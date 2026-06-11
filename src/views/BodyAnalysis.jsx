import { useRef, useState } from 'react';
import {
  ScanLine,
  Camera,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Trophy,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Scale,
  BarChart2,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { analyzeBody, AnalyzeBodyError } from '../utils/analyzeBody';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDateFR(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateShortFR(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const Disclaimer = () => (
  <p className="text-center text-[11px] text-slate-500 mt-2">
    Estimations visuelles indicatives, sans valeur médicale.
  </p>
);

// ─── sub-components ───────────────────────────────────────────────────────────

function ResultsList({ items, colorClass, bulletClass }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="space-y-1 mt-2">
      {items.map((item, i) => (
        <li key={i} className={`flex items-start gap-2 text-sm ${colorClass}`}>
          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${bulletClass}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function ResultsCards({ entry }) {
  const {
    morphotype,
    balance,
    bodyFatRange,
    strengths,
    weaknesses,
    trainingAdvice,
    evolutionNote,
  } = entry;

  return (
    <div className="space-y-3 fade-in">
      {/* Top row: Morphotype + Balance */}
      <div className="grid grid-cols-2 gap-3">
        {morphotype && (
          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Scale size={16} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Morphotype</span>
            </div>
            <p className="text-white font-semibold text-sm leading-snug">{morphotype}</p>
          </Card>
        )}
        {balance && (
          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <BarChart2 size={16} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Équilibre</span>
            </div>
            <p className="text-white font-semibold text-sm leading-snug">{balance}</p>
          </Card>
        )}
      </div>

      {/* Body fat */}
      {bodyFatRange && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell size={16} className="text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Masse grasse estimée</span>
          </div>
          <p className="text-2xl font-bold text-blue-300">{bodyFatRange}</p>
        </Card>
      )}

      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-green-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Points forts</span>
          </div>
          <ResultsList
            items={strengths}
            colorClass="text-green-300"
            bulletClass="bg-green-400"
          />
        </Card>
      )}

      {/* Weaknesses */}
      {weaknesses && weaknesses.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Points à travailler</span>
          </div>
          <ResultsList
            items={weaknesses}
            colorClass="text-amber-300"
            bulletClass="bg-amber-400"
          />
        </Card>
      )}

      {/* Training advice */}
      {trainingAdvice && trainingAdvice.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Conseils d'entraînement</span>
          </div>
          <ResultsList
            items={trainingAdvice}
            colorClass="text-blue-200"
            bulletClass="bg-blue-400"
          />
        </Card>
      )}

      {/* Evolution note */}
      {evolutionNote && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Note d'évolution</span>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed">{evolutionNote}</p>
        </Card>
      )}

      <Disclaimer />
    </div>
  );
}

// ─── Timeline accordion ───────────────────────────────────────────────────────

function Timeline({ bodyAnalyses }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  if (!bodyAnalyses || bodyAnalyses.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Analyses passées</h2>
      {bodyAnalyses.map((entry, idx) => {
        const isOpen = expandedIdx === idx;
        const preview = entry.evolutionNote
          ? entry.evolutionNote.split(/[.!?]/)[0].trim()
          : null;
        return (
          <Card key={idx}>
            <button
              type="button"
              onClick={() => setExpandedIdx(isOpen ? null : idx)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400">{formatDateShortFR(entry.date)}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {entry.morphotype && (
                      <span className="text-sm font-semibold text-white">{entry.morphotype}</span>
                    )}
                    {entry.bodyFatRange && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                        {entry.bodyFatRange}
                      </span>
                    )}
                  </div>
                  {preview && (
                    <p className="text-xs text-slate-500 mt-1 truncate">{preview}</p>
                  )}
                </div>
                <div className="shrink-0 text-slate-500">
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="mt-4 border-t border-slate-700/50 pt-4 fade-in">
                <p className="text-xs text-slate-400 mb-3">{formatDateFR(entry.date)}</p>
                <ResultsCards entry={entry} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Consent card ─────────────────────────────────────────────────────────────

function ConsentCard({ onAccept, onCancel }) {
  return (
    <Card className="border-blue-500/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
          <ShieldCheck size={20} className="text-blue-400" />
        </div>
        <div>
          <h2 className="text-white font-bold">Consentement requis</h2>
          <p className="text-xs text-slate-400">Avant la première analyse</p>
        </div>
      </div>

      <div className="space-y-3 text-sm text-slate-300 mb-5">
        <p>
          Pour analyser votre morphologie, votre photo sera envoyée à un modèle d'IA externe
          (NVIDIA NIM). <strong className="text-white">Elle ne sera pas conservée</strong> — seul
          le résultat textuel est stocké localement sur votre appareil.
        </p>
        <p>
          Cette analyse fournit des estimations visuelles à titre indicatif uniquement. Elle
          n'a <strong className="text-white">aucune valeur médicale</strong> et ne remplace pas
          l'avis d'un professionnel de santé.
        </p>
      </div>

      <Disclaimer />

      <div className="flex gap-3 mt-4">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button variant="primary" onClick={onAccept} className="flex-1">
          <ShieldCheck size={16} />
          J'accepte
        </Button>
      </div>
    </Card>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function BodyAnalysis({ bodyAnalyses, addBodyAnalysis }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // status: idle | consent | loading | results | error
  const [status, setStatus] = useState('idle');
  const [currentEntry, setCurrentEntry] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  // which source triggered the consent gate (so we re-trigger after accept)
  const [pendingSource, setPendingSource] = useState(null);

  const hasConsent = () => localStorage.getItem('muscuGainBodyConsent') === '1';

  // Ask consent if needed, then open the file picker
  const triggerCapture = (source) => {
    if (!hasConsent()) {
      setPendingSource(source);
      setStatus('consent');
      return;
    }
    openPicker(source);
  };

  const openPicker = (source) => {
    if (source === 'camera') {
      cameraInputRef.current && cameraInputRef.current.click();
    } else {
      galleryInputRef.current && galleryInputRef.current.click();
    }
  };

  const handleConsentAccept = () => {
    localStorage.setItem('muscuGainBodyConsent', '1');
    const src = pendingSource;
    setPendingSource(null);
    setStatus('idle');
    // Defer one tick so the input is accessible after re-render
    setTimeout(() => openPicker(src), 0);
  };

  const handleConsentCancel = () => {
    setPendingSource(null);
    setStatus('idle');
  };

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // reset so same file can be re-selected
    if (!file) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const result = await analyzeBody(file, bodyAnalyses[0] || null);
      const entry = { date: new Date().toISOString(), ...result };
      addBodyAnalysis(entry);
      setCurrentEntry(entry);
      setStatus('results');
    } catch (err) {
      setErrorMsg(err instanceof AnalyzeBodyError ? err.message : 'Une erreur est survenue.');
      setStatus('error');
    }
  };

  const goIdle = () => {
    setStatus('idle');
    setCurrentEntry(null);
    setErrorMsg('');
  };

  // ── Capture buttons (reused in idle) ──
  const CaptureButtons = () => (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => triggerCapture('camera')}
        className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold text-blue-300 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 transition-colors active:scale-95"
      >
        <Camera size={20} />
        <span className="text-sm">Prendre une photo</span>
      </button>
      <button
        type="button"
        onClick={() => triggerCapture('gallery')}
        className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold text-slate-300 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 transition-colors active:scale-95"
      >
        <ImageIcon size={20} />
        <span className="text-sm">Galerie</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-24 fade-in">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFile}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />

      {/* Header */}
      <header className="mb-2">
        <div className="flex items-center gap-3">
          <ScanLine size={24} className="text-blue-400 shrink-0" />
          <h1 className="text-2xl font-bold text-white">Analyse corporelle</h1>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Photographiez votre corps pour obtenir une analyse morphologique.
        </p>
      </header>

      {/* ── CONSENT ── */}
      {status === 'consent' && (
        <ConsentCard onAccept={handleConsentAccept} onCancel={handleConsentCancel} />
      )}

      {/* ── LOADING ── */}
      {status === 'loading' && (
        <Card className="py-12 flex flex-col items-center gap-4">
          <Loader2 size={40} className="text-blue-400 animate-spin" />
          <p className="text-slate-300 font-semibold">Analyse en cours…</p>
          <p className="text-xs text-slate-500">Cela peut prendre jusqu'à 30 secondes.</p>
        </Card>
      )}

      {/* ── ERROR ── */}
      {status === 'error' && (
        <Card className="border-red-500/30">
          <div className="flex items-start gap-3 text-red-400 mb-4">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm">{errorMsg}</p>
          </div>
          <Button variant="danger" onClick={goIdle} fullWidth>
            <RefreshCw size={16} />
            Réessayer
          </Button>
        </Card>
      )}

      {/* ── RESULTS ── */}
      {status === 'results' && currentEntry && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Résultats — {formatDateShortFR(currentEntry.date)}
            </h2>
            <button
              type="button"
              onClick={goIdle}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={13} />
              Nouvelle analyse
            </button>
          </div>
          <ResultsCards entry={currentEntry} />
        </>
      )}

      {/* ── IDLE ── */}
      {status === 'idle' && (
        <>
          {/* Intro card */}
          <Card>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <ScanLine size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Comment ça marche ?</h2>
                <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">
                  Photographiez votre corps en position neutre (face ou profil). L'IA analyse
                  votre morphotype, l'équilibre musculaire, une estimation de masse grasse et
                  vous donne des conseils personnalisés.
                </p>
              </div>
            </div>
            <CaptureButtons />
          </Card>

          {/* Timeline */}
          <Timeline bodyAnalyses={bodyAnalyses} />
        </>
      )}
    </div>
  );
}
