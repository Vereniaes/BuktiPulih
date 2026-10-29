// Todo:
// -> Keep the older dispatch preview; the portal uses components/DispatchModal.tsx.

// --- Legacy dispatch dialog ---
"use client";

import React, { useRef, useState } from "react";
import { DispatchExportParams, renderDispatchSheetCanvas, downloadCanvasAsPng, getActionText } from "@/utils/dispatchExporter";

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: DispatchExportParams;
}

function getSafeFileName(docNumber: string): string {
  const sanitized = docNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${sanitized}.png`;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  params,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const printableAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleDownloadPng = () => {
    setIsExporting(true);
    try {
      const canvas = renderDispatchSheetCanvas(params);
      const filename = getSafeFileName(params.docNumber);
      downloadCanvasAsPng(canvas, filename);
    } catch (err) {
      console.error("Gagal mengekspor lembar disposisi:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Lembar Disposisi Siaga Karhutla">
      <div className="dispatch-modal-card">
        <div className="dispatch-modal-head">
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "var(--ink)" }}>
              Lembar Disposisi Situasi Posko Siaga Karhutla
            </h3>
            <p style={{ fontSize: "12px", color: "#64748B", margin: "2px 0 0" }}>
              Dokumen resmi status kedaruratan geospasial, arah angin, dan rincian titik api lahan gambut.
            </p>
          </div>
          <button
            type="button"
            className="btn-theme-toggle"
            onClick={onClose}
            style={{ padding: "6px 12px", fontSize: "13px" }}
            aria-label="Tutup modal"
          >
            ✕ Tutup
          </button>
        </div>

        <div ref={printableAreaRef} className="dispatch-sheet-document">
          <div className="dispatch-kop">
            <div className="dispatch-kop-title">
              KONSORSIUM RESTORASI BUKTIPULIH & SATGAS PENANGGULANGAN KARHUTLA
            </div>
            <div className="dispatch-kop-sub">
              POSKO DARURAT MONITORING GEOSPASIAL & SEBARAN KABUT ASAP LAHAN GAMBUT
            </div>
            <div className="dispatch-kop-sub" style={{ fontSize: "10.5px" }}>
              Sekretariat Bersama Pengendalian Karhutla & Restorasi Ekosistem Indonesia
            </div>
            <div className="dispatch-kop-divider"></div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#0E753B", margin: 0, letterSpacing: "0.5px" }}>
              LEMBAR DISPOSISI SITUASI LAPANGAN & SEBARAN ASAP
            </h2>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "8px", color: "#475569" }}>
              <span><b>Nomor:</b> {params.docNumber}</span>
              <span><b>Waktu Terbit:</b> {params.generatedAt}</span>
              <span><b>Status Siaga:</b> <b style={{ color: params.siagaStatus.includes("Terkendali") ? "#059669" : "#DC2626" }}>{params.siagaStatus.toUpperCase()}</b></span>
            </div>
          </div>

          <div className="dispatch-metrics-grid">
            <div className="dispatch-metric-item">
              <span className="dispatch-metric-lbl">Status Kawasan</span>
              <span className="dispatch-metric-val" style={{ color: params.siagaStatus.includes("Terkendali") ? "#059669" : "#DC2626" }}>
                {params.siagaStatus}
              </span>
              <span className="dispatch-metric-sub">BNPB WebGIS</span>
            </div>
            <div className="dispatch-metric-item">
              <span className="dispatch-metric-lbl">Titik Api Terdeteksi</span>
              <span className="dispatch-metric-val" style={{ color: "#DC2626" }}>
                {params.hotspots.length} Petak
              </span>
              <span className="dispatch-metric-sub">
                {params.hotspots.filter(s => s.status_kebakaran === "aktif membara").length} Membara Aktif
              </span>
            </div>
            <div className="dispatch-metric-item">
              <span className="dispatch-metric-lbl">Kualitas Udara Maks</span>
              <span className="dispatch-metric-val" style={{ color: params.maxPm25 > 100 ? "#DC2626" : "#059669" }}>
                {params.maxPm25} µg/m³
              </span>
              <span className="dispatch-metric-sub">Indeks Partikulat PM2.5</span>
            </div>
            <div className="dispatch-metric-item">
              <span className="dispatch-metric-lbl">Vektor Angin Permukaan</span>
              <span className="dispatch-metric-val" style={{ color: "#0284C7" }}>
                {params.windSpeedKmh} km/j
              </span>
              <span className="dispatch-metric-sub">
                {params.windDirectionText} • RH {params.relativeHumidity}%
              </span>
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, marginBottom: "6px", color: "#0F172A" }}>
              2. RINCIAN TITIK RAWAN, DETEKSI SENSOR & TINDAKAN SATGAS
            </div>
            <table className="dispatch-table">
              <thead>
                <tr>
                  <th style={{ width: "28px", textAlign: "center" }}>No</th>
                  <th>Kabupaten / Wilayah</th>
                  <th>Provinsi</th>
                  <th>Sensor Satelit</th>
                  <th>Status Lapangan</th>
                  <th style={{ textAlign: "center" }}>PM2.5</th>
                  <th>Tindakan Satgas</th>
                </tr>
              </thead>
              <tbody>
                {params.hotspots.slice(0, 8).map((spot, idx) => {
                  const isCooling = spot.status_kebakaran === "tahap pendinginan";
                  return (
                    <tr key={spot.id}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td style={{ fontWeight: 700 }}>{spot.kabupaten}</td>
                      <td>{spot.provinsi}</td>
                      <td>
                        <span style={{ fontSize: "10.5px", color: "#334155" }}>
                          {spot.satellite_sensor || "VIIRS SNPP"} ({spot.confidence_pct || 85}%)
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: isCooling ? "#059669" : "#DC2626" }}>
                          {spot.ground_status || spot.status_kebakaran}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{spot.pm25_index} µg</td>
                      <td style={{ fontWeight: 700, color: isCooling ? "#059669" : "#0284C7" }}>
                        {getActionText(spot)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, marginBottom: "6px", color: "#0F172A" }}>
              3. LOG VERIFIKASI DARAT & PEMANTAUAN KADER LAPANGAN (TERKINI)
            </div>
            <div className="dispatch-verif-box">
              {params.verifications && params.verifications.length > 0 ? (
                params.verifications.slice(0, 3).map((v, idx) => (
                  <div key={idx} className="dispatch-verif-entry">
                    <div className="dispatch-verif-head">
                      <span className="dispatch-verif-name">✓ {v.verifier_name}</span>
                      <span className="dispatch-verif-role">{v.role_label}</span>
                      <span className="dispatch-verif-status">{v.condition_status}</span>
                      <span className="dispatch-verif-date">{v.created_at}</span>
                    </div>
                    <div className="dispatch-verif-notes">"{v.notes}"</div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "11px", color: "#64748B", fontStyle: "italic", padding: "6px 0" }}>
                  Belum ada log verifikasi fisik darat baru dalam siklus siaga 24 jam ini.
                </div>
              )}
            </div>
          </div>

          <div className="dispatch-instructions-box">
            <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>
              INSTRUKSI OPERASIONAL KEDARURATAN (DISPOSISI SATGAS)
            </div>
            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "10.5px", color: "#334155", lineHeight: "1.5" }}>
              <li>Distribusikan masker standar N95 pada permukiman desa yang berada di jalur lintasan asap (downwind).</li>
              <li>Kerahkan regu darat Manggala Agni dan Relawan Desa untuk menjaga kelembapan kubah gambut di sekeliling area pendinginan.</li>
              <li>Perbarui data arah dan kecepatan angin dari stasiun BMKG/Open-Meteo secara berkala setiap 30 menit.</li>
              <li>Pastikan jalur logistik oksigen dan posko kesehatan desa siaga 24 jam pada wilayah dengan PM2.5 di atas 150 µg/m³.</li>
            </ul>
          </div>

          <div className="dispatch-sign-row">
            <div style={{ fontSize: "10px", color: "#64748B", maxWidth: "340px" }}>
              Dokumen ini diterbitkan secara otomatis oleh Sistem Pemantauan Karhutla BuktiPulih. Valid tanpa tanda tangan basah untuk keperluan koordinasi darurat lapangan.
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#0F172A" }}>Komandan Satgas Operasi Siaga,</div>
              <div style={{ height: "45px" }}></div>
              <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", textDecoration: "underline" }}>
                IR. H. MANGGALA WAHYUDI, M.SC
              </div>
              <div style={{ fontSize: "10px", color: "#64748B" }}>NIP. 19780415 200312 1 002</div>
            </div>
          </div>
        </div>

        <div className="dispatch-modal-actions">
          <button
            type="button"
            className="btn-theme-toggle"
            onClick={onClose}
            style={{ padding: "8px 16px" }}
          >
            Batal
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn-bombing"
              onClick={handleDownloadPng}
              disabled={isExporting}
              title="Unduh dokumen lengkap dalam bentuk gambar PNG resolusi tinggi"
            >
              <span>🖼️</span>
              <span>{isExporting ? "Membuat PNG..." : "Unduh Gambar PNG"}</span>
            </button>

            <button
              type="button"
              className="btn-tmc"
              onClick={handlePrintPdf}
              title="Cetak atau simpan sebagai dokumen PDF resmi format A4"
            >
              <span>📄</span>
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// --- end of Legacy dispatch dialog ---
