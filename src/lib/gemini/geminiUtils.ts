import type { GoogleGenAI } from '@google/genai';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const GEMINI_MODEL_PRIMARY = 'gemini-2.5-flash';
export const GEMINI_MODEL_FALLBACK = 'gemini-2.5-flash-lite';

type QuotaInfo = {
  isDaily: boolean;
  isPerMinute: boolean;
  limit: number | null;
  model: string | null;
  retrySec: number | null;
};

const extractJsonFromError = (raw: string): Record<string, unknown> | null => {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(jsonMatch[0]);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const parseQuotaInfo = (parsed: Record<string, unknown>): QuotaInfo => {
  const nestedError =
    parsed.error && typeof parsed.error === 'object'
      ? (parsed.error as Record<string, unknown>)
      : parsed;

  const message =
    typeof nestedError.message === 'string' ? nestedError.message : '';
  const details = Array.isArray(nestedError.details)
    ? (nestedError.details as Record<string, unknown>[])
    : [];

  let isDaily = false;
  let isPerMinute = false;
  let limit: number | null = null;
  let model: string | null = null;

  for (const detail of details) {
    if (
      typeof detail['@type'] !== 'string' ||
      !detail['@type'].includes('QuotaFailure')
    ) {
      continue;
    }

    const violations = Array.isArray(detail.violations)
      ? (detail.violations as Record<string, unknown>[])
      : [];

    for (const violation of violations) {
      const quotaId =
        typeof violation.quotaId === 'string' ? violation.quotaId : '';
      const quotaValue =
        typeof violation.quotaValue === 'string'
          ? Number.parseInt(violation.quotaValue, 10)
          : typeof violation.quotaValue === 'number'
            ? violation.quotaValue
            : null;

      if (quotaId.includes('PerDay')) {
        isDaily = true;
      }

      if (quotaId.includes('PerMinute')) {
        isPerMinute = true;
      }

      if (quotaValue !== null && !Number.isNaN(quotaValue)) {
        limit = quotaValue;
      }

      const dimensions = violation.quotaDimensions;
      if (dimensions && typeof dimensions === 'object') {
        const modelName = (dimensions as Record<string, unknown>).model;
        if (typeof modelName === 'string') {
          model = modelName;
        }
      }
    }
  }

  const retryMatch = message.match(/retry in ([\d.]+)s/i);

  return {
    isDaily,
    isPerMinute,
    limit,
    model,
    retrySec: retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null,
  };
};

export const isRateLimitError = (error: unknown): boolean => {
  const raw = error instanceof Error ? error.message : String(error);

  return (
    raw.includes('429') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.toLowerCase().includes('quota')
  );
};

export const formatGeminiError = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);
  const parsed = extractJsonFromError(raw);

  if (parsed) {
    const nestedError =
      parsed.error && typeof parsed.error === 'object'
        ? (parsed.error as Record<string, unknown>)
        : parsed;
    const code = nestedError.code;
    const status = nestedError.status;
    const quota = parseQuotaInfo(parsed);

    if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
      if (quota.isDaily) {
        const modelLabel = quota.model ?? GEMINI_MODEL_PRIMARY;
        const limitLabel = quota.limit ?? 20;

        return `Daily Gemini quota used up (${limitLabel} requests/day for ${modelLabel} on the free tier). Waiting a few seconds won't help — try again tomorrow, enable billing in Google AI Studio, or we will auto-fallback to ${GEMINI_MODEL_FALLBACK}.`;
      }

      if (quota.isPerMinute) {
        const wait = quota.retrySec ?? 60;
        return `Gemini per-minute rate limit hit (~${quota.limit ?? 20}/min). Wait ${wait}s, then send one message.`;
      }

      const wait = quota.retrySec ?? 60;
      return `Gemini quota exceeded. Wait at least ${wait}s and try again, or check usage at ai.dev/rate-limit.`;
    }

    if (code === 503 || status === 'UNAVAILABLE') {
      return 'Gemini is temporarily busy. Please try again in a few seconds.';
    }

    const message =
      typeof nestedError.message === 'string' ? nestedError.message : null;

    if (message) {
      return message.length > 280 ? `${message.slice(0, 280)}…` : message;
    }
  }

  if (isRateLimitError(error)) {
    return 'Gemini quota exceeded. Check usage at ai.dev/rate-limit.';
  }

  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
};

const isTransientError = (error: unknown): boolean => {
  const raw = error instanceof Error ? error.message : String(error);

  return raw.includes('503') || raw.includes('UNAVAILABLE');
};

type GenerateContentParams = Parameters<
  GoogleGenAI['models']['generateContent']
>[0];

export const generateWithModelFallback = async (
  ai: GoogleGenAI,
  params: GenerateContentParams,
) => {
  const primaryModel = params.model ?? GEMINI_MODEL_PRIMARY;

  try {
    return await ai.models.generateContent({
      ...params,
      model: primaryModel,
    });
  } catch (error) {
    const shouldFallback = isRateLimitError(error) || isTransientError(error);

    if (!shouldFallback) {
      throw error;
    }

    if (primaryModel === GEMINI_MODEL_FALLBACK) {
      throw error;
    }

    return ai.models.generateContent({
      ...params,
      model: GEMINI_MODEL_FALLBACK,
    });
  }
};

/** Retries only transient 503 errors — never retries 429 (that burns extra quota). */
export const callWithGeminiRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 2,
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (isRateLimitError(error)) {
        throw error;
      }

      if (!isTransientError(error) || attempt === maxRetries) {
        throw error;
      }

      await sleep(3_000);
    }
  }

  throw lastError;
};
