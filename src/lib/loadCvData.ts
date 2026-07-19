import { load as parseYaml } from 'js-yaml';
import masterRaw from '../../data/master.yaml?raw';
import type { CvMaster } from '../types/cv';

export function loadMasterCv(): CvMaster {
  return parseYaml(masterRaw) as CvMaster;
}
