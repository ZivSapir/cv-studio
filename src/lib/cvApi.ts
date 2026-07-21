import type { CvDataSource } from './loadCvData';
import type {
  CvLibrary,
  CvVersion,
  PromoteToBaseTarget,
} from '../types/cv';

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? 'Request failed.');
  }

  return response.json() as Promise<T>;
}

export async function fetchCvLibrary(
  source: CvDataSource = 'local',
): Promise<CvLibrary> {
  const response = await fetch(`/api/cv/library?source=${source}`);
  return parseJsonResponse<CvLibrary>(response);
}

export async function saveCvCopy(
  label: string,
  sourceId: string,
  notes?: string,
): Promise<CvVersion> {
  const response = await fetch('/api/cv/saved', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      label,
      sourceId,
      notes,
    }),
  });

  return parseJsonResponse<CvVersion>(response);
}

export async function updateCvVersion(
  id: string,
  version: CvVersion,
): Promise<CvVersion> {
  const response = await fetch(`/api/cv/version/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(version),
  });

  return parseJsonResponse<CvVersion>(response);
}

export async function promoteCvToBase(
  sourceId: string,
  target: PromoteToBaseTarget,
): Promise<CvVersion> {
  const response = await fetch('/api/cv/base', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceId,
      ...target,
    }),
  });

  return parseJsonResponse<CvVersion>(response);
}

export async function deleteSavedCv(id: string): Promise<void> {
  const response = await fetch(`/api/cv/saved/${id}`, {
    method: 'DELETE',
  });

  await parseJsonResponse<{ ok: true }>(response);
}
