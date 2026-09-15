import { requireGeminiApiKey } from './geminiApiKey';
import {
  GEMINI_MODEL_PRIMARY,
  callWithGeminiRetry,
  generateWithModelFallback,
} from './geminiUtils';

async function loadGenAi() {
  return import('@google/genai');
}

/**
 * Sends the exact same prompt the manual "Copy prompt" flow produces (see
 * buildCoverLetterPrompt) directly to Gemini, so both paths stay in sync by construction.
 */
export async function generateCoverLetterWithGemini(params: {
  apiKey: string | null | undefined;
  prompt: string;
}): Promise<string> {
  const apiKey = requireGeminiApiKey(params.apiKey);
  const { GoogleGenAI } = await loadGenAi();
  const ai = new GoogleGenAI({ apiKey });

  const response = await callWithGeminiRetry(() =>
    generateWithModelFallback(ai, {
      model: GEMINI_MODEL_PRIMARY,
      contents: params.prompt,
    }),
  );

  const text = response.text?.trim();

  if (!text) {
    throw new Error('Gemini returned an empty cover letter.');
  }

  return text;
}
