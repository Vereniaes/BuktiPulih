// Todo:
// -> store one private device draft per account for seven days
// -> write large files only when the selection changes

// --- Device drafts ---
import type { EvidenceLocation } from "@/types/location";
import type { PostMedia } from "@/types";

export interface DraftFile { id: string; file: File; aspect_ratio: PostMedia["aspect_ratio"]; url?: string }
export interface EvidenceDraft {
  submissionId: string; step: number; locationName: string; location: EvidenceLocation;
  locationConfirmed: boolean; ecosystem: string; condition: string; caption: string; anonymous: boolean;
}
type StoredDraft = EvidenceDraft & { owner: string; expiresAt: number; items: Omit<DraftFile,"file">[] };
const DATABASE = "buktipulih-evidence-drafts", WEEK = 7 * 24 * 60 * 60 * 1000;
const signatures = new Map<string,string>();
let revision = 0, queue: Promise<unknown> = Promise.resolve();
type StoredFile = {id:string;file:File|ArrayBuffer;name:string;type:string;lastModified:number};
export const draftRevision = () => revision;
const signature = (items: Pick<DraftFile,"id">[]) => items.map(item => item.id).join("|");
function database(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open(DATABASE,1);
    request.onupgradeneeded = () => { request.result.createObjectStore("drafts",{keyPath:"owner"}); request.result.createObjectStore("files",{keyPath:"owner"}); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("DRAFT_STORAGE_BLOCKED"));
  });
}
function complete(transaction: IDBTransaction, db: IDBDatabase): Promise<void> {
  return new Promise((resolve,reject) => {
    let failure: DOMException|null = null;
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = event => { failure = (event.target as IDBRequest).error ?? transaction.error; event.preventDefault(); try { transaction.abort(); } catch {} };
    transaction.onabort = () => { db.close(); reject(failure ?? transaction.error ?? new Error("DRAFT_STORAGE_FAILED")); };
  });
}
function ordered<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation,operation); queue = next.catch(() => {}); return next;
}

/** Input: current account. Output: its unexpired draft and files, or null. */
export function readEvidenceDraft(owner: string): Promise<{draft:EvidenceDraft;items:DraftFile[]}|null> {
  return ordered<{draft:EvidenceDraft;items:DraftFile[]}|null>(async () => {
    const db = await database(), tx = db.transaction(["drafts","files"],"readwrite"), done = complete(tx,db);
    const drafts = tx.objectStore("drafts"), files = tx.objectStore("files");
    const record = drafts.get(owner), media = files.get(owner), expired = drafts.openCursor();
    let result: {draft: EvidenceDraft; items: DraftFile[]}|null = null;
    expired.onsuccess = () => { const cursor = expired.result; if (!cursor) return; if (cursor.value.expiresAt <= Date.now()) { files.delete(cursor.key); cursor.delete(); signatures.delete(String(cursor.key)); } cursor.continue(); };
    media.onsuccess = () => {
      const draft = record.result as StoredDraft | undefined;
      if (!draft || draft.expiresAt <= Date.now()) return;
      const saved = (media.result?.items ?? []) as StoredFile[];
      const items = draft.items.flatMap(item => {
        const entry = saved.find(file => file.id===item.id);
        return entry ? [{...item,file:entry.file instanceof File ? entry.file : new File([entry.file],entry.name,{type:entry.type,lastModified:entry.lastModified})}] : [];
      });
      if (items.length !== draft.items.length) return;
      signatures.set(owner,signature(items)); result = {draft,items};
    };
    await done; return result;
  });
}

/** Input: draft, original files and the form's storage revision. Output: atomic local save. */
export function saveEvidenceDraft(owner: string, draft: EvidenceDraft, items: DraftFile[], expectedRevision: number) {
  return ordered(async () => {
    if (revision !== expectedRevision) return;
    const next = signature(items), changed = signatures.get(owner)!==next;
    async function write(replaceFiles: boolean): Promise<void> {
      const files: StoredFile[] = [];
      // Store bytes once - WebKit can reject native File/Blob records.
      if (replaceFiles) for (const {id,file} of items) files.push({id,file:await file.arrayBuffer(),name:file.name,type:file.type,lastModified:file.lastModified});
      const db = await database();
      if (revision!==expectedRevision) { db.close(); return; }
      const tx = db.transaction(["drafts","files"],"readwrite"), done = complete(tx,db);
      let retry = false, failure: unknown;
      const current = tx.objectStore("drafts").get(owner);
      current.onsuccess = () => {
        // Another tab may have replaced the files since this form last saved.
        if (!replaceFiles && signature(current.result?.items ?? [])!==next) { retry = true; tx.abort(); return; }
        try {
          tx.objectStore("drafts").put({...draft,owner,expiresAt:Date.now()+WEEK,items:items.map(({id,aspect_ratio,url})=>({id,aspect_ratio,url}))});
          if (replaceFiles) tx.objectStore("files").put({owner,items:files});
        } catch (error) { failure = error; tx.abort(); }
      };
      try { await done; }
      catch (error) { if (retry) return write(true); throw failure ?? error; }
    }
    await write(changed);
    if (revision===expectedRevision) signatures.set(owner,next);
  });
}

/** Input: account or all accounts on logout. Output: queued files and metadata removed. */
export function clearEvidenceDrafts(owner?: string) {
  revision += 1; signatures.clear();
  return ordered(async () => {
    const db = await database(), tx = db.transaction(["drafts","files"],"readwrite"), done = complete(tx,db);
    for (const name of ["drafts","files"]) { const store = tx.objectStore(name); if (owner) store.delete(owner); else store.clear(); }
    await done;
  });
}
// --- end of Device drafts ---
