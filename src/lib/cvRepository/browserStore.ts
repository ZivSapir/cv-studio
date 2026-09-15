import type { BrowserWorkspace } from './seedMigration';

export const DB_NAME = 'cv-studio';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';
const SYNC_CHANNEL_NAME = 'cv-studio-workspace-sync';

type WorkspaceRecord = BrowserWorkspace;

// Distinguishes "this tab wrote" from "another tab wrote" on the sync channel below, so a tab
// doesn't warn itself about its own write.
const tabId = Math.random().toString(36).slice(2);

function openSyncChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }

  try {
    return new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    return null;
  }
}

const syncChannel = openSyncChannel();

/**
 * Notifies `onChange` when the IndexedDB workspace is written from another tab/window — the
 * read-modify-write pattern here isn't transactional across tabs, so two tabs saving around the
 * same time can silently clobber each other without a heads-up like this.
 */
export function onWorkspaceChangedElsewhere(onChange: () => void): () => void {
  if (!syncChannel) {
    return () => {};
  }

  const handleMessage = (event: MessageEvent<{ tabId: string }>) => {
    if (event.data?.tabId !== tabId) {
      onChange();
    }
  };

  syncChannel.addEventListener('message', handleMessage);
  return () => syncChannel.removeEventListener('message', handleMessage);
}

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
  syncChannel?.postMessage({ tabId });
}

export async function clearWorkspace(): Promise<void> {
  await withStore('readwrite', (store) => store.delete('main'));
}
