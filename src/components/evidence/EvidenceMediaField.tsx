// Todo:
// -> preview up to five selected photos and videos
// -> keep adding, switching and removing files accessible
/* eslint-disable @next/next/no-img-element -- Local previews use object URLs. */
"use client";

// --- Media field ---
import { useId, useRef, useState } from "react";
import { MapIcon } from "../hazards/MapIcon";
import type { EvidenceFile } from "./useEvidenceMedia";
import { EVIDENCE_ACCEPT, EVIDENCE_FILE_LIMIT } from "@/utils/evidenceMedia";
import styles from "./evidence-form.module.css";
interface Props {
  items: EvidenceFile[]; disabled: boolean; language: "id" | "en";
  onChange: (files: File[]) => void; onRemove: (id: string) => void; onMeasure: (id: string, width: number, height: number) => void;
}
export function EvidenceMediaField({ items, disabled, language, onChange, onRemove, onMeasure }: Props) {
  const id = useId(), input = useRef<HTMLInputElement>(null), en = language === "en";
  const [selected,setSelected] = useState<string | null>(null), [failed,setFailed] = useState<string[]>([]);
  const item = items.find(entry => entry.id === selected) ?? items[0];
  const remove = () => { if (!item) return; onRemove(item.id); requestAnimationFrame(() => input.current?.focus()); };
  return <section className={styles.media}>
    <div className={styles.mediaHeading}><label id={`${id}-label`} htmlFor={id}>{en ? "Photos and videos" : "Foto dan video"}</label><span>{items.length} / {EVIDENCE_FILE_LIMIT}</span></div>
    <div className={styles.mediaSurface}>
      {item && (failed.includes(item.id) ? <p className={styles.previewUnavailable}>{en ? "Preview unavailable on this device." : "Pratinjau belum tersedia pada perangkat ini."}</p>
        : item.file.type.startsWith("video/") ? <video key={item.id} className={styles.preview} src={item.preview} controls playsInline preload="metadata" onError={() => setFailed(previous => [...previous,item.id])} onLoadedMetadata={event => onMeasure(item.id,event.currentTarget.videoWidth,event.currentTarget.videoHeight)} /> :
        <img key={item.id} className={styles.preview} src={item.preview} alt={en ? "Evidence preview" : "Pratinjau bukti"} onError={() => setFailed(previous => [...previous,item.id])} onLoad={event => onMeasure(item.id,event.currentTarget.naturalWidth,event.currentTarget.naturalHeight)} />)}
      {items.length > 1 && <div className={styles.mediaThumbnails} role="group" aria-label={en ? "Selected files" : "Berkas terpilih"}>{items.map((entry,index) => <button type="button" key={entry.id} disabled={disabled} aria-label={`${en ? "View file" : "Lihat berkas"} ${index+1}: ${entry.file.name}`} aria-pressed={entry.id === item?.id} onClick={() => setSelected(entry.id)}>
        {entry.thumbnail ? <img src={entry.thumbnail} alt="" /> : <span>{entry.file.type.startsWith("video/") ? "Video" : en ? "Photo" : "Foto"} {index+1}</span>}
      </button>)}</div>}
      <div className={item ? styles.mediaActions : styles.emptyMedia}>
        {item && <span className={styles.fileName} title={item.file.name}>{item.file.name}</span>}
        <label className={styles.fileTrigger}>
          <input ref={input} id={id} type="file" aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} className={styles.fileInput}
            accept={EVIDENCE_ACCEPT} multiple required={!items.length} disabled={disabled || items.length >= EVIDENCE_FILE_LIMIT} onChange={event => { onChange(Array.from(event.target.files || [])); event.target.value = ""; }} />
          <MapIcon name="upload" /><span>{item ? (en ? "Add media" : "Tambah media") : (en ? "Choose photos or videos" : "Pilih foto atau video")}</span>
        </label>
        {item && <button type="button" className={styles.removeMedia} disabled={disabled} onClick={remove}>{en ? "Remove" : "Hapus"}</button>}
      </div>
    </div>
    <small id={`${id}-help`}>{en ? "Up to 5 files · 50 MB each · JPG, PNG, WebP, HEIC/HEIF, MP4, MOV, M4V, WebM" : "Maks. 5 berkas · 50 MB per berkas · JPG, PNG, WebP, HEIC/HEIF, MP4, MOV, M4V, WebM"}</small>
  </section>;
}
// --- end of Media field ---
