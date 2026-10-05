// Présentation courte du 1er lancement (3 écrans, passable à tout moment).
import { useState } from 'react';
import { Dumbbell, ScanLine, Smartphone, Sparkles } from 'lucide-react';
import Sheet from './ui/Sheet';
import Button from './ui/Button';
import InstallHelp from './InstallHelp';
import { isStandalone } from '../utils/platform';

const STEPS = [
  {
    icon: Dumbbell,
    title: 'Ton carnet de muscu',
    text: 'Choisis un programme ou lance une séance libre, coche tes séries : le minuteur de repos démarre seul. Tout reste sur ton téléphone, même hors ligne.',
  },
  {
    icon: ScanLine,
    title: 'Scanne une machine',
    text: 'Pas sûr de l’exercice ? Prends la machine en photo : l’app propose l’exercice, les muscles, une démo vidéo et les points de sécurité. La photo n’est jamais conservée.',
  },
  {
    icon: Sparkles,
    title: 'Progresse avec le coach',
    text: 'Records, graphiques et bilan du coach IA à partir de ton historique. Pour un accès en 1 tap, installe l’app :',
    install: true,
  },
];

export default function Onboarding({ isOpen, onClose }) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Bienvenue sur MuscuGain" icon={Smartphone} size="md" z="z-[85]">
      {isOpen && <OnboardingBody onClose={onClose} />}
    </Sheet>
  );
}

function OnboardingBody({ onClose }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const Icon = s.icon;
  const last = step === STEPS.length - 1;
  return (
    <div className="text-center">
      <div className="mx-auto mt-2 mb-4 w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
        <Icon size={32} aria-hidden="true" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2" aria-live="polite">{s.title}</h3>
      <p className="text-sm text-slate-300 leading-relaxed">{s.text}</p>
      {s.install && !isStandalone() && (
        <div className="text-left mt-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700/60">
          <InstallHelp />
        </div>
      )}
      <div className="flex justify-center gap-2 my-5" aria-label={`Étape ${step + 1} sur ${STEPS.length}`}>
        {STEPS.map((_, i) => (
          <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-blue-500' : 'w-2 bg-slate-600'}`} />
        ))}
      </div>
      <div className="flex gap-3">
        {!last && <Button variant="ghost" fullWidth onClick={onClose}>Passer</Button>}
        <Button fullWidth onClick={() => (last ? onClose() : setStep(step + 1))}>
          {last ? 'C’est parti' : 'Suivant'}
        </Button>
      </div>
    </div>
  );
}
