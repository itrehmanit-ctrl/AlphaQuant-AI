import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client strictly on the server-side
// Telemetry header User-Agent: aistudio-build is strictly set as required
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});
