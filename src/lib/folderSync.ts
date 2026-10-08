import { load as parseYaml } from 'js-yaml';
import type { CvBackup } from './cvRepository';
import { validateCvBackup } from './cvValidation';

// Minimal typings for the File System Access API (Chromium browsers only).
type PermissionMode = { mode: 'read' };
type FileHandle = { kind: 'file'; name: string; getFile: () => Promise<File> };
type DirectoryHandle = {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<FileHandle | DirectoryHandle>;
  getFileHandle: (name: string) => Promise<FileHandle>;
  getDirectoryHandle: (name: string) => Promise<DirectoryHandle>;
  queryPermission: (options: PermissionMode) => Promise<PermissionState>;
  requestPermission: (options: PermissionMode) => Promise<PermissionState>;
};

export type CvDataFolderHandle = DirectoryHandle;

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: 'read' }) => Promise<DirectoryHandle>;
};

const DB_NAME = 'cv-studio-folder';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'data-folder';
const READ: PermissionMode = { mode: 'read' };

export type FolderFiles = {
  master: string;
  bases: string[];
  saved: string[];
};

/** Turns the raw YAML text of a `data/` folder into a validated backup payload. */
export function buildBackupFromFolderFiles(files: FolderFiles): CvBackup {
  const withKind = (kind: 'base' | 'saved') => (text: string) => ({
    ...(parseYaml(text) as Record<string, unknown>),
    kind,
  });

  return validateCvBackup({
    version: 1,
    exportedAt: new Date().toISOString(),
    master: parseYaml(files.master),
    bases: files.bases.map(withKind('base')),
    saved: files.saved.map(withKind('saved')),
  });
}

export function isFolderSyncSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as PickerWindow).showDirectoryPicker === 'function';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const request = run(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getStoredDataFolder(): Promise<CvDataFolderHandle | null> {
  try {
    const handle = await withStore<CvDataFolderHandle | undefined>(
      'readonly',
      (store) => store.get(HANDLE_KEY),
    );
    return handle ?? null;
  } catch {
    return null;
  }
}

export async function pickDataFolder(): Promise<CvDataFolderHandle> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) {
    throw new Error('This browser cannot connect a folder. Use Chrome or Edge.');
  }

  const handle = await picker.call(window, { mode: 'read' });
  await withStore('readwrite', (store) => store.put(handle, HANDLE_KEY));
  return handle;
}

export async function forgetDataFolder(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(HANDLE_KEY));
}

/** `request: false` never prompts, so it is safe to call on page load. */
export async function hasFolderReadAccess(
  handle: CvDataFolderHandle,
  request: boolean,
): Promise<boolean> {
  if ((await handle.queryPermission(READ)) === 'granted') {
    return true;
  }

  return request && (await handle.requestPermission(READ)) === 'granted';
}

async function readYamlFiles(directory: DirectoryHandle): Promise<string[]> {
  const files: FileHandle[] = [];

  for await (const entry of directory.values()) {
    if (
      entry.kind === 'file'
      && entry.name.endsWith('.yaml')
      && !entry.name.endsWith('.example.yaml')
    ) {
      files.push(entry);
    }
  }

  return Promise.all(files.map(async (file) => (await file.getFile()).text()));
}

async function readOptionalDirectory(
  parent: DirectoryHandle,
  name: string,
): Promise<string[]> {
  try {
    return await readYamlFiles(await parent.getDirectoryHandle(name));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return [];
    }
    throw error;
  }
}

export async function readBackupFromDataFolder(
  folder: CvDataFolderHandle,
): Promise<CvBackup> {
  let masterText: string;
  try {
    masterText = await (await (await folder.getFileHandle('master.yaml')).getFile()).text();
  } catch {
    throw new Error('master.yaml not found. Pick the "data" folder inside your cv-studio project.');
  }

  return buildBackupFromFolderFiles({
    master: masterText,
    bases: await readOptionalDirectory(folder, 'bases'),
    saved: await readOptionalDirectory(folder, 'saved'),
  });
}
