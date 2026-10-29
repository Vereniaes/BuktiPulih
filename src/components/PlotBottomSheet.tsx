// Todo:
// -> Show the selected plot and link to its field notes.

// --- Plot details ---
import React from "react";
import { PlotFeature } from "@/types";
import { STATUS_DISPLAY, formatId, formatDateId } from "@/utils/plotDisplay";

interface PlotBottomSheetProps {
  plot: PlotFeature | null;
  onClose: () => void;
  onFilterTimelineByPlot: (plotCode: string) => void;
  actionLabel?: string;
}

export const PlotBottomSheet: React.FC<PlotBottomSheetProps> = ({
  plot,
  onClose,
  onFilterTimelineByPlot,
  actionLabel = "lihat catatan petak ini",
}) => {
  if (!plot) return null;

  const { properties } = plot;
  const deadCount = Math.max(0, properties.total_planted - properties.current_alive);
  const status = STATUS_DISPLAY[properties.latest_status];

  return (
    <div className="bottom-sheet-card" id="plot-detail-bottom-sheet">
      <div className="sheet-header">
        <div>
          <div className="sheet-tags">
            <span className="tag-code">
              {properties.plot_code} · {properties.ecosystem_type}
            </span>
            <span className="tag-status">
              <span className="status-dot" style={{ backgroundColor: status.color }} />
              {status.label}
            </span>
          </div>

          <h3 className="sheet-title">{properties.name}</h3>
          <p className="sheet-sub">
            {properties.region} · pengelola: <strong>{properties.community_name}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-sheet-close"
          aria-label="tutup rincian petak"
        >
          ✕
        </button>
      </div>

      <div className="sheet-progress-section">
        <div className="progress-labels">
          <span>kelangsungan hidup bibit</span>
          <span className="progress-percent">{formatId(properties.survival_rate, 2)}%</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, properties.survival_rate)}%` }}
          />
        </div>
      </div>

      <div className="sheet-metrics-grid">
        <div className="sheet-metric-item">
          <span className="metric-label">ditanam</span>
          <span className="metric-val">{formatId(properties.total_planted)} bibit</span>
        </div>
        <div className="sheet-metric-item">
          <span className="metric-label">hidup</span>
          <span className="metric-val text-green">{formatId(properties.current_alive)} pohon</span>
        </div>
        <div className="sheet-metric-item">
          <span className="metric-label">mati / layu</span>
          <span className="metric-val text-red">{formatId(deadCount)} bibit</span>
        </div>
      </div>

      <div className="sheet-footer">
        <span className="sheet-coordinator">
          koordinator: <strong>{properties.coordinator_name}</strong> · dicek{" "}
          {formatDateId(properties.last_monitored_at)}
        </span>
        <button
          type="button"
          onClick={() => onFilterTimelineByPlot(properties.plot_code)}
          className="btn-filter-timeline"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
// --- end of Plot details ---
