// Todo:
// -> Group monthly plot notes and open the selected note below its row.

// --- Growth calendar ---
"use client";

import React, { useState } from "react";
import { PlotFeatureCollection, TimelineItem } from "@/types";
import { REGION_TABS, STATUS_DISPLAY, formatDateId, matchRegion } from "@/utils/plotDisplay";

const MONTHS_SHOWN = 6;

interface GrowthCalendarProps {
  plots: PlotFeatureCollection;
  items: TimelineItem[];
  selectedRegion: string;
  onSelectRegion: (key: string) => void;
}

function getPlotMonths(items: TimelineItem[], plotCode: string): TimelineItem[] {
  return items
    .filter((item) => item.plot_code === plotCode)
    .sort((a, b) => a.monitoring_date.localeCompare(b.monitoring_date))
    .slice(-MONTHS_SHOWN);
}

export const GrowthCalendar: React.FC<GrowthCalendarProps> = ({
  plots,
  items,
  selectedRegion,
  onSelectRegion,
}) => {
  const [openLogId, setOpenLogId] = useState<string | null>(null);

  const rows = plots.features
    .filter((plot) => matchRegion(plot.properties.region, selectedRegion))
    .map((plot) => ({ plot, months: getPlotMonths(items, plot.properties.plot_code) }));

  const openLog = items.find((item) => item.id === openLogId) ?? null;

  return (
    <section className="journal-section" aria-labelledby="journal-heading">
      <h2 id="journal-heading" className="visually-hidden">
        foto bibit per bulan
      </h2>

      <div className="folder-tabs" role="tablist" aria-label="pilih wilayah">
        {REGION_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`tab-region-${tab.key}`}
            aria-selected={selectedRegion === tab.key}
            className={`folder-tab ${selectedRegion === tab.key ? "active" : ""}`}
            onClick={() => {
              onSelectRegion(tab.key);
              setOpenLogId(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="journal-sheet">
        <p className="hand-note hand-note-mobile" aria-hidden="true">
          geser untuk bulan berikutnya &rarr;
        </p>

        {rows.map(({ plot, months }) => (
          <div key={plot.id} className="journal-row">
            <div className="journal-row-label">
              <span>{plot.properties.plot_code}</span>
            </div>

            {months.length === 0 ? (
              <div className="journal-pending-card">
                <span className="pending-badge">Petak Terdaftar</span>
                <span className="pending-text">
                  Tahap pembibitan & pembasahan gambut. Verifikasi fisik perdana oleh kader lapangan dijadwalkan pada siklus mendatang.
                </span>
              </div>
            ) : (
              <ol className="journal-cells">
                {months.map((log) => {
                  const status = STATUS_DISPLAY[log.tree_metrics.condition_status];
                  return (
                    <li key={log.id} className="journal-cell">
                      <button
                        type="button"
                        id={`journal-cell-${log.id}`}
                        className={`journal-cell-btn ${openLogId === log.id ? "open" : ""}`}
                        onClick={() => setOpenLogId(openLogId === log.id ? null : log.id)}
                        aria-expanded={openLogId === log.id}
                      >
                        <span className="journal-cell-head">
                          <span>{formatDateId(log.monitoring_date, true)}</span>
                          <span aria-hidden="true">+</span>
                        </span>
                        <img
                          src={log.images.current_photo_url}
                          alt={`${plot.properties.name}, ${formatDateId(log.monitoring_date)}, tinggi ${log.tree_metrics.height_cm} cm`}
                          loading="lazy"
                        />
                        <span className="journal-cell-foot">
                          <span className="status-dot" style={{ backgroundColor: status.color }} />
                          {log.tree_metrics.height_cm} cm
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}

            {openLog && openLog.plot_code === plot.properties.plot_code && (
              <div className="journal-detail">
                <p className="journal-detail-meta">
                  {formatDateId(openLog.monitoring_date)} · {openLog.reporter.full_name} ·{" "}
                  {STATUS_DISPLAY[openLog.tree_metrics.condition_status].label}
                </p>
                <p className="journal-detail-note">&ldquo;{openLog.field_notes}&rdquo;</p>
              </div>
            )}
          </div>
        ))}

        {rows.length === 0 && <p className="journal-empty">belum ada petak di wilayah ini.</p>}
      </div>
    </section>
  );
};
// --- end of Growth calendar ---
