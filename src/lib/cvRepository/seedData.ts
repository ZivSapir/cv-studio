import { load as parseYaml } from 'js-yaml';
import masterExampleRaw from '../../../data/master.example.yaml?raw';
import mainBaseRaw from '../../../data/bases/main-cv.example.yaml?raw';
import type { CvMaster, CvVersion } from '../../types/cv';

export function getExampleMaster(): CvMaster {
  return parseYaml(masterExampleRaw) as CvMaster;
}

export function getExampleBases(): CvVersion[] {
  return [
    {
      ...(parseYaml(mainBaseRaw) as CvVersion),
      kind: 'base',
    },
  ];
}

export function getExampleSaved(): CvVersion[] {
  return [];
}
