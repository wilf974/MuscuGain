// Réglages : thème, rappels, installation, vie privée / données locales.
import { useEffect, useState } from 'react';
import { Settings, Moon, Bell, Smartphone, ShieldCheck, RotateCcw, Database } from 'lucide-react';
import Sheet from './ui/Sheet';
import Button from './ui/Button';
import InstallHelp from './InstallHelp';
import { THEMES, getThemePref, setThemePref } from '../utils/theme';
import { requestReminderPermission } from '../utils/reminder';
import { KEYS, loadFlag, saveFlag, storageAvailable } from '../utils/storage';
import { isIOS, isStandalone } from '../utils/platform';
import { useToast } from './ui/Toast';

function Section({ icon: Icon, title, children }) {
  return (
    <section className="py-4 border-b border-slate-700/60 last:border-0">
      <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
        <Icon size={17} className="text-blue-400" aria-hidden="true" /> {title}
      </h3>
      {children}
    </section>
  );
}

export default function SettingsSheet({ isOpen, onClose, onReplayOnboarding, stats }) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Réglages" icon={Settings} size="lg">
      {isOpen && <SettingsBody onReplayOnboarding={onReplayOnboarding} stats={stats} />}
    </Sheet>
  );
}

function SettingsBody({ onReplayOnboarding, stats }) {
  const showToast = useToast();
  const [theme, setTheme] = useState(getThemePref);
  const [reminders, setReminders] = useState(() => loadFlag(KEYS.reminders) === '1');
  const [persisted, setPersisted] = useState(null);

  useEffect(() => {
    let alive = true;
    navigator.storage?.persisted?.().then((v) => { if (alive) setPersisted(v); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const chooseTheme = (key) => {
    setTheme(key);
    setThemePref(key);
  };

  const toggleReminders = async () => {
    if (reminders) {
      saveFlag(KEYS.reminders, '0');
      setReminders(false);
      showToast('Rappels désactivés', 'info');
      return;
    }
    const result = await requestReminderPermission();
    if (result === 'granted') {
      saveFlag(KEYS.reminders, '1');
      setReminders(true);
      showToast('Rappels activés');
    } else if (result === 'denied') {
      showToast('Notifications refusées (Réglages iOS > Notifications)', 'info');
    } else {
      showToast(isIOS() && !isStandalone() ? 'Installe d’abord l’app sur l’écran d’accueil' : 'Notifications non supportées', 'info');
    }
  };

  return (
    <div>
      <Section icon={Moon} title="Apparence">
        <div role="radiogroup" aria-label="Thème" className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={theme === t.key}
              onClick={() => chooseTheme(t.key)}
              className={`min-h-11 rounded-xl text-sm font-semibold border transition-colors ${
                theme === t.key ? 'bg-blue-600 text-onaccent border-blue-600' : 'bg-slate-900/50 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={Bell} title="Rappel de séance">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">Notification à l’ouverture si aucune séance depuis 3 jours.</p>
          <button
            type="button"
            role="switch"
            aria-checked={reminders}
            aria-label="Rappels de séance"
            onClick={toggleReminders}
            className={`relative shrink-0 w-14 h-8 rounded-full transition-colors ${reminders ? 'bg-green-500' : 'bg-slate-600'}`}
          >
            <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-onaccent shadow transition-transform ${reminders ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        {isIOS() && <p className="text-xs text-slate-500 mt-2">Sur iPhone, les notifications web nécessitent l’app installée (iOS 16.4+).</p>}
      </Section>

      <Section icon={Smartphone} title="Installer sur l’écran d’accueil">
        <InstallHelp />
      </Section>

      <Section icon={ShieldCheck} title="Vie privée">
        <ul className="text-sm text-slate-300 space-y-1.5">
          <li>• Tes séances, mesures et programmes restent <strong>sur cet appareil</strong>.</li>
          <li>• Les photos (machine, corps) sont envoyées à l’IA pour l’analyse puis <strong>oubliées</strong> : jamais stockées.</li>
          <li>• Aucune réponse IA ni photo n’est mise en cache hors ligne.</li>
        </ul>
      </Section>

      <Section icon={Database} title="Données sur cet appareil">
        <p className="text-sm text-slate-300">
          {stats.sessions} séance{stats.sessions > 1 ? 's' : ''} · {stats.routines} programme{stats.routines > 1 ? 's' : ''} · {stats.measurements} mesure{stats.measurements > 1 ? 's' : ''} · {stats.analyses} analyse{stats.analyses > 1 ? 's' : ''}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {!storageAvailable
            ? '⚠️ Stockage indisponible (navigation privée ?) : les données seront perdues à la fermeture.'
            : persisted === true
              ? 'Stockage persistant accordé : le navigateur ne l’effacera pas automatiquement.'
              : 'Astuce : installe l’app pour limiter le risque d’effacement automatique par le navigateur.'}
        </p>
      </Section>

      <div className="pt-4">
        <Button variant="secondary" fullWidth onClick={onReplayOnboarding}>
          <RotateCcw size={16} aria-hidden="true" /> Revoir la présentation
        </Button>
      </div>
    </div>
  );
}
