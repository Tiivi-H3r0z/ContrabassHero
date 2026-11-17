
const FALLBACK_INSULTS = [
  "Retourne à ta place !",
  "Zéro pointé !",
  "C'est inadmissible !",
  "Tu vas rater ta vie !",
  "Où sont tes devoirs ?!",
  "Silence !",
  "Sortez immédiatement !",
  "Je vais appeler vos parents !",
  "Quelle insolence !",
  "Au coin !",
  "Cessez ce vacarme !",
  "Vous êtes la honte de l'académie !"
];

const FALLBACK_BOSS_TAUNTS = [
  "JE SUIS LE DIRECTEUR !",
  "VOTRE AVENIR EST NUL !",
  "REGARDEZ-MOI QUAND JE PARLE !",
  "INSOLENT !",
  "VOUS NE PASSEREZ JAMAIS !",
  "QUELLE POSTURE HORRIBLE !"
];

const FALLBACK_VICTORY_MESSAGES = [
  "Hmm... peut-être un petit progrès...",
  "Ta gamme de Do Majeur s'améliore...",
  "Pas mal... pour un débutant.",
  "Je note une légère amélioration.",
];

export const fetchTeacherInsults = async (): Promise<string[]> => {
  return FALLBACK_INSULTS;
};

export const fetchBossTaunts = async (): Promise<string[]> => {
  return FALLBACK_BOSS_TAUNTS;
};

export const fetchBossDeathMessage = async (): Promise<string> => {
  return FALLBACK_VICTORY_MESSAGES[Math.floor(Math.random() * FALLBACK_VICTORY_MESSAGES.length)];
};
