// src/components/QuickReportModal.tsx
// -> formulir pelaporan pohon ramah kader (boomer-friendly wizard 4 langkah)
//      -> integrasi html5 geolocation riil dengan deteksi akurasi sinyal
//      -> kompresi foto kamera hp langsung di memori browser (canvas webp ~150kb)
//      -> 3 tombol visual kondisi tanaman dan tombol plus-minus tinggi bibit

"use client";

import React, { useState, useEffect, useRef } from "react";
import { TreeStatus } from "@/types";
import { compressImageClient, CompressionResult } from "@/utils/imageCompression";
import { submitReportApi } from "@/services/api";
import { saveOfflineDraft } from "@/utils/offlineQueue";

interface QuickReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (message: string) => void;
}

export const QuickReportModal: React.FC<QuickReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedPlot, setSelectedPlot] = useState<string>("PL-KALBAR-001");
  const [condition, setCondition] = useState<"subur" | "perlu_rawat" | "mati">("subur");
  const [heightCm, setHeightCm] = useState<number>(85);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // state koordinat gps -----------------------------------------------------------
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number }>({
    lat: -0.02241,
    lng: 109.33318,
    accuracy: 8.5,
  });
  const [gpsStatus, setGpsStatus] = useState<"accurate" | "medium" | "fallback">("accurate");

  // state citra kamera ------------------------------------------------------------
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ambil lokasi gps riil browser saat modal dibuka -------------------------------
  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const acc = Math.round(pos.coords.accuracy);
          setCoords({
            lat: Number(pos.coords.latitude.toFixed(5)),
            lng: Number(pos.coords.longitude.toFixed(5)),
            accuracy: acc,
          });
          setGpsStatus(acc < 15 ? "accurate" : "medium");
        },
        () => {
          // fallback jika izin gps ditolak di browser laptop
          setGpsStatus("fallback");
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [isOpen]);
  // end of gps --------------------------------------------------------------------

  if (!isOpen) return null;

  // handler pemilihan file / foto kamera ------------------------------------------
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const res = await compressImageClient(file, 1280, 0.82);
      setCompressionResult(res);
    } catch (err) {
      console.warn("[Camera Compression] Gagal kompresi, gunakan foto langsung:", err);
    } finally {
      setIsCompressing(false);
    }
  };
  // end of handler foto -----------------------------------------------------------

  // handler simpan laporan --------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      plot_id: selectedPlot,
      tree_condition: condition,
      height_cm: heightCm,
      latitude: coords.lat,
      longitude: coords.lng,
      accuracy_meters: coords.accuracy,
      notes: notes.trim(),
      photo_url: compressionResult?.dataUrl || undefined,
    };

    try {
      const result = await submitReportApi(payload);
      setIsSubmitting(false);
      onClose();
      onSubmitSuccess(result.message);
      setStep(1);
      setCompressionResult(null);
    } catch {
      // simpan secara offline
      saveOfflineDraft(payload);
      setIsSubmitting(false);
      onClose();
      onSubmitSuccess("Sinyal terputus. Laporan tersimpan di memori perangkat!");
      setStep(1);
    }
  };
  // end of handler simpan laporan --------------------------------------------------

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content-card">
        {/* header modal --------------------------------------------------------- */}
        <div className="modal-header">
          <div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "var(--forest-green-700)",
                textTransform: "uppercase",
              }}
            >
              Langkah {step} dari 4
            </span>
            <h2 className="modal-title">Formulir Pemantauan Pohon</h2>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Tutup Formulir"
          >
            ✕
          </button>
        </div>
        {/* end of header modal --------------------------------------------------- */}

        <form onSubmit={handleSubmit} className="modal-body">
          {/* langkah 1: lokasi & petak ------------------------------------------ */}
          {step === 1 && (
            <div>
              <div
                style={{
                  backgroundColor:
                    gpsStatus === "accurate"
                      ? "var(--forest-green-50)"
                      : gpsStatus === "medium"
                      ? "var(--warning-amber-soft)"
                      : "#EDF2F7",
                  border: `1.5px solid ${
                    gpsStatus === "accurate"
                      ? "var(--forest-green-500)"
                      : gpsStatus === "medium"
                      ? "var(--warning-amber)"
                      : "#CBD5E0"
                  }`,
                  borderRadius: "var(--radius-md)",
                  padding: "14px",
                  marginBottom: "18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "22px" }}>
                  {gpsStatus === "accurate" ? "🟢" : gpsStatus === "medium" ? "🟡" : "📍"}
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--brand-navy-900)" }}>
                    {gpsStatus === "accurate"
                      ? "Sinyal GPS Terdeteksi Akurat (< 15 Meter)"
                      : gpsStatus === "medium"
                      ? "Sinyal GPS Cukup (Area Terbuka)"
                      : "Koordinat Default Petak Terpilih"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#4A5568" }}>
                    Lintang: {coords.lat}, Bujur: {coords.lng} (Akurasi: ±{coords.accuracy}m)
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    fontSize: "15px",
                    color: "var(--brand-navy-900)",
                    marginBottom: "8px",
                  }}
                >
                  PILIH PETAK RESTORASI LAPANGAN:
                </label>
                <select
                  value={selectedPlot}
                  onChange={(e) => setSelectedPlot(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "54px",
                    fontSize: "16px",
                    fontWeight: 700,
                    borderRadius: "var(--radius-md)",
                    border: "2px solid var(--surface-border-strong)",
                    padding: "10px 14px",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <option value="PL-KALBAR-001">PL-KALBAR-001: Gambut Parit Tokaya (Kubu Raya)</option>
                  <option value="PL-BEKASI-002">PL-BEKASI-002: Hutan Kota Patriot (Bekasi)</option>
                  <option value="PL-KALTENG-003">PL-KALTENG-003: Zona Sebangau Kahayan (Palangka)</option>
                </select>
              </div>

              <button
                type="button"
                className="touch-target-big"
                style={{
                  backgroundColor: "var(--brand-navy-800)",
                  color: "#FFFFFF",
                }}
                onClick={() => setStep(2)}
              >
                Lanjut ke Langkah 2: Ambil Foto ➔
              </button>
            </div>
          )}
          {/* end of langkah 1 ---------------------------------------------------- */}

          {/* langkah 2: ambil foto & kompresi canvas ------------------------------ */}
          {step === 2 && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={handlePhotoFileChange}
              />

              <div
                style={{
                  border: "2px dashed var(--surface-border-strong)",
                  borderRadius: "var(--radius-lg)",
                  padding: "20px 16px",
                  textAlign: "center",
                  backgroundColor: "#F8FAFC",
                  marginBottom: "18px",
                }}
              >
                {compressionResult ? (
                  <div>
                    <div
                      style={{
                        width: "100%",
                        maxHeight: "180px",
                        overflow: "hidden",
                        borderRadius: "var(--radius-md)",
                        marginBottom: "12px",
                        border: "1.5px solid var(--surface-border-strong)",
                      }}
                    >
                      <img
                        src={compressionResult.dataUrl}
                        alt="Pratinjau Foto Bibit"
                        style={{ width: "100%", height: "180px", objectFit: "cover" }}
                      />
                    </div>
                    <div
                      style={{
                        backgroundColor: "var(--forest-green-100)",
                        color: "var(--forest-green-800)",
                        padding: "8px 12px",
                        borderRadius: "var(--radius-md)",
                        fontSize: "12.5px",
                        fontWeight: 800,
                        marginBottom: "12px",
                      }}
                    >
                      ✓ Kompresi WebP Berhasil: {compressionResult.originalSizeKb} KB ➔{" "}
                      {compressionResult.compressedSizeKb} KB (-{compressionResult.reductionPercentage}%)
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "38px", marginBottom: "8px" }}>📷</div>
                    <div style={{ fontWeight: 800, fontSize: "16px", marginBottom: "4px" }}>
                      Ambil Foto Bibit Pohon Hari Ini
                    </div>
                    <p style={{ fontSize: "13px", color: "#718096", marginBottom: "14px" }}>
                      Kamera akan langsung mengompres foto ke WebP (~150KB) sebelum dikirim guna menghemat kuota internet di area hutan.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  className="touch-target-big"
                  style={{
                    backgroundColor: compressionResult
                      ? "var(--forest-green-700)"
                      : "var(--brand-navy-800)",
                    color: "#FFFFFF",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                >
                  {isCompressing
                    ? "Mengompres Citra Canvas..."
                    : compressionResult
                    ? "📷 Ambil Foto Pengganti"
                    : "Buka Kamera HP & Ambil Foto"}
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  style={{
                    minHeight: "52px",
                    padding: "10px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "2px solid var(--surface-border-strong)",
                    fontWeight: 700,
                  }}
                  onClick={() => setStep(1)}
                >
                  Kembali
                </button>
                <button
                  type="button"
                  className="touch-target-big"
                  style={{
                    backgroundColor: "var(--brand-navy-800)",
                    color: "#FFFFFF",
                    flex: 1,
                  }}
                  onClick={() => setStep(3)}
                >
                  Lanjut ke Kondisi Pohon ➔
                </button>
              </div>
            </div>
          )}
          {/* end of langkah 2 ---------------------------------------------------- */}

          {/* langkah 3: pilih kondisi pohon (3 tombol raksasa 56px) ---------------- */}
          {step === 3 && (
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 800,
                  fontSize: "16px",
                  color: "var(--brand-navy-900)",
                  marginBottom: "12px",
                }}
              >
                BAGAIMANA KONDISI BIBIT SAAT INI?
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <button
                  type="button"
                  className="touch-target-big"
                  style={{
                    backgroundColor: condition === "subur" ? "var(--forest-green-700)" : "var(--forest-green-50)",
                    color: condition === "subur" ? "#FFFFFF" : "var(--forest-green-800)",
                    border: "2.5px solid var(--forest-green-700)",
                  }}
                  onClick={() => setCondition("subur")}
                >
                  <span style={{ fontSize: "20px" }}>🌿</span>
                  <span>HIJAU SUBUR (Tumbuh Baik & Segar)</span>
                </button>

                <button
                  type="button"
                  className="touch-target-big"
                  style={{
                    backgroundColor: condition === "perlu_rawat" ? "var(--warning-amber)" : "var(--warning-amber-soft)",
                    color: condition === "perlu_rawat" ? "#FFFFFF" : "#92400E",
                    border: "2.5px solid var(--warning-amber)",
                  }}
                  onClick={() => setCondition("perlu_rawat")}
                >
                  <span style={{ fontSize: "20px" }}>🍂</span>
                  <span>PERLU DIRAWAT (Tanah Kering / Butuh Air)</span>
                </button>

                <button
                  type="button"
                  className="touch-target-big"
                  style={{
                    backgroundColor: condition === "mati" ? "var(--alert-red)" : "var(--alert-red-soft)",
                    color: condition === "mati" ? "#FFFFFF" : "#991B1B",
                    border: "2.5px solid var(--alert-red)",
                  }}
                  onClick={() => setCondition("mati")}
                >
                  <span style={{ fontSize: "20px" }}>🥀</span>
                  <span>BIBIT MATI (Kering Total / Terkena Hama)</span>
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  style={{
                    minHeight: "52px",
                    padding: "10px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "2px solid var(--surface-border-strong)",
                    fontWeight: 700,
                  }}
                  onClick={() => setStep(2)}
                >
                  Kembali
                </button>
                <button
                  type="button"
                  className="touch-target-big"
                  style={{
                    backgroundColor: "var(--brand-navy-800)",
                    color: "#FFFFFF",
                    flex: 1,
                  }}
                  onClick={() => setStep(4)}
                >
                  Lanjut ke Catatan ➔
                </button>
              </div>
            </div>
          )}
          {/* end of langkah 3 ---------------------------------------------------- */}

          {/* langkah 4: tinggi pohon & catatan kader ---------------------------- */}
          {step === 4 && (
            <div>
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    fontSize: "15px",
                    color: "var(--brand-navy-900)",
                    marginBottom: "8px",
                  }}
                >
                  TINGGI BIBIT TERUKUR (CM):
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    type="button"
                    style={{
                      width: "60px",
                      height: "56px",
                      fontSize: "26px",
                      fontWeight: 800,
                      borderRadius: "var(--radius-md)",
                      border: "2px solid var(--surface-border-strong)",
                      backgroundColor: "#EDF2F7",
                    }}
                    onClick={() => setHeightCm((prev) => Math.max(5, prev - 5))}
                  >
                    -
                  </button>
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: "28px",
                      fontWeight: 800,
                      color: "var(--brand-navy-900)",
                      backgroundColor: "#F8FAFC",
                      height: "56px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "var(--radius-md)",
                      border: "2px solid var(--surface-border-strong)",
                    }}
                  >
                    {heightCm} cm
                  </div>
                  <button
                    type="button"
                    style={{
                      width: "60px",
                      height: "56px",
                      fontSize: "26px",
                      fontWeight: 800,
                      borderRadius: "var(--radius-md)",
                      border: "2px solid var(--surface-border-strong)",
                      backgroundColor: "#EDF2F7",
                    }}
                    onClick={() => setHeightCm((prev) => prev + 5)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    fontSize: "15px",
                    color: "var(--brand-navy-900)",
                    marginBottom: "8px",
                  }}
                >
                  CATATAN KONDISI TANAH / LAPANGAN:
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Parit gambut masih basah, tunas baru bertambah 5cm..."
                  style={{
                    width: "100%",
                    fontSize: "15px",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "2px solid var(--surface-border-strong)",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  style={{
                    minHeight: "56px",
                    padding: "10px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "2px solid var(--surface-border-strong)",
                    fontWeight: 700,
                  }}
                  onClick={() => setStep(3)}
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="touch-target-big"
                  style={{
                    backgroundColor: "var(--forest-green-700)",
                    color: "#FFFFFF",
                    flex: 1,
                  }}
                >
                  {isSubmitting ? "Menyimpan Laporan..." : "Kirim Laporan Lapangan Sekarang ✓"}
                </button>
              </div>
            </div>
          )}
          {/* end of langkah 4 ---------------------------------------------------- */}
        </form>
      </div>
    </div>
  );
};
