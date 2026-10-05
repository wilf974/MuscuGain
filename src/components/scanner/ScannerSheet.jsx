// Scanner de machine : photo (caméra ou photothèque) → IA → fiche exercice → ajout à la séance.
// 2 taps max depuis l'accueil ou la séance : ouvrir le scanner, puis « Prendre une photo ».
// La photo reste en mémoire le temps de l'analyse : jamais stockée (ni appareil, ni serveur).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, AlertTriangle, ScanLine, ListChecks, ChevronLeft, Plus, WifiOff, Lock, CheckCircle2, HelpCircle } from 'lucide-react';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import ExerciseDetails from '../ExerciseDetails';
import CatalogPicker from '../CatalogPicker';
import VideoModal from '../modals/VideoModal';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { recognizeMachine, RecognizeError } from '../../utils/recognizeMachine';
import { RECOGNIZE_MESSAGES } from '../../utils/recognizeMachine.core';
import { classifyRecognition, buildCatalogIndex, exerciseInfo, confidenceLabel } from '../../utils/scanner.core';
import { loadCustomExercises, addCustomExercise, allKnownNames, mergedCatalog } from '../../data/customExercises';

export default function ScannerSheet({ isOpen, onClose, hasActiveSession, sessionExercises = [], onAdd }) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Scanner une machine" icon={ScanLine} size="lg">
      {isOpen && (
        <ScannerBody onClose={onClose} hasActiveSession={hasActiveSession} sessionExercises={sessionExercises} onAdd={onAdd} />
      )}
    </Sheet>
  );
}

function ScannerBody({ onClose, hasActiveSession, sessionExercises, onAdd }) {
  const online = useOnlineStatus();
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  const abortRef = useRef(null);
  const [custom, setCustom] = useState(() => loadCustomExercises());
  const [phase, setPhase] = useState('pick'); // pick | loading | result | manual | detail | error
  const [preview, setPreview] = useState(null); // object URL éphémère (affichage uniquement)
  const [reco, setReco] = useState(null); // classifyRecognition(...)
  const [selected, setSelected] = useState(null); // { exercise, category, known }
  const [errorKind, setErrorKind] = useState(null);
  const [videoFor, setVideoFor] = useState(null);

  const index = useMemo(() => buildCatalogIndex(custom), [custom]);
  const catalog = useMemo(() => mergedCatalog(custom), [custom]);
  const inSession = useMemo(() => new Set(sessionExercises.map((n) => n.toLowerCase())), [sessionExercises]);

  // Annule l'appel en cours et libère l'aperçu à la fermeture.
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // re-sélection du même fichier possible
    if (!file) return; // annulation du sélecteur iOS → on reste sur place
    setPreview(URL.createObjectURL(file));
    setPhase('loading');
    setErrorKind(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const raw = await recognizeMachine(file, allKnownNames(custom), { signal: ctrl.signal });
      // Annulée (ou remplacée par une nouvelle photo) pendant la lecture de la réponse : on ignore.
      if (ctrl.signal.aborted || abortRef.current !== ctrl) return;
      const r = classifyRecognition(raw, index);
      setReco(r);
      if (r.level === 'none') {
        setErrorKind('empty');
        setPhase('error');
      } else {
        setSelected(r.level === 'high' ? r.primary : null);
        setPhase(r.level === 'high' ? 'detail' : 'result');
      }
    } catch (err) {
      if (abortRef.current !== ctrl) return;
      if (ctrl.signal.aborted && !(err instanceof RecognizeError && err.kind === 'timeout')) {
        setPhase('pick');
        return;
      }
      setErrorKind(err instanceof RecognizeError ? err.kind : 'unavailable');
      setPhase('error');
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  };

  const cancelAnalysis = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase('pick');
  };

  const choose = (choice) => {
    setSelected(choice);
    setPhase('detail');
  };

  const confirmAdd = () => {
    if (!selected) return;
    if (!selected.known) setCustom(addCustomExercise(selected.exercise, selected.category));
    onAdd(selected.exercise);
    onClose();
  };

  const info = selected ? exerciseInfo(selected.exercise, index, { fallbackCategory: selected.category }) : null;
  const alreadyInSession = !!(info && inSession.has(info.exercise.toLowerCase()));

  return (
    <div className="space-y-4">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} aria-hidden="true" tabIndex={-1} />
      <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} aria-hidden="true" tabIndex={-1} />
      <VideoModal exerciseName={videoFor} onClose={() => setVideoFor(null)} />

      {phase === 'pick' && (
        <>
          {!online && (
            <div role="status" className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
              <WifiOff size={18} className="shrink-0 mt-0.5" aria-hidden="true" /> {RECOGNIZE_MESSAGES.offline}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!online}
              onClick={() => cameraRef.current?.click()}
              className="min-h-28 flex flex-col items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-onaccent font-bold shadow-lg shadow-blue-900/40 active:scale-95 transition disabled:opacity-40 disabled:active:scale-100"
            >
              <Camera size={30} aria-hidden="true" /> Prendre une photo
            </button>
            <button
              type="button"
              disabled={!online}
              onClick={() => libraryRef.current?.click()}
              className="min-h-28 flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold active:scale-95 transition disabled:opacity-40 disabled:active:scale-100"
            >
              <ImageIcon size={30} aria-hidden="true" /> Photothèque
            </button>
          </div>
          <p className="flex items-start gap-2 text-xs text-slate-400">
            <Lock size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
            Cadre la machine et sa plaque (nom, schéma). La photo est envoyée à l’IA pour l’analyse puis oubliée : elle n’est jamais enregistrée.
          </p>
          <Button variant="secondary" fullWidth onClick={() => setPhase('manual')}>
            <ListChecks size={18} aria-hidden="true" /> Choisir dans le catalogue
          </Button>
        </>
      )}

      {phase === 'loading' && (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-4">
          {preview && <img src={preview} alt="Photo en cours d’analyse" className="w-40 h-40 object-cover rounded-2xl border border-slate-700" />}
          <p className="flex items-center gap-2 text-blue-300 font-semibold">
            <Loader2 size={20} className="animate-spin" aria-hidden="true" /> Analyse de la machine…
          </p>
          <p className="text-xs text-slate-500">Jusqu’à ~30 s selon la connexion.</p>
          <Button variant="ghost" onClick={cancelAnalysis}>Annuler</Button>
        </div>
      )}

      {phase === 'error' && (
        <div role="alert" className="space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>{RECOGNIZE_MESSAGES[errorKind] || RECOGNIZE_MESSAGES.unavailable}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setPhase('pick')} disabled={!online}>Réessayer</Button>
            <Button variant="soft" onClick={() => setPhase('manual')}>Catalogue</Button>
          </div>
        </div>
      )}

      {phase === 'result' && reco && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <HelpCircle size={18} className="shrink-0 mt-0.5 text-amber-400" aria-hidden="true" />
            <p>Je ne suis pas certain. <strong className="text-white">Laquelle est-ce ?</strong> Confirme avant d’ajouter.</p>
          </div>
          {reco.label && <p className="text-xs text-slate-500">Lu sur la machine : « {reco.label} »</p>}
          <ul className="space-y-2">
            {reco.choices.map((c, i) => (
              <li key={c.exercise}>
                <button
                  type="button"
                  onClick={() => choose(c)}
                  className="w-full min-h-11 text-left p-3 rounded-xl bg-slate-900/60 border border-slate-700 hover:border-blue-500/60 transition-colors"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white">{c.exercise}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{confidenceLabel(c, i)}</span>
                  </span>
                  <span className="flex flex-wrap gap-2 mt-1 text-xs text-slate-400">
                    {c.muscleGroupLabel && <span>{c.muscleGroupLabel}</span>}
                    {!c.known && <span className="text-amber-300">Hors catalogue (proposé par l’IA)</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" fullWidth onClick={() => setPhase('manual')}>
            <ListChecks size={18} aria-hidden="true" /> Aucun de ceux-là : catalogue
          </Button>
        </div>
      )}

      {phase === 'manual' && (
        <div>
          <button type="button" onClick={() => setPhase(reco && reco.level !== 'none' ? 'result' : 'pick')} className="min-h-11 -ml-2 px-2 mb-1 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
            <ChevronLeft size={18} aria-hidden="true" /> Retour
          </button>
          <CatalogPicker catalog={catalog} onPick={(name) => choose({ exercise: name, known: true, category: index.get(name.toLowerCase())?.category })} />
        </div>
      )}

      {phase === 'detail' && info && (
        <div className="space-y-4">
          <div>
            {reco && reco.level === 'high' && selected === reco.primary ? (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-green-400 mb-1">
                <CheckCircle2 size={14} aria-hidden="true" /> Machine reconnue · {confidenceLabel(reco.primary, 0)}
                {reco.primary.confidence !== null && ` (${Math.round(reco.primary.confidence * 100)} %)`}
              </p>
            ) : (
              <p className="text-xs font-semibold text-slate-400 mb-1">Exercice sélectionné</p>
            )}
            <h3 className="text-2xl font-bold text-white leading-tight">{info.exercise}</h3>
            {reco && reco.label && <p className="text-xs text-slate-500 mt-1">Lu sur la machine : « {reco.label} »</p>}
          </div>
          <ExerciseDetails info={info} onPlayVideo={() => setVideoFor(info.exercise)} />
          <div className="space-y-2 pt-1">
            <Button variant="success" fullWidth onClick={confirmAdd} disabled={alreadyInSession}>
              <Plus size={18} aria-hidden="true" />
              {alreadyInSession ? 'Déjà dans ta séance' : hasActiveSession ? 'Ajouter à ma séance' : 'Ajouter à une séance libre'}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setPhase(reco && reco.level !== 'none' && reco.choices.length > 1 ? 'result' : 'manual')}>
              Ce n’est pas ça
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
