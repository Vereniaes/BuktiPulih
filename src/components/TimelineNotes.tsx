// Todo:
// -> Show plot notes and send timeline confirmations and comments.

// --- Timeline notes ---
"use client";

import React, { useState } from "react";
import { TimelineItem } from "@/types";
import { verifyTimelineApi, addCommentApi } from "@/services/api";
import { STATUS_DISPLAY, formatDateId, formatId } from "@/utils/plotDisplay";

const NOTES_SHOWN = 6;

interface TimelineNotesProps {
  items: TimelineItem[];
  selectedPlotFilter: string;
  onClearPlotFilter: () => void;
  onNewCommentAdded?: () => void;
}

export const TimelineNotes: React.FC<TimelineNotesProps> = ({
  items,
  selectedPlotFilter,
  onClearPlotFilter,
}) => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(items);

  const [activeCommentLogId, setActiveCommentLogId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [authorBadge, setAuthorBadge] = useState<"donatur" | "warga_lokal" | "pemerhati">("donatur");
  const [commentContent, setCommentContent] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);

  React.useEffect(() => {
    setTimelineItems(items);
  }, [items]);

  // Limit the unfiltered view to the newest notes.
  const sortedItems = [...timelineItems].sort((a, b) => b.monitoring_date.localeCompare(a.monitoring_date));
  const filteredItems =
    selectedPlotFilter === "all"
      ? sortedItems.slice(0, NOTES_SHOWN)
      : sortedItems.filter((item) => item.plot_code === selectedPlotFilter);

  const handleToggleVerify = async (id: string) => {
    const targetItem = timelineItems.find((i) => i.id === id);
    if (!targetItem) return;

    const currentlyVerified = !!targetItem.community_verifications.user_has_verified;

    setTimelineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            community_verifications: {
              ...item.community_verifications,
              confirmed_subur_count: currentlyVerified
                ? item.community_verifications.confirmed_subur_count - 1
                : item.community_verifications.confirmed_subur_count + 1,
              user_has_verified: !currentlyVerified,
            },
          };
        }
        return item;
      })
    );

    await verifyTimelineApi(id, currentlyVerified ? "dispute" : "subur");
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentLogId || !commentContent.trim()) return;

    setIsSendingComment(true);
    const success = await addCommentApi(
      activeCommentLogId,
      authorName.trim() || "Warga Peduli",
      commentContent.trim(),
      authorBadge
    );
    setIsSendingComment(false);

    if (success) {
      setTimelineItems((prev) =>
        prev.map((item) =>
          item.id === activeCommentLogId
            ? { ...item, comment_count: item.comment_count + 1 }
            : item
        )
      );
      setActiveCommentLogId(null);
      setCommentContent("");
    }
  };

  return (
    <section className="notes-section" aria-labelledby="notes-heading">
      <div className="section-head">
        <h2 id="notes-heading" className="section-title">catatan dari lapangan</h2>
        {selectedPlotFilter !== "all" && (
          <p className="section-filter">
            petak {selectedPlotFilter} ·{" "}
            <button type="button" className="text-link" onClick={onClearPlotFilter}>
              lihat semua
            </button>
          </p>
        )}
      </div>

      <div className="polaroid-grid">
        {filteredItems.map((item, idx) => {
          const status = STATUS_DISPLAY[item.tree_metrics.condition_status];
          const verified = !!item.community_verifications.user_has_verified;
          return (
            <article
              key={item.id}
              className="polaroid"
              style={{ "--tilt": `${idx % 2 === 0 ? -1 : 1.2}deg` } as React.CSSProperties}
            >
              <div className="polaroid-photo">
                <img
                  src={item.images.current_photo_url}
                  alt={`${item.plot_name}, ${item.images.current_label}`}
                  loading="lazy"
                />
                <figure className="polaroid-inset">
                  <img src={item.images.initial_photo_url} alt={`foto awal tanam, ${item.images.initial_label}`} loading="lazy" />
                  <figcaption>awal</figcaption>
                </figure>
              </div>

              <p className="polaroid-caption">
                <span className="status-dot" style={{ backgroundColor: status.color }} />
                {item.plot_name.toLowerCase()}, {formatDateId(item.monitoring_date)}
              </p>

              <p className="polaroid-note">&ldquo;{item.field_notes}&rdquo;</p>

              <p className="polaroid-meta">
                {item.reporter.full_name}
                {item.reporter.is_verified && " · kader terverifikasi"} · {item.tree_metrics.height_cm} cm ·{" "}
                {status.label} · perkiraan hidup {formatId(item.tree_metrics.estimated_survival_rate, 2)}%
              </p>

              <div className="polaroid-actions">
                <button
                  type="button"
                  className={`btn-verify-vote ${verified ? "active" : ""}`}
                  onClick={() => handleToggleVerify(item.id)}
                  aria-pressed={verified}
                >
                  {item.community_verifications.confirmed_subur_count} warga bilang subur
                  {verified && ", termasuk kamu"}
                </button>
                <button type="button" className="text-link" onClick={() => setActiveCommentLogId(item.id)}>
                  {item.comment_count} catatan warga · tulis
                </button>
              </div>
            </article>
          );
        })}

        {filteredItems.length === 0 && (
          <p className="journal-empty">belum ada catatan lapangan untuk petak ini.</p>
        )}
      </div>
      {activeCommentLogId && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content-card" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h3 className="modal-title">tulis catatan dukungan warga</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setActiveCommentLogId(null)}
                aria-label="tutup"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSendComment} className="modal-body">
              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: "14px",
                    marginBottom: "6px",
                  }}
                >
                  nama lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="contoh: Rina Wijaya"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  style={{
                    width: "100%",
                    height: "48px",
                    fontSize: "15px",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1.5px solid var(--surface-border-strong)",
                  }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: "14px",
                    marginBottom: "6px",
                  }}
                >
                  status relawan
                </label>
                <select
                  value={authorBadge}
                  onChange={(e) =>
                    setAuthorBadge(e.target.value as "donatur" | "warga_lokal" | "pemerhati")
                  }
                  style={{
                    width: "100%",
                    height: "48px",
                    fontSize: "15px",
                    fontWeight: 600,
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1.5px solid var(--surface-border-strong)",
                  }}
                >
                  <option value="donatur">donatur bibit pohon</option>
                  <option value="warga_lokal">warga sekitar lahan</option>
                  <option value="pemerhati">pemerhati lingkungan</option>
                </select>
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: "14px",
                    marginBottom: "6px",
                  }}
                >
                  catatan lapangan
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="tuliskan verifikasi kondisi tanaman atau catatan pohon..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: "15px",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1.5px solid var(--surface-border-strong)",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSendingComment}
                className="touch-target-big"
                style={{
                  backgroundColor: "var(--brand-navy-900)",
                  color: "#FFFFFF",
                }}
              >
                {isSendingComment ? "menyimpan catatan..." : "kirim catatan warga"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
// --- end of Timeline notes ---
