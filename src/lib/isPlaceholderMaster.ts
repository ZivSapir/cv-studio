import type { CvMaster } from '../types/cv';

export function isPlaceholderMaster(master: CvMaster): boolean {
  return master.name.trim() === 'Your Name';
}
