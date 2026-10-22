// Autosave for the registration form, so a refresh never loses what the
// student has already filled in.
//
// - Text answers (including the password) live in sessionStorage: they survive
//   a refresh but disappear when the tab is closed.
// - Uploaded files (ID proofs, signature, photos) are too big for that, so they
//   go in IndexedDB, tagged with this tab's session id. Anything left over from
//   another tab or an older visit is ignored and deleted.
// - Everything is wiped once the registration is submitted.
// All of it is best-effort: if storage is blocked the form still works.

const DB_NAME = "enroll-drafts";
const STORE = "files";
const SID_KEY = "enroll-sid";

export type DraftText = Record<string, unknown>;
export type FileSlot = "idProof1" | "idProof2" | "profilePhoto" | "signature" | "selfie";

const textKey = (draftKey: string) => `enroll:${draftKey}`;

function sessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "none";
  }
}

export function loadText(draftKey: string): DraftText | null {
  try {
    const raw = sessionStorage.getItem(textKey(draftKey));
    return raw ? (JSON.parse(raw) as DraftText) : null;
  } catch {
    return null;
  }
}

export function saveText(draftKey: string, data: DraftText) {
  try {
    sessionStorage.setItem(textKey(draftKey), JSON.stringify(data));
  } catch {
    /* storage blocked or full — ignore */
  }
}

// ---- IndexedDB (files) ----------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      })
  );
}

const fileKey = (draftKey: string, slot: FileSlot) => `${draftKey}:${slot}`;

interface StoredFile {
  sid: string;
  blob: Blob;
  name: string;
  type: string;
}

export async function saveFile(draftKey: string, slot: FileSlot, file: Blob | null) {
  try {
    if (!file) {
      await run("readwrite", (st) => st.delete(fileKey(draftKey, slot)));
      return;
    }
    const entry: StoredFile = {
      sid: sessionId(),
      blob: file,
      name: file instanceof File ? file.name : `${slot}`,
      type: file.type,
    };
    await run("readwrite", (st) => st.put(entry, fileKey(draftKey, slot)));
  } catch {
    /* ignore */
  }
}

export async function loadFile(draftKey: string, slot: FileSlot): Promise<{ blob: Blob; name: string; type: string } | null> {
  try {
    const entry = await run<StoredFile | undefined>("readonly", (st) => st.get(fileKey(draftKey, slot)));
    if (!entry || entry.sid !== sessionId()) return null; // left over from another tab/visit
    return { blob: entry.blob, name: entry.name, type: entry.type };
  } catch {
    return null;
  }
}

export async function clearDraft(draftKey: string) {
  try {
    sessionStorage.removeItem(textKey(draftKey));
  } catch {
    /* ignore */
  }
  const slots: FileSlot[] = ["idProof1", "idProof2", "profilePhoto", "signature", "selfie"];
  await Promise.all(slots.map((slot) => saveFile(draftKey, slot, null)));
}
