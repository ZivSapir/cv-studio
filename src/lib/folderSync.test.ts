import { describe, expect, it } from 'vitest';
import { dump } from 'js-yaml';
import { buildBackupFromFolderFiles } from './folderSync';
import { makeMaster, makeVersion } from '../testUtils/cvFixtures';

describe('buildBackupFromFolderFiles', () => {
  it('parses folder YAML into a backup and tags base/saved kinds', () => {
    const backup = buildBackupFromFolderFiles({
      master: dump(makeMaster()),
      bases: [dump(makeVersion({ id: 'base-a', label: 'Base A' }))],
      saved: [
        dump(makeVersion({ id: 'job-1', label: 'Job 1' })),
        dump(makeVersion({ id: 'job-2', label: 'Job 2' })),
      ],
    });

    expect(backup.bases.map((v) => [v.id, v.kind])).toEqual([['base-a', 'base']]);
    expect(backup.saved.map((v) => [v.id, v.kind])).toEqual([
      ['job-1', 'saved'],
      ['job-2', 'saved'],
    ]);
  });

  it('rejects a malformed master', () => {
    expect(() =>
      buildBackupFromFolderFiles({ master: 'name: only', bases: [], saved: [] }),
    ).toThrow();
  });
});
