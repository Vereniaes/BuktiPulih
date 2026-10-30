// Todo:
// -> restore device drafts and debounce small field changes
// -> stop pending saves before submission, discard or logout
"use client";

// --- Draft lifecycle ---
import { useEffect,useEffectEvent,useRef,useState } from "react";
import { clearEvidenceDrafts,draftRevision,readEvidenceDraft,saveEvidenceDraft,type DraftFile,type EvidenceDraft } from "@/utils/evidenceDrafts";

/** Input: account, form and files. Output: local restore, save and discard lifecycle. */
export function useEvidenceDraft(owner: string, draft: EvidenceDraft, items: DraftFile[], restore: (draft: EvidenceDraft,items: DraftFile[])=>Promise<void>) {
  const [ready,setReady] = useState(false),[failed,setFailed] = useState(false);
  const stopped = useRef(false),version = useRef(draftRevision()),timer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const latest = useRef({draft,items}), onRestore = useEffectEvent(restore);
  useEffect(() => { latest.current = {draft,items}; },[draft,items]);
  useEffect(() => {
    let active = true;
    readEvidenceDraft(owner).then(async saved => { if (saved && active && version.current===draftRevision()) await onRestore(saved.draft,saved.items); }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  },[owner]);
  async function persist() {
    if (stopped.current || version.current!==draftRevision()) return true;
    if (timer.current) clearTimeout(timer.current);
    try { await saveEvidenceDraft(owner,latest.current.draft,latest.current.items,version.current); setFailed(false); return true; }
    catch { setFailed(true); return false; }
  }
  const saveCurrent = useEffectEvent(persist);
  useEffect(() => {
    if (!ready) return;
    timer.current = setTimeout(() => void saveCurrent(),350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  },[ready,draft,items]);
  useEffect(() => {
    const pagehide = () => { if (!stopped.current && version.current===draftRevision()) void saveEvidenceDraft(owner,latest.current.draft,latest.current.items,version.current).catch(()=>{}); };
    window.addEventListener("pagehide",pagehide);
    return () => window.removeEventListener("pagehide",pagehide);
  },[owner]);
  async function discard() { stopped.current = true; if (timer.current) clearTimeout(timer.current); await clearEvidenceDrafts(owner); }
  return {ready,failed,persist,discard};
}
// --- end of Draft lifecycle ---
