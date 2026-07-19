import { load as parseYaml } from 'js-yaml';
import masterExampleRaw from '../../data/master.example.yaml?raw';
import masterRaw from '../../data/master.yaml?raw';
import type { CvMaster } from '../types/cv';

export type CvDataSource = 'local' | 'example';

export function loadMasterCv(source: CvDataSource = 'local'): CvMaster {
  const raw = source === 'example' ? masterExampleRaw : masterRaw;
  return parseYaml(raw) as CvMaster;
}
