import type { BrowserWorkspace } from './seedMigration';

const DB_NAME = 'cv-studio';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';

type WorkspaceRecord = BrowserWorkspace;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB.'));
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = run(store);

    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export async function readWorkspace(): Promise<WorkspaceRecord | null> {
  const value = await withStore<WorkspaceRecord | undefined>(
    'readonly',
    (store) => store.get('main'),
  );

  return value ?? null;
}

export async function writeWorkspace(
  workspace: WorkspaceRecord,
): Promise<void> {
  await withStore('readwrite', (store) => store.put(workspace, 'main'));
}

export async function clearWorkspace(): Promise<void> {
  await withStore('readwrite', (store) => store.delete('main'));
}
