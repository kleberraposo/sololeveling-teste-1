
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSystemMessage = async (context: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: context,
      config: {
        systemInstruction: `Você é "O Sistema" do anime Solo Leveling. Suas respostas devem ser curtas, frias, autoritárias e apresentadas como mensagens de sistema HUD. Use termos como [ALERTA], [MISSÃO], [RECOMPENSA] ou [NÍVEL AUMENTOU]. Sua linguagem é focada em status, janelas flutuantes e diretrizes diretas ao Jogador.`,
        temperature: 0.7,
      },
    });
    return response.text || "O Sistema encontrou um erro desconhecido.";
  } catch (error) {
    console.error("Erro ao contatar o Sistema:", error);
    return "[ALERTA] Falha na conexão com o Servidor Central.";
  }
};

/**
 * Classifica uma missão em um dos atributos principais.
 */
export const classifyMissionAttribute = async (missionName: string, description: string = "") => {
  try {
    const prompt = `Analise a seguinte missão e classifique-a em EXATAMENTE UM destes atributos: force, intelligence, focus, vitality, charisma.
    Missão: "${missionName}"
    Descrição: "${description}"
    
    Regras de classificação:
    - force: Atividades de força física bruta, explosão, levantamento de peso.
    - intelligence: Estudos, leitura, lógica, aprendizado, estratégia.
    - focus: Organização, trabalho concentrado, tarefas repetitivas de precisão, meditação.
    - vitality: Cardio, sono, hidratação, alimentação, resistência física.
    - charisma: Interação social, falar em público, autocuidado, liderança.

    Responda APENAS o nome da chave do atributo em minúsculo.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.1,
      },
    });

    const result = response.text.trim().toLowerCase();
    const validStats = ['force', 'intelligence', 'focus', 'vitality', 'charisma'];
    return validStats.includes(result) ? result : 'focus';
  } catch (error) {
    console.error("Erro na classificação de atributo:", error);
    return 'focus';
  }
};
