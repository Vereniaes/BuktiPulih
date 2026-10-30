// Todo:
// -> submit authenticated field evidence and ordered media
// -> preserve location steps and retry completed uploads
"use client";

// --- Evidence form ---
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "motion/react";
import { EvidenceStep } from "./evidence/EvidenceStep";
import { EvidenceMediaField } from "./evidence/EvidenceMediaField";
import { useEvidenceMedia } from "./evidence/useEvidenceMedia";
import { useEvidenceDraft } from "./evidence/useEvidenceDraft";
import { useCategories } from "./evidence/useCategories";
import { CategoryField } from "./evidence/CategoryField";
import { MapIcon } from "./hazards/MapIcon";
import Link from "next/link";
import type { PostMedia, RecoveryReport } from "@/types";
import { useAccount } from "./account/AccountSession";
import { hasCompleteProfile, type AccountUser } from "@/types/account";
import { ApiError, createForumPostApi, uploadEvidenceApi } from "@/services/account";
import { getApiSessionContext } from "@/services/http";
import { keepDialogFocus } from "@/utils/dialogFocus";
import { evidenceRegion } from "@/utils/evidenceLocation";
import type { EvidenceLocation } from "@/types/location";
import { validCoordinates } from "@/utils/recoveryEvidence";
import styles from "./evidence/evidence-form.module.css";
const LocationPicker = dynamic(() => import("./evidence/EvidenceLocationPicker").then(mod => mod.EvidenceLocationPicker), { ssr: false, loading: () => <p role="status">Memuat peta…</p> });
interface Props { isOpen: boolean; onClose: () => void; onSubmitPost: (post: RecoveryReport) => void; language?: "id" | "en"; }
export function CreatePostModal({ isOpen, ...props }: Props) {
  const { user } = useAccount();
  return isOpen && user ? <EvidenceForm key={user.id} user={user} {...props} /> : null;
}
function EvidenceForm({ user, onClose, onSubmitPost, language = "id" }: Omit<Props, "isOpen"> & { user: AccountUser }) {
  const en = language === "en", t = (id: string, english: string) => en ? english : id;
  const dialog = useRef<HTMLDialogElement>(null), heading = useRef<HTMLHeadingElement>(null), errorRef = useRef<HTMLParagraphElement>(null);
  const controller = useRef(new AbortController()), locked = useRef(false), changing = useRef(false);
  const content = useRef<HTMLDivElement>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [submissionId,setSubmissionId] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState(1), [locationName, setLocationName] = useState("");
  const [location, setLocation] = useState<EvidenceLocation>({ point: null, province: "", city: "", place_detail: "" });
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const point = location.point;
  const [ecosystem, setEcosystem] = useState(""), [condition, setCondition] = useState("");
  const [caption, setCaption] = useState(""), [anonymous, setAnonymous] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState<"upload" | "save" | null>(null), [error, setError] = useState("");
  const media = useEvidenceMedia(code => setError(code === "FILE_LIMIT" ? t("Maksimal 5 berkas.","Choose up to 5 files.") : code === "FILE_TOO_LARGE" ? t("Setiap berkas maksimal 50 MB.","Each file can be up to 50 MB.") : code ? t("Berkas tidak didukung atau kosong.","The file is unsupported or empty.") : ""));
  const categories = useCategories(language);
  const snapshot = useMemo(() => ({submissionId,step,locationName,location,locationConfirmed,ecosystem,condition,caption,anonymous}),[submissionId,step,locationName,location,locationConfirmed,ecosystem,condition,caption,anonymous]);
  const draft = useEvidenceDraft(user.id,snapshot,media.items,async (saved,files) => {
    await media.restore(files);
    setSubmissionId(saved.submissionId); setStep(saved.step===2?2:1); setLocationName(saved.locationName); setLocation(saved.location);
    setLocationConfirmed(saved.locationConfirmed); setEcosystem(saved.ecosystem); setCondition(saved.condition); setCaption(saved.caption); setAnonymous(saved.anonymous);
  });
  async function close() { if (!busy && draft.ready && await draft.persist()) onClose(); }
  async function discard() { if (busy) return; await draft.discard().catch(()=>{}); onClose(); }
  useEffect(() => {
    const node = dialog.current, opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previous = document.body.style.overflow;
    node?.showModal(); document.body.style.overflow = "hidden"; heading.current?.focus();
    const active = new AbortController(); controller.current = active;
    return () => { active.abort(); node?.close(); document.body.style.overflow = previous; opener?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const locationReady = locationName.trim().length >= 2 && location.province.trim().length >= 2 && location.city.trim().length >= 2 && point && validCoordinates(point);
  function changeStep(next: number) {
    if (next === step || changing.current) return;
    changing.current = true; setTransitioning(true); setStep(next);
  }
  function finishStep() {
    if (!changing.current) return;
    changing.current = false; setTransitioning(false);
    (error ? errorRef.current : heading.current)?.focus({ preventScroll: true });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked.current || conflict || changing.current || !draft.ready) return;
    if (!locationReady || !locationConfirmed) { changeStep(1); setError(t("Pilih lokasi dan isi nama serta wilayah.", "Pick a location and enter its name and region.")); return; }
    if (step === 1) { setError(""); changeStep(2); return; }
    if (!media.items.length || media.choosing || !ecosystem || !condition || !caption.trim()) { setError(t("Lengkapi kondisi, foto atau video, dan catatan.", "Add the condition, photo or video, and field notes.")); return; }
    if (!hasCompleteProfile(user)) return;
    const session = user.session_context;
    const checkSession = () => { if (!session || session !== getApiSessionContext()) throw new Error(t("Sesi berubah. Buka ulang formulir untuk melanjutkan.", "Your session changed. Reopen the form to continue.")); };
    locked.current = true; setError("");
    try {
      checkSession(); setBusy("upload");
      const uploaded: PostMedia[] = [];
      for (const item of media.items) {
        checkSession();
        const url = item.url || await uploadEvidenceApi(item.file,controller.current.signal,progress => media.update(item.id,{progress}));
        if (controller.current.signal.aborted) return;
        media.update(item.id,{url,progress:100});
        uploaded.push({type:item.file.type.startsWith("video/") ? "video" : "image",url,aspect_ratio:item.aspect_ratio});
      }
      checkSession(); setBusy("save");
      const post = await createForumPostApi({ submission_id: submissionId, location_name: locationName.trim(), region_key: evidenceRegion(location.province, location.city), province: location.province.trim(), city: location.city.trim(), place_detail: location.place_detail.trim(),
        location: { type: "Point", coordinates: point! }, ecosystem_type: ecosystem, condition, caption: caption.trim(), is_anonymous: anonymous,
        media: uploaded[0], media_items: uploaded,
      }, controller.current.signal);
      if (!controller.current.signal.aborted) { await draft.discard().catch(()=>{}); onSubmitPost(post); }
    } catch (cause) {
      if (!controller.current.signal.aborted) {
        setConflict(cause instanceof ApiError && cause.code === "SUBMISSION_CONFLICT");
        setError(cause instanceof Error ? cause.message : t("Bukti belum tersimpan. Coba lagi.", "Evidence could not be saved. Try again."));
      }
    } finally { locked.current = false; if (!controller.current.signal.aborted) setBusy(null); }
  }
  return <dialog ref={dialog} onKeyDown={keepDialogFocus} className={styles.dialog} aria-labelledby="evidence-title" onCancel={event => { event.preventDefault(); void close(); }} onClick={event => { if (event.target === event.currentTarget && !busy) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) void close(); } }}>
    <header className={styles.header}><div><span>{step === 1 ? t("1 dari 2 · Lokasi", "1 of 2 · Location") : t("2 dari 2 · Bukti lapangan", "2 of 2 · Field evidence")}</span><h2 ref={heading} tabIndex={-1} id="evidence-title">{t("Kirim bukti", "Submit evidence")}</h2></div><button type="button" disabled={!!busy || !draft.ready} onClick={()=>void close()} aria-label={t("Tutup formulir", "Close form")}>×</button></header>
    {!hasCompleteProfile(user) ? <div className={styles.content}><p>{t("Lengkapi profil sebelum mengirim bukti.", "Complete your profile before submitting evidence.")}</p><Link href="/profile">{t("Buka profil", "Open profile")}</Link></div> : <form onSubmit={submit} className={styles.form} aria-busy={!!busy || transitioning}>
      <div ref={content} className={styles.content}>
        {!draft.ready && <p role="status">{t("Memuat draf…","Loading draft…")}</p>}
        {draft.failed && <p role="alert" className={styles.error}>{t("Draf belum tersimpan di perangkat. Coba lagi atau buang draf sebelum menutup.","The device draft could not be saved. Retry or discard it before closing.")} <button type="button" onClick={()=>void draft.persist()}>{t("Coba lagi","Try again")}</button></p>}
        {error && <p ref={errorRef} tabIndex={-1} className={styles.error} role="alert">{error}{conflict && <><br /><Link href="/profile">{t("Buka riwayat akun", "Open account history")}</Link></>}</p>}
        <AnimatePresence initial={false} mode="wait" onExitComplete={() => { if (content.current) content.current.scrollTop = 0; }}>
        {draft.ready && <EvidenceStep key={step} step={step} locked={transitioning} onReady={finishStep}>
        {step === 1 ? <>
          <div className={styles.locationFields}>
            <label>{t("Nama lokasi", "Location name")}<input autoComplete="off" value={locationName} onChange={event => setLocationName(event.target.value)} required minLength={2} maxLength={200} placeholder={t("Nama kawasan atau objek pemulihan", "Restoration area or landmark")} /></label>
            <LocationPicker value={location} onChange={next => { setLocation(next); setLocationConfirmed(false); }} onName={name => setLocationName(current => current || name)} language={language} />
          </div>
          <label className={styles.confirmLocation}><input type="checkbox" required checked={locationConfirmed} onChange={event => setLocationConfirmed(event.target.checked)} /><span>{t("Titik peta dan wilayah sudah sesuai.", "The map point and region are correct.")}<small>{t("Lokasi laporan akan terlihat publik.", "The report location will be public.")}</small></span></label>
        </> : <div className={styles.evidenceDetails}>
          <section className={styles.locationSummary} aria-label={t("Lokasi laporan", "Report location")}>
            <MapIcon name="pin" /><div><strong>{locationName}</strong><span>{[location.city, location.province].filter(Boolean).join(" · ")}</span>{location.place_detail && <span>{location.place_detail}</span>}</div>
            <button type="button" disabled={!!busy} onClick={() => changeStep(1)}>{t("Ubah lokasi", "Edit location")}</button>
          </section>
          <EvidenceMediaField items={media.items} disabled={!!busy || media.choosing} language={language} onChange={files => void media.add(files)} onRemove={media.remove} onMeasure={media.measure} />
          <CategoryField label={t("Ekosistem","Ecosystem")} value={ecosystem} options={categories.options("ecosystem")} onChange={setEcosystem} onCreate={label=>categories.create("ecosystem",label)} required disabled={!!busy} language={language} />
          <CategoryField label={t("Kondisi yang diamati","Observed condition")} value={condition} options={categories.options("condition")} onChange={setCondition} onCreate={label=>categories.create("condition",label)} required disabled={!!busy} language={language} />
          {categories.failed && <p role="status" className={styles.hint}>{t("Pilihan bersama belum dapat dimuat.","Shared categories are unavailable.")} <button type="button" onClick={categories.refresh}>{t("Coba lagi","Try again")}</button></p>}
          <label>{t("Catatan lapangan", "Field notes")}<textarea aria-label={t("Catatan lapangan", "Field notes")} required maxLength={5000} rows={5} disabled={!!busy} value={caption} onChange={event => setCaption(event.target.value)} placeholder={t("Ceritakan kondisi dan perubahan yang terlihat.", "Describe the conditions and changes you observed.")} /></label>
          <label className={styles.anonymous}><input type="checkbox" checked={anonymous} disabled={!!busy} onChange={event => setAnonymous(event.target.checked)} /><span><strong>{t("Tampilkan sebagai anonim", "Display anonymously")}</strong><small>{anonymous ? t("Nama dan foto profil disembunyikan. Lokasi tetap publik.", "Name and profile photo are hidden. The location stays public.") : t(`Dikirim sebagai @${user.username}.`, `Submitted as @${user.username}.`)}</small></span></label>
          <p className={styles.hint}>{t("Laporan ditampilkan sebagai belum diverifikasi.", "Reports are displayed as unverified.")}</p>
        </div>}
        </EvidenceStep>}
        </AnimatePresence>
      </div>
      <footer className={styles.footer}><button type="button" disabled={!!busy || !draft.ready || media.choosing} onClick={()=>void discard()}>{t("Buang draf","Discard draft")}</button>{step === 2 && <button type="button" disabled={!!busy || transitioning || media.choosing} onClick={() => changeStep(1)}>{t("Kembali", "Back")}</button>}<button type="submit" className={styles.primary} disabled={!draft.ready || !!busy || media.choosing || transitioning || conflict || (step === 1 && !locationReady)}>{busy === "upload" ? t(`Mengunggah ${Math.min(media.items.filter(item => item.url).length+1,media.items.length)} / ${media.items.length}…`,`Uploading ${Math.min(media.items.filter(item => item.url).length+1,media.items.length)} / ${media.items.length}…`) : busy === "save" ? t("Menyimpan…", "Saving…") : step === 1 ? t("Lanjutkan", "Continue") : t("Kirim bukti", "Submit evidence")}</button></footer>
    </form>}
  </dialog>;
}
// --- end of Evidence form ---
