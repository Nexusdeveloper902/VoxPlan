import { GoogleGenAI, Type } from '@google/genai';
import { DeepgramClient } from '@deepgram/sdk';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

// Gemini for Task Extraction & Planification
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY as string,
});

// Deepgram for Audio Transcription (v5 SDK)
const deepgram = new DeepgramClient({
  apiKey: process.env.DEEPGRAM_API_KEY as string
});

/**
 * Transcribes audio using Deepgram
 * @param filePath Path to the audio file
 */
export async function transcribeAudio(filePath: string) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    // In Deepgram v5 SDK, the structure is deepgram.listen.v1.media.transcribeFile
    // Casting to any to avoid TS definition mismatches with the latest SDK version
    const response = await (deepgram.listen as any).v1.media.transcribeFile(
      fileBuffer,
      {
        model: 'nova-2',
        smart_format: true,
        mimetype: 'audio/m4a',
        language: 'es' // Explicitly set to Spanish as everything is translated now
      }
    );

    // Some versions of Deepgram SDK v5 return the result directly, others wrap it
    const result = response.result || response;
    const transcription = result?.results?.channels[0]?.alternatives[0]?.transcript;
    
    if (!transcription) {
      console.log('Deepgram Response (Empty):', JSON.stringify(response, null, 2));
      // Returning empty string instead of throwing to allow the route to handle it gracefully
      return "";
    }
    
    return transcription;
  } catch (err) {
    console.error('Deepgram Transcription Error:', err);
    throw err;
  }
}

/**
 * Extracts task title and due date from text using Gemini
 */
export async function extractTaskDetails(text: string) {
  // Casting genAI to any as the 'models' property exists in the source but might be missing in TS definitions
  const response = await (genAI as any).models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      systemInstruction: `Eres un asistente útil que extrae la estructura de tareas de las dictados de voz del usuario.
Devuelve un objeto JSON con dos campos:
- "title": Un título corto y claro para la tarea.
- "due_date": Parsea la fecha de vencimiento del texto al formato ISO 8601 (ej. 2026-03-20T23:59:59Z). Si no se indica fecha, devuelve null.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          due_date: { type: Type.STRING }
        },
        required: ["title"]
      }
    }
  });

  const result = (response as any).text;
  if (!result) throw new Error("Gemini devolvió una respuesta vacía para la extracción");
  return JSON.parse(result);
}

/**
 * Generates steps for a task using Gemini
 */
export async function planifyTask(title: string, description: string) {
  const response = await (genAI as any).models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: `Título: ${title}\nDescripción: ${description}` }] }],
    config: {
      systemInstruction: `Eres un motor de planificación de IA. Dado un título de tarea y su descripción bruta, divídela en 3-5 pasos accionables.
Devuelve un objeto JSON con un único campo "steps" que es un array de objetos, cada uno contiene:
- "title": Título corto del paso
- "description": Explicación ligeramente más larga de qué hacer`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "description"]
            }
          }
        },
        required: ["steps"]
      }
    }
  });

  const result = (response as any).text;
  if (!result) throw new Error("Gemini devolvió una respuesta vacía para la planificación");
  return JSON.parse(result);
}
