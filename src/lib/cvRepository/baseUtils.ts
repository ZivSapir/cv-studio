import type { CvVersion } from '../../types/cv';

const DEFAULT_COMPARE_BASE_ID = 'main-cv';

export function resolveCompareBaseId(bases: CvVersion[]): string {
  const preferred = bases.find((base) => base.id === DEFAULT_COMPARE_BASE_ID);
  return preferred?.id ?? bases[0]?.id ?? DEFAULT_COMPARE_BASE_ID;
}
