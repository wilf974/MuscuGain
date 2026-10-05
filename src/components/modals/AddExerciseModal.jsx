import { useMemo } from 'react';
import { PlusCircle, ScanLine } from 'lucide-react';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import CatalogPicker from '../CatalogPicker';
import { loadCustomExercises, mergedCatalog } from '../../data/customExercises';

// Ajout manuel d'un exercice pendant la séance ; la reconnaissance photo passe par le scanner.
export default function AddExerciseModal({ isOpen, onClose, onSelect, onScan, existingExercises = [] }) {
  const existingNames = useMemo(
    () => existingExercises.map((ex) => (typeof ex === 'string' ? ex : ex.name)),
    [existingExercises],
  );
  // Relu à chaque ouverture : le scanner a pu ajouter un exercice perso entre-temps.
  const catalog = useMemo(() => (isOpen ? mergedCatalog(loadCustomExercises()) : []), [isOpen]);

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Ajouter un exercice" icon={PlusCircle}>
      {onScan && (
        <Button variant="soft" fullWidth className="mb-4" onClick={onScan}>
          <ScanLine size={18} aria-hidden="true" /> Scanner une machine
        </Button>
      )}
      <CatalogPicker catalog={catalog} onPick={onSelect} disabledNames={existingNames} />
    </Sheet>
  );
}
