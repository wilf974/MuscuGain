export const DEFAULT_ROUTINES = [
  {
    id: 'fullbody',
    name: 'Full Body (Débutant)',
    desc: 'Travaille tout le corps. Idéal 3x par semaine.',
    exercises: [
      { name: 'Squat Arrière (Back Squat)', targetSets: 4 },
      { name: 'Développé Couché Barre', targetSets: 4 },
      { name: 'Tirage Vertical Poitrine', targetSets: 4 },
      { name: 'Développé Militaire Debout (OHP)', targetSets: 3 },
      { name: 'Curl Barre Droite', targetSets: 3 },
      { name: 'Planche Classique', targetSets: 3 },
    ],
  },
  {
    id: 'push',
    name: 'Push (Poussée)',
    desc: 'Pectoraux, Épaules, Triceps.',
    exercises: [
      { name: 'Développé Couché Barre', targetSets: 4 },
      { name: 'Développé Incliné Haltères', targetSets: 4 },
      { name: 'Développé Militaire Assis', targetSets: 4 },
      { name: 'Élévations Latérales Haltères', targetSets: 4 },
      { name: 'Dips (Pectoraux)', targetSets: 3 },
      { name: 'Extension Triceps Poulie Haute', targetSets: 3 },
    ],
  },
  {
    id: 'pull',
    name: 'Pull (Tirage)',
    desc: 'Dos, Biceps, Arrière d\'épaule.',
    exercises: [
      { name: 'Tractions Pronation (Large)', targetSets: 4 },
      { name: 'Rowing Barre (Yates)', targetSets: 4 },
      { name: 'Tirage Vertical Poitrine', targetSets: 3 },
      { name: 'Face Pull', targetSets: 4 },
      { name: 'Curl Barre EZ', targetSets: 4 },
      { name: 'Curl Marteau', targetSets: 3 },
    ],
  },
  {
    id: 'legs',
    name: 'Legs (Jambes)',
    desc: 'Quadriceps, Ischios, Mollets.',
    exercises: [
      { name: 'Squat Arrière (Back Squat)', targetSets: 4 },
      { name: 'Presse à Cuisses Inclinée', targetSets: 4 },
      { name: 'Fentes Bulgares', targetSets: 3 },
      { name: 'Leg Extension', targetSets: 3 },
      { name: 'Leg Curl Assis', targetSets: 4 },
      { name: 'Mollets Debout', targetSets: 4 },
    ],
  },
];
