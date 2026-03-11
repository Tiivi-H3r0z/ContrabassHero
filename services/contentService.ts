
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Génère 12 phrases courtes (max 30 caractères), colériques, absurdes et exagérées qu'un professeur méchant crie à un élève qui se bat avec une contrebasse. Le ton doit être drôle mais agressif et autoritaire. Langue: Français. Réponds uniquement avec le JSON.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });
    
    const text = response.text;
    if (!text) return FALLBACK_INSULTS;
    
    try {
        const json = JSON.parse(text);
        return Array.isArray(json) && json.length > 0 ? json : FALLBACK_INSULTS;
    } catch (parseError) {
        console.warn("JSON parsing failed, using fallbacks", parseError);
        return FALLBACK_INSULTS;
    }
  } catch (e) {
    console.warn("AI Fetch Error, using fallback insults:", e);
    return FALLBACK_INSULTS;
  }
};

export const fetchBossTaunts = async (): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Génère 6 phrases courtes, TRÈS méchantes et humiliantes (mais drôles) sur les capacités académiques d'un élève, dites par un Boss de jeu vidéo géant qui est un Directeur d'école. Langue: Français. Réponds uniquement avec le JSON.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });
    const text = response.text;
    if (!text) return FALLBACK_BOSS_TAUNTS;
    try {
        const json = JSON.parse(text);
        return Array.isArray(json) && json.length > 0 ? json : FALLBACK_BOSS_TAUNTS;
    } catch (parseError) {
        return FALLBACK_BOSS_TAUNTS;
    }
  } catch (e) {
    return FALLBACK_BOSS_TAUNTS;
  }
};

export const fetchBossDeathMessage = async (): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Génère 1 phrase courte et humoristique qu'un professeur sévère dirait en mourant/perdant, admettant à contre-cœur que l'élève a fait des progrès dans ses études ou sa musique. Langue: Français. Exemple: 'Tes gammes... sont... acceptables...'. Réponds uniquement avec le texte brut.",
    });
    return response.text || FALLBACK_VICTORY_MESSAGES[0];
  } catch (e) {
    return FALLBACK_VICTORY_MESSAGES[Math.floor(Math.random() * FALLBACK_VICTORY_MESSAGES.length)];
  }
};
