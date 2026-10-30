// Todo:
// -> show a community report and its ordered media
"use client";

// --- Report details ---
import Link from "next/link";
import type { RecoveryReport } from "@/types";
import { categoryLabel } from "@/utils/recoveryEvidence";
import { REGION_TABS } from "@/utils/plotDisplay";
import { MapIcon } from "../hazards/MapIcon";
import styles from "./recovery-detail.module.css";
import { MediaGallery } from "../evidence/MediaGallery";
import { getPostMedia } from "@/utils/evidenceMedia";

interface Props {
  report: RecoveryReport;
  language: "id" | "en";
  onClose: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

export function RecoveryReportDetail({ report, language, onClose, expanded, onToggleExpand }: Props) {
  const isId = language === "id";
  const locale = isId ? "id-ID" : "en-US";
  const region = report.province || (report.region_key === "lainnya" ? null : REGION_TABS.find(item => item.key === report.region_key)?.province)
    || (isId ? "Wilayah lain" : "Other region");
  const condition = categoryLabel("condition",report.condition,language);
  const ecosystem = categoryLabel("ecosystem",report.ecosystem_type,language);
  const author = report.is_anonymous && report.author.username !== "Deleted Account"
    ? (isId ? "Anonim" : "Anonymous")
    : report.author.username || (isId ? "Warga" : "Community member");
  const date = new Date(report.created_at);
  const dateLabel = Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
  }).format(date);
  const [longitude, latitude] = report.location.coordinates;

  return (
    <section className={styles.detail}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.code}>{isId ? "Laporan warga" : "Community report"}</span>
          <h2>{report.location_name}</h2>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.expand} aria-expanded={expanded} onClick={onToggleExpand} aria-label={isId ? (expanded ? "Perkecil panel" : "Perbesar panel") : (expanded ? "Collapse panel" : "Expand panel")}><MapIcon name="back" /></button>
          <button type="button" className={styles.close} onClick={onClose} aria-label={isId ? "Tutup rincian" : "Close details"}><MapIcon name="close" /></button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.content}>
          <MediaGallery key={report.id} items={getPostMedia(report)} label={report.location_name} language={language} variant="panel" />

          <div className={styles.evidenceStatus} role="status">
            <span className={styles.evidenceStatusDot} aria-hidden="true" />
            {isId ? "Belum diverifikasi" : "Unverified"}
          </div>

          <dl className={styles.facts}>
            <dt>{isId ? "Wilayah laporan · ekosistem" : "Reported region · ecosystem"}</dt>
            <dd>{region} · {ecosystem}</dd>
            {report.city && <><dt>{isId ? "Daerah/Kota" : "District/City"}</dt><dd>{report.city}</dd></>}
            {report.place_detail && <><dt>{isId ? "Detail tempat" : "Place details"}</dt><dd>{report.place_detail}</dd></>}
            <dt>{isId ? "Kondisi yang dilaporkan" : "Reported condition"}</dt>
            <dd>{condition}</dd>
            <dt>{isId ? "Pengirim" : "Submitted by"}</dt>
            <dd>{author}</dd>
            <dt>{isId ? "Tanggal" : "Date"}</dt>
            <dd><time dateTime={report.created_at}>{dateLabel}</time></dd>
          </dl>

          <p className={styles.caption}>{report.caption}</p>
          <div className={styles.coordinates}>
            <span>{isId ? "Koordinat · lintang, bujur" : "Coordinates · latitude, longitude"}</span>
            <code>{latitude.toFixed(6)}, {longitude.toFixed(6)}</code>
          </div>
          <Link className={styles.evidenceSource} href={`/forum/${encodeURIComponent(report.id)}`}>
            {isId ? "Buka catatan lengkap" : "Open full report"}
          </Link>
        </div>
      </div>
    </section>
  );
}
// --- end of Report details ---
