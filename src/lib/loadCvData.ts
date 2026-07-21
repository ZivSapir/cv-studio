import { load as parseYaml } from 'js-yaml';
import masterExampleRaw from '../../data/master.example.yaml?raw';
import type { CvMaster } from '../types/cv';

export type CvDataSource = 'local' | 'example';

/** Bundled placeholder only — real master comes from the repository (disk or IndexedDB). */
export function loadExampleMasterCv(): CvMaster {
  return parseYaml(masterExampleRaw) as CvMaster;
}
