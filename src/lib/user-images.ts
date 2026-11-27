// Skin pictures a visitor adds themselves (for skins the catalog has no art
// for). They live ONLY in this browser's IndexedDB — never uploaded — and
// are used only to draw that visitor's own banner. Keys are skin ids; values
// are small JPEG data URLs produced by the cropper.

const DB_NAME = "oscar-user-images";
const STORE = "skins";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = work(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(request.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

export async function loadUserImages(): Promise<Record<string, string>> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const out: Record<string, string> = {};
      const tx = db.transaction(STORE, "readonly");
      const cursor = tx.objectStore(STORE).openCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) {
          if (typeof c.value === "string") out[String(c.key)] = c.value;
          c.continue();
        }
      };
      tx.oncomplete = () => {
        db.close();
        resolve(out);
      };
      tx.onerror = () => {
        db.close();
        resolve(out);
      };
    });
  } catch {
    return {};
  }
}

// Both return false when storage isn't available (private mode, quota);
// the caller still keeps the picture in memory for this visit.
export async function saveUserImage(skinId: string, dataUrl: string): Promise<boolean> {
  try {
    await run("readwrite", (store) => store.put(dataUrl, skinId));
    return true;
  } catch {
    return false;
  }
}

export async function removeUserImage(skinId: string): Promise<boolean> {
  try {
    await run("readwrite", (store) => store.delete(skinId));
    return true;
  } catch {
    return false;
  }
}
