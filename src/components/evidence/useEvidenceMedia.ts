// Todo:
// -> select bounded evidence files and create small previews
// -> retain completed uploads during retries
"use client";

// --- Selected media ---
import { useEffect, useRef, useState } from "react";
import type { PostMedia } from "@/types";
import { EVIDENCE_FILE_LIMIT, inspectEvidenceFile } from "@/utils/evidenceMedia";
import { resizeImageBlob } from "@/utils/imageCompression";
import type { DraftFile } from "@/utils/evidenceDrafts";

export interface EvidenceFile {
  id: string; file: File; preview: string; thumbnail?: string;
  aspect_ratio: PostMedia["aspect_ratio"]; url?: string; progress?: number;
}

const aspect = (width: number, height: number): PostMedia["aspect_ratio"] => width/height>1.25 ? "landscape" : width/height<.85 ? "portrait" : "square";

/** Input: validation feedback. Output: selected files and their upload state. */
export function useEvidenceMedia(onError: (message: string) => void) {
  const [items,setItems] = useState<EvidenceFile[]>([]), [choosing,setChoosing] = useState(false);
  const urls = useRef(new Set<string>()), alive = useRef(true), locked = useRef(false);
  useEffect(() => { const created = urls.current; alive.current = true; return () => { alive.current = false; created.forEach(url => URL.revokeObjectURL(url)); created.clear(); }; },[]);
  const objectUrl = (file: Blob) => { const url = URL.createObjectURL(file); urls.current.add(url); return url; };
  async function add(files: File[]) {
    if (!files.length || locked.current) return;
    if (items.length + files.length > EVIDENCE_FILE_LIMIT) { onError("FILE_LIMIT"); return; }
    locked.current = true; setChoosing(true);
    try {
      const checked: File[] = [];
      for (const file of files) {
        const type = await inspectEvidenceFile(file);
        checked.push(type === file.type ? file : new File([file],file.name,{type,lastModified:file.lastModified}));
      }
      const added: EvidenceFile[] = [];
      for (const file of checked) {
        const small = file.type.startsWith("image/") ? await resizeImageBlob(file,320,.75,320).catch(() => null) : null;
        if (!alive.current) return;
        added.push({id:crypto.randomUUID(),file,preview:objectUrl(file),thumbnail:small ? objectUrl(small.blob) : undefined,aspect_ratio:small ? aspect(small.width,small.height) : "landscape"});
      }
      if (alive.current) { setItems(previous => [...previous,...added]); onError(""); }
    } catch (error) { if (alive.current) onError(error instanceof Error ? error.message : "UNSUPPORTED_FILE"); }
    finally { locked.current = false; if (alive.current) setChoosing(false); }
  }
  function remove(id: string) {
    const item = items.find(entry => entry.id === id);
    if (item) for (const url of [item.preview,item.thumbnail]) if (url) { URL.revokeObjectURL(url); urls.current.delete(url); }
    setItems(previous => previous.filter(entry => entry.id !== id));
  }
  const update = (id: string, changes: Partial<EvidenceFile>) => setItems(previous => previous.map(item => item.id === id ? {...item,...changes} : item));
  const measure = (id: string, width: number, height: number) => { if (width && height) update(id,{aspect_ratio:aspect(width,height)}); };
  async function restore(saved: DraftFile[]) {
    if (saved.length > EVIDENCE_FILE_LIMIT) throw new Error("FILE_LIMIT");
    const restored: EvidenceFile[] = [];
    for (const item of saved) {
      const type = await inspectEvidenceFile(item.file);
      const file = new File([item.file],item.file.name,{type,lastModified:item.file.lastModified});
      const small = type.startsWith("image/") ? await resizeImageBlob(file,320,.75,320).catch(()=>null) : null;
      if (!alive.current) return;
      restored.push({...item,file,preview:objectUrl(file),thumbnail:small?objectUrl(small.blob):undefined});
    }
    if (alive.current) setItems(restored);
  }
  return {items,choosing,add,remove,update,measure,restore};
}
// --- end of Selected media ---
