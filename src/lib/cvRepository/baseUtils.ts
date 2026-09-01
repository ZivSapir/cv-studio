import type { CvVersion } from '../../types/cv';

const PREFERRED_COMPARE_BASE_IDS = [
  'fullstack-cv',
  'frontend-cv',
  'mobile-cv',
  'ai-engineer-cv',
  'data-engineer-cv',
  'main-cv',
] as const;

export function resolveCompareBaseId(bases: CvVersion[]): string {
  for (const preferredId of PREFERRED_COMPARE_BASE_IDS) {
    const match = bases.find((base) => base.id === preferredId);
    if (match) {
      return match.id;
    }
  }

  return bases[0]?.id ?? 'fullstack-cv';
}
