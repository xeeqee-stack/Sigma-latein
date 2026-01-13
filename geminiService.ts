
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { LatinWord } from "./types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const fetchVocabulary = async (category: string): Promise<LatinWord[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate 10 Latin vocabulary words strictly from the German textbook "cursus Texte und Übungen, Ausgabe A" by C.C. Buchner. 
    Focus specifically on: ${category}. 
    Provide the German translation as the primary translation. 
    Include: 
    1. The Latin word
    2. The German translation
    3. Part of speech
    4. A simple Latin example sentence (appropriate for the level of this lesson in the textbook)
    5. The German translation of that sentence.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            translation: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
            exampleTranslation: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["word", "translation", "partOfSpeech", "exampleSentence", "exampleTranslation"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse vocabulary JSON", e);
    return [];
  }
};

export const generateWordImage = async (word: string): Promise<string | null> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `A classical oil painting style illustration depicting the concept of: ${word}` }]
    },
    config: {
      imageConfig: { aspectRatio: "1:1" }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

// PCM Decoding Helpers
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodePCM(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

export const speakLatin = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this Latin word clearly with classical pronunciation: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
      }
    }
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioData = decodeBase64(base64Audio);
    const audioBuffer = await decodePCM(audioData, audioContext);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  }
};
