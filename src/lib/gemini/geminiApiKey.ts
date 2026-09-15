const STORAGE_KEY = 'cv-studio:gemini-api-key:v1';

export const MISSING_GEMINI_KEY_MESSAGE =
  'Add a Gemini API key first to generate with AI.';

export function readGeminiApiKey(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeGeminiApiKey(apiKey: string | null): void {
  try {
    const trimmed = apiKey?.trim();

    if (trimmed) {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private mode, etc.) — key simply won't persist.
  }
}

export function requireGeminiApiKey(apiKey: string | null | undefined): string {
  const trimmed = apiKey?.trim();

  if (!trimmed) {
    throw new Error(MISSING_GEMINI_KEY_MESSAGE);
  }

  return trimmed;
}
