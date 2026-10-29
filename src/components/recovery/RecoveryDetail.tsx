// Show a selected restoration plot and its field history.
"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { PlotFeature, TimelineItem } from "@/types";
import { STATUS_DISPLAY, formatId } from "@/utils/plotDisplay";
import { MapIcon } from "../hazards/MapIcon";
import styles from "./recovery-detail.module.css";

interface Props {
  plot: PlotFeature;
  items: TimelineItem[];
  language: "id" | "en";
  onClose: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  historyLoading: boolean;
  historyFailed: boolean;
  historyHasMore: boolean;
  historyPending: boolean;
  onLoadMore: () => void;
  onRetryHistory: () => void;
}

function Photo({ src, alt, className, emptyLabel }: { src: string; alt: string; className?: string; emptyLabel: string }) {
  const [failedSrc, setFailedSrc] = useState("");
  const failed = !src || failedSrc === src;

  return failed ? (
    <div className={`${styles.photoFallback} ${className ?? ""}`} role="img" aria-label={emptyLabel}>
      <span aria-hidden="true">⌁</span>{emptyLabel}
    </div>
  ) : (
    // Original URLs can point to local evidence or external sources.
    // eslint-disable-next-line @next/next/no-img-element
    <img width={600} height={360} className={className} src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} />
  );
}

function dateLabel(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function RecoveryDetail({ plot, items, language, onClose, expanded, onToggleExpand, historyLoading, historyFailed, historyHasMore, historyPending, onLoadMore, onRetryHistory }: Props) {
  const { properties } = plot;
  const [tab, setTab] = useState<"details" | "history">("details");
  const tabList = useRef<HTMLDivElement>(null);
  const isId = language === "id";
  const locale = isId ? "id-ID" : "en-US";
  const tabLabels = isId ? ["Rincian", "Riwayat"] : ["Details", "History"];
  const labels: Record<string, string> = isId
    ? { subur: "tumbuh subur", perlu_rawat: "perlu dirawat", kritis: "kritis", mati: "mati" }
    : { subur: "healthy growth", perlu_rawat: "needs care", kritis: "critical", mati: "dead" };
  const status = STATUS_DISPLAY[properties.latest_status];

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : event.key === "ArrowRight" ? (tab === "details" ? 1 : 0) : tab === "history" ? 0 : 1;
    setTab(next === 0 ? "details" : "history");
    tabList.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  }

  const number = (value: number, digits = 0) => isId ? formatId(value, digits) : value.toLocaleString(locale, { maximumFractionDigits: digits });
  const ecosystem = isId ? properties.ecosystem_type.replaceAll("_", " ") : { gambut: "Peatland", hutan_kota: "Urban forest", mineral: "Mineral soil" }[properties.ecosystem_type];
  const planted = number(properties.total_planted);
  const alive = number(properties.current_alive);

  return (
    <section className={styles.detail}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.code}>{properties.plot_code}</span>
          <h2>{properties.name}</h2>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.expand} aria-expanded={expanded} onClick={onToggleExpand} aria-label={isId ? (expanded ? "Perkecil panel" : "Perbesar panel") : (expanded ? "Collapse panel" : "Expand panel")}><MapIcon name="back" /></button>
          <button type="button" className={styles.close} onClick={onClose} aria-label={isId ? "Tutup rincian" : "Close details"}><MapIcon name="close" /></button>
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label={isId ? "Bagian rincian petak" : "Plot detail sections"} ref={tabList}>
        {(["details", "history"] as const).map((key, index) => (
          <button key={key} type="button" role="tab" id={`recovery-${key}-tab`} aria-controls={`recovery-${key}-panel`} aria-selected={tab === key} tabIndex={tab === key ? 0 : -1} onClick={() => setTab(key)} onKeyDown={handleTabKey}>
            {tabLabels[index]}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {tab === "details" ? (
          <div id="recovery-details-panel" role="tabpanel" tabIndex={0} aria-labelledby="recovery-details-tab" className={styles.content}>
            <Photo src={properties.cover_image_url} alt={isId ? `Foto ${properties.name}` : `Photo of ${properties.name}`} className={styles.cover} emptyLabel={isId ? "Foto petak belum tersedia" : "Plot photo unavailable"} />
            <div className={styles.status}>
              <span className={styles.statusDot} style={{ backgroundColor: status.color }} />
              <span>{labels[properties.latest_status] ?? status.label}</span>
            </div>
            <dl className={styles.facts}>
              <dt>{isId ? "Provinsi · ekosistem" : "Province · ecosystem"}</dt>
              <dd>{properties.region} · {ecosystem}</dd>
              <dt>{isId ? "Komunitas" : "Community"}</dt>
              <dd>{properties.community_name}</dd>
              <dt>{isId ? "Koordinator" : "Coordinator"}</dt>
              <dd>{properties.coordinator_name}</dd>
              <dt>{isId ? "Pemeriksaan terakhir" : "Last checked"}</dt>
              <dd>{dateLabel(properties.last_monitored_at, locale)}</dd>
            </dl>
            <dl className={styles.metrics}>
              <div><dt>{isId ? "Ditanam" : "Planted"}</dt><dd>{planted}</dd></div>
              <div><dt>{isId ? "Hidup" : "Alive"}</dt><dd>{alive}</dd></div>
              <div><dt>{isId ? "Kelangsungan hidup" : "Survival"}</dt><dd>{number(properties.survival_rate, 2)}%</dd></div>
            </dl>
            <div className={styles.coordinates}>
              <span>{isId ? "Koordinat" : "Coordinates"}</span>
              <code>{plot.geometry.coordinates[1].toFixed(5)}, {plot.geometry.coordinates[0].toFixed(5)}</code>
            </div>
          </div>
        ) : (
          <div id="recovery-history-panel" role="tabpanel" tabIndex={0} aria-labelledby="recovery-history-tab" className={styles.content}>
            {historyLoading ? <p className={styles.message} role="status">{isId ? "Memuat riwayat…" : "Loading history…"}</p> : historyFailed && items.length === 0 ? (
              <div className={styles.message} role="alert">
                <p>{isId ? "Riwayat belum dapat dimuat." : "History could not be loaded."}</p>
                <button type="button" className={styles.retry} disabled={historyPending} onClick={onRetryHistory}>{historyPending ? (isId ? "Memuat…" : "Loading…") : (isId ? "Coba lagi" : "Try again")}</button>
              </div>
            ) : items.length === 0 ? (
              <p className={styles.message}>{isId ? "Belum ada riwayat." : "No history yet."}</p>
            ) : (
              <ol className={styles.history}>
                {items.map((item) => (
                  <li key={item.id} className={styles.entry}>
                    <time dateTime={item.monitoring_date}>{dateLabel(item.monitoring_date, locale)}</time>
                    <Photo src={item.images.current_photo_url} alt={item.images.current_label || (isId ? "Foto kondisi terkini" : "Current condition photo")} className={styles.historyPhoto} emptyLabel={isId ? "Foto belum tersedia" : "Photo unavailable"} />
                    {item.field_notes && <p className={styles.notes}>{item.field_notes}</p>}
                    <p className={styles.reporter}>{isId ? "Dilaporkan oleh" : "Reported by"} <strong>{item.reporter.full_name}</strong></p>
                    <p className={styles.condition}>{labels[item.tree_metrics.condition_status] || item.tree_metrics.condition_label}</p>
                  </li>
                ))}
              </ol>
            )}
            {historyFailed && items.length > 0 && <div className={styles.message} role="alert"><p>{isId ? "Riwayat berikutnya belum dapat dimuat." : "More history could not be loaded."}</p><button type="button" className={styles.retry} disabled={historyPending} onClick={onRetryHistory}>{historyPending ? (isId ? "Memuat…" : "Loading…") : (isId ? "Coba lagi" : "Try again")}</button></div>}
            {!historyLoading && !historyFailed && historyHasMore && <button type="button" className={styles.retry} disabled={historyPending} onClick={onLoadMore}>{historyPending ? (isId ? "Memuat…" : "Loading…") : (isId ? "Muat riwayat lainnya" : "Load more history")}</button>}
          </div>
        )}
      </div>
    </section>
  );
}


