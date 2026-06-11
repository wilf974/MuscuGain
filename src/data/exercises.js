export const EXERCISES_DB = {
  chest: [
    'Développé Couché Barre', 'Développé Couché Haltères',
    'Développé Incliné Barre', 'Développé Incliné Haltères',
    'Développé Décliné', 'Dips (Pectoraux)', 'Dips Lestés',
    'Écartés Couché Haltères', 'Écartés Incliné Haltères',
    'Écartés Poulie Vis-à-vis (Haut)', 'Écartés Poulie Vis-à-vis (Bas)',
    'Pompes Classiques', 'Pompes Diamant', 'Pompes Lestées', 'Pompes Claquées',
    'Pull Over Haltère', 'Chest Press Machine', 'Machine Convergente',
  ],
  back: [
    'Tractions Pronation (Large)', 'Tractions Supination', 'Tractions Neutres',
    'Tirage Vertical Poitrine', 'Tirage Vertical Prise Serrée',
    'Rowing Barre (Yates)', 'Rowing Barre T (T-Bar)', 'Rowing Haltère Unilatéral',
    'Tirage Horizontal Poulie Basse', 'Tirage Horizontal Machine',
    'Pull Over Poulie Haute', 'Face Pull',
    'Extension Lombaires (Banc)', 'Good Morning', 'Soulevé de Terre (Dos)',
    'Shrugs Barre', 'Shrugs Haltères',
  ],
  legs: [
    'Squat Arrière (Back Squat)', 'Squat Avant (Front Squat)', 'Goblet Squat',
    'Presse à Cuisses Inclinée', 'Hack Squat',
    'Fentes Marchées', 'Fentes Bulgares', 'Fentes Arrière', 'Fentes Latérales',
    'Leg Extension', 'Sissy Squat',
    'Leg Curl Couché', 'Leg Curl Assis', 'Soulevé de Terre Jambes Tendues', 'Nordic Curl',
    'Hip Thrust Barre', 'Hip Thrust Machine', 'Glute Bridge',
    'Machine à Adducteurs', 'Machine à Abducteurs',
    'Mollets Debout', 'Mollets Assis', 'Mollets Presse',
  ],
  shoulders: [
    'Développé Militaire Debout (OHP)', 'Développé Militaire Assis', 'Développé Haltères Assis',
    'Développé Arnold', 'Développé Nuque (Guidé)',
    'Élévations Latérales Haltères', 'Élévations Latérales Poulie', 'Élévations Latérales Machine',
    'Élévations Frontales Haltères', 'Élévations Frontales Disque',
    'Oiseau Buste Penché', 'Oiseau Poulie', 'Peck Deck Inversé',
    'Tirage Menton (Barre/Poulie)',
  ],
  arms: [
    'Curl Barre Droite', 'Curl Barre EZ', 'Curl Haltères Supination', 'Curl Marteau',
    'Curl Incliné Haltères', 'Curl Pupitre (Larry Scott)', 'Curl Araignée', 'Curl Concentré',
    'Tractions Supination (Biceps)',
    'Extension Triceps Poulie Haute', 'Extension Triceps Corde',
    'Barre au Front', 'Extension Nuque Haltère', 'Kickback Haltère/Poulie',
    'Dips Banc', 'Dips Machine', 'Tate Press', 'Développé Couché Prise Serrée',
  ],
  abs: [
    'Crunch Sol', 'Crunch Poulie Haute', 'Crunch Machine',
    'Relevé de Jambes Suspendu', 'Relevé de Genoux (Chaise Romaine)', 'Relevé de Bassin Sol',
    'Planche Classique', 'Planche Latérale', 'Planche Dynamique',
    'Roue Abdominale (Ab Wheel)', 'Russian Twist', 'Mountain Climbers',
    'Toes to Bar', 'Vacuum', 'Woodchopper (Poulie)',
  ],
};

export const MUSCLE_LABELS = {
  chest: 'Pectoraux',
  back: 'Dos',
  legs: 'Jambes',
  shoulders: 'Épaules',
  arms: 'Bras',
  abs: 'Abdos',
};

// nom d'exercice -> catégorie (pour les résumés/statistiques)
export const EXERCISE_CATEGORY = Object.fromEntries(
  Object.entries(EXERCISES_DB).flatMap(([cat, list]) => list.map((name) => [name, cat]))
);
export const categoryOf = (name) => EXERCISE_CATEGORY[name] || 'other';
