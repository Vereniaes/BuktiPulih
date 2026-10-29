// Show the selected photo or video and keep the native file picker accessible.
"use client";
import { useId, useRef } from "react";
import { MapIcon } from "../hazards/MapIcon";
import styles from "./evidence-form.module.css";
interface Props {
  file: File | null; preview: string; disabled: boolean; language: "id" | "en";
  onChange: (file?: File) => void; onRemove: () => void; onMeasure: (width: number, height: number) => void;
}
export function EvidenceMediaField({ file, preview, disabled, language, onChange, onRemove, onMeasure }: Props) {
  const id = useId(), input = useRef<HTMLInputElement>(null), en = language === "en";
  const remove = () => { if (input.current) { input.current.value = ""; input.current.focus(); } onRemove(); };
  return <section className={styles.media}>
    <label id={`${id}-label`} htmlFor={id}>{en ? "Photo or video" : "Foto atau video"}</label>
    <div className={styles.mediaSurface}>
      {preview && (file?.type.startsWith("video/") ? <video className={styles.preview} src={preview} controls playsInline preload="metadata" onLoadedMetadata={event => onMeasure(event.currentTarget.videoWidth, event.currentTarget.videoHeight)} /> :
        // A local object URL previews the file before upload.
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.preview} src={preview} alt={en ? "Evidence preview" : "Pratinjau bukti"} onLoad={event => onMeasure(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)} />)}
      <div className={file ? styles.mediaActions : styles.emptyMedia}>
        {file && <span className={styles.fileName} title={file.name}>{file.name}</span>}
        <label className={styles.fileTrigger}>
          <input ref={input} id={id} type="file" aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} className={styles.fileInput}
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required={!file} disabled={disabled} onChange={event => onChange(event.target.files?.[0])} />
          <MapIcon name="upload" /><span>{file ? (en ? "Replace" : "Ganti") : (en ? "Choose photo or video" : "Pilih foto atau video")}</span>
        </label>
        {file && <button type="button" className={styles.removeMedia} disabled={disabled} onClick={remove}>{en ? "Remove" : "Hapus"}</button>}
      </div>
    </div>
    <small id={`${id}-help`}>{en ? "JPG, PNG, WebP, MP4 or WebM · Max. 10 MB" : "JPG, PNG, WebP, MP4 atau WebM · Maks. 10 MB"}</small>
  </section>;
}
