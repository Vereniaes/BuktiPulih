// src/utils/dispatchExporter.ts
// -> utilitas ekspor lembar disposisi posko siaga karhutla
//      -> komposisi lembar disposisi resmi kanvas 2d resolusi tinggi
//      -> integrasi data satelit nasa modis / noaa viirs & log verifikasi kader darat
//      -> ekspor berkas grafis png resolusi tinggi tanpa pustaka eksternal
//      -> format cetak dokumen resmi satgas bnpb / bpbd

import { HotspotPoint } from "@/types";

export interface DispatchVerificationLog {
  verifier_name: string;
  role_label: string;
  condition_status: string;
  notes: string;
  created_at: string;
}

export interface DispatchExportParams {
  docNumber: string;
  generatedAt: string;
  siagaStatus: string;
  windSpeedKmh: number;
  windDirectionText: string;
  relativeHumidity: number;
  maxPm25: number;
  ispuIndex?: number;
  ispuCategory?: string;
  estimatedAreaHa: number;
  hotspots: HotspotPoint[];
  verifications?: DispatchVerificationLog[];
}

// helper penentu tindakan satgas berbasis fakta lapangan
export function getActionText(spot: HotspotPoint): string {
  if (spot.status_kebakaran === "tahap pendinginan") return "Pemantauan Sekat";
  if (spot.ground_status === "Kubah Gambut Kering") return "Pembasahan Sekat";
  if (spot.ground_status === "Verifikasi Manggala Agni") return "Patroli Manggala Agni";
  return "Verifikasi Overpass";
}

// helper --------------------------------------------------------------------------
// function pembuat kanvas lembar disposisi 2d beresolusi tinggi (1200 x 1800 px)
export function renderDispatchSheetCanvas(params: DispatchExportParams): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1800;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal menginisialisasi 2D canvas");

  // latar belakang kertas dokumen resmi
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // bingkai batas terluar
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, 1140, 1740);

  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 36, 1128, 1728);

  // 1. KOP SURAT RESMI POSKO --------------------------------------------------------
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("KONSORSIUM RESTORASI BUKTIPULIH & SATGAS PENANGGULANGAN KARHUTLA", 600, 75);

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText("POSKO DARURAT MONITORING GEOSPASIAL & SEBARAN KABUT ASAP LAHAN GAMBUT", 600, 102);
  ctx.fillText("Sekretariat Bersama Pengendalian Karhutla & Restorasi Ekosistem Indonesia", 600, 122);

  // garis pemisah ganda
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(50, 140);
  ctx.lineTo(1150, 140);
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 145);
  ctx.lineTo(1150, 145);
  ctx.stroke();

  // 2. JUDUL LEMBAR DISPOSISI & METADATA -------------------------------------------
  ctx.fillStyle = "#0E753B";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("LEMBAR DISPOSISI SITUASI LAPANGAN & SEBARAN ASAP", 600, 185);

  ctx.textAlign = "left";
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(`Nomor Dokumen : ${params.docNumber}`, 60, 220);
  ctx.fillText(`Waktu Terbit  : ${params.generatedAt}`, 60, 240);

  ctx.textAlign = "right";
  ctx.fillText(`Klasifikasi   : OPERASIONAL SATGAS DARURAT`, 1140, 220);
  ctx.fillText(`Status Siaga  : ${params.siagaStatus.toUpperCase()}`, 1140, 240);

  // 3. KOTAK 4 KPI METRIK KUNCI ---------------------------------------------------
  const kpiBoxY = 265;
  const kpiBoxW = 260;
  const kpiBoxH = 85;

  const kpis = [
    { title: "STATUS SIAGA", val: params.siagaStatus, sub: "BNPB Karhutla WebGIS", color: params.siagaStatus.includes("Terkendali") ? "#059669" : "#DC2626" },
    { title: "TITIK API TERDETEKSI", val: `${params.hotspots.length} Petak`, sub: `${params.hotspots.filter(s => s.status_kebakaran === 'aktif membara').length} Membara Aktif`, color: "#DC2626" },
    { title: "KUALITAS UDARA & ISPU", val: `${params.maxPm25} µg/m³`, sub: params.ispuIndex ? `ISPU ${params.ispuIndex} (${params.ispuCategory})` : "Indeks PM2.5 Puncak", color: params.maxPm25 > 100 ? "#DC2626" : "#059669" },
    { title: "VEKTOR ANGIN & RH", val: `${params.windSpeedKmh} km/j`, sub: `${params.windDirectionText} • RH ${params.relativeHumidity}%`, color: "#0284C7" },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 60 + idx * (kpiBoxW + 13);
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(x, kpiBoxY, kpiBoxW, kpiBoxH);
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, kpiBoxY, kpiBoxW, kpiBoxH);

    ctx.textAlign = "left";
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 10.5px sans-serif";
    ctx.fillText(kpi.title, x + 12, kpiBoxY + 22);

    ctx.fillStyle = kpi.color;
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(kpi.val, x + 12, kpiBoxY + 50);

    ctx.fillStyle = "#64748B";
    ctx.font = "11px sans-serif";
    ctx.fillText(kpi.sub, x + 12, kpiBoxY + 70);
  });

  // 4. BAGAN SKETSA SPASIAL SEBARAN KABUT ASAP ------------------------------------
  const mapBoxY = 370;
  const mapBoxH = 270;
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("1. SKETSA VISUAL SEBARAN KABUT ASAP & DISPERSI VEKTOR ANGIN", 60, mapBoxY);

  // kontainer peta
  const mapCanvasY = mapBoxY + 12;
  ctx.fillStyle = "#0B111A";
  ctx.fillRect(60, mapCanvasY, 1080, mapBoxH);
  ctx.strokeStyle = "#334155";
  ctx.strokeRect(60, mapCanvasY, 1080, mapBoxH);

  // grid garis halus
  ctx.strokeStyle = "#1E293B";
  ctx.lineWidth = 1;
  for (let gx = 160; gx < 1140; gx += 100) {
    ctx.beginPath();
    ctx.moveTo(gx, mapCanvasY);
    ctx.lineTo(gx, mapCanvasY + mapBoxH);
    ctx.stroke();
  }
  for (let gy = mapCanvasY + 50; gy < mapCanvasY + mapBoxH; gy += 50) {
    ctx.beginPath();
    ctx.moveTo(60, gy);
    ctx.lineTo(1140, gy);
    ctx.stroke();
  }

  // gambar titik-titik koordinat api dan kerucut dispersi asap
  params.hotspots.forEach((spot) => {
    const px = 60 + ((spot.coordinates[1] - 98) / 22) * 1080;
    const py = mapCanvasY + ((3 - spot.coordinates[0]) / 8) * mapBoxH;

    const isCooling = spot.status_kebakaran === "tahap pendinginan";
    const smokeColor = isCooling ? "rgba(180, 215, 230, 0.25)" : "rgba(234, 88, 12, 0.35)";

    // kerucut asap
    ctx.fillStyle = smokeColor;
    ctx.beginPath();
    ctx.arc(px + 40, py - 10, spot.smoke_radius_km * 2.8, 0, Math.PI * 2);
    ctx.fill();

    // titik api
    ctx.fillStyle = isCooling ? "#059669" : "#DC2626";
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    // label nama kabupaten & sensor
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 11px sans-serif";
    const sensorLabel = spot.satellite_sensor?.includes("VIIRS") ? "VIIRS" : "MODIS";
    ctx.fillText(`${spot.kabupaten} [${sensorLabel}] (${spot.pm25_index} µg)`, px + 12, py + 4);
  });

  // legenda mini peta
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(75, mapCanvasY + mapBoxH - 45, 480, 32);
  ctx.fillStyle = "#DC2626";
  ctx.fillRect(88, mapCanvasY + mapBoxH - 32, 10, 10);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "11px sans-serif";
  ctx.fillText("Api Membara", 106, mapCanvasY + mapBoxH - 23);

  ctx.fillStyle = "#059669";
  ctx.fillRect(200, mapCanvasY + mapBoxH - 32, 10, 10);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("Tahap Pendinginan", 218, mapCanvasY + mapBoxH - 23);

  ctx.fillStyle = "#EA580C";
  ctx.fillRect(340, mapCanvasY + mapBoxH - 32, 10, 10);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("Radius Dispersi PM2.5", 358, mapCanvasY + mapBoxH - 23);

  // 5. TABEL RINCIAN KABUPATEN & STATUS SENSOR SATELIT ----------------------------
  const tableY = mapCanvasY + mapBoxH + 28;
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("2. RINCIAN TITIK RAWAN, DETEKSI SENSOR & TINDAKAN SATGAS", 60, tableY);

  const tHeaderY = tableY + 12;
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(60, tHeaderY, 1080, 30);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("NO", 75, tHeaderY + 20);
  ctx.fillText("KABUPATEN / WILAYAH", 110, tHeaderY + 20);
  ctx.fillText("PROVINSI", 300, tHeaderY + 20);
  ctx.fillText("SENSOR / KEPERCAYAAN", 480, tHeaderY + 20);
  ctx.fillText("STATUS LAPANGAN", 700, tHeaderY + 20);
  ctx.fillText("PM2.5", 880, tHeaderY + 20);
  ctx.fillText("TINDAKAN SATGAS", 970, tHeaderY + 20);

  let currentY = tHeaderY + 30;
  params.hotspots.slice(0, 7).forEach((spot, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
    ctx.fillRect(60, currentY, 1080, 26);
    ctx.strokeStyle = "#E2E8F0";
    ctx.strokeRect(60, currentY, 1080, 26);

    ctx.fillStyle = "#0F172A";
    ctx.font = "11px sans-serif";
    ctx.fillText(`${idx + 1}`, 75, currentY + 17);
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(spot.kabupaten, 110, currentY + 17);
    ctx.font = "11px sans-serif";
    ctx.fillText(spot.provinsi, 300, currentY + 17);

    // sensor & confidence
    ctx.fillText(`${spot.satellite_sensor || "VIIRS SNPP"} (${spot.confidence_pct || 85}%)`, 480, currentY + 17);

    // status lapangan
    const isCooling = spot.status_kebakaran === "tahap pendinginan";
    ctx.fillStyle = isCooling ? "#059669" : "#DC2626";
    ctx.font = "bold 10.5px sans-serif";
    ctx.fillText(spot.ground_status || spot.status_kebakaran, 700, currentY + 17);

    ctx.fillStyle = "#0F172A";
    ctx.font = "11px sans-serif";
    ctx.fillText(`${spot.pm25_index} µg`, 880, currentY + 17);

    // tindakan satgas
    ctx.fillStyle = isCooling ? "#059669" : "#0284C7";
    ctx.font = "bold 10.5px sans-serif";
    ctx.fillText(getActionText(spot), 970, currentY + 17);

    currentY += 26;
  });

  // 6. LOG VERIFIKASI DARAT KADER LAPANGAN TERKINI --------------------------------
  const verifY = currentY + 24;
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("3. LOG VERIFIKASI DARAT & PEMANTAUAN KADER LAPANGAN (TERKINI)", 60, verifY);

  const verifBoxY = verifY + 10;
  const verifBoxH = 110;
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(60, verifBoxY, 1080, verifBoxH);
  ctx.strokeStyle = "#0E753B";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(60, verifBoxY, 1080, verifBoxH);

  if (params.verifications && params.verifications.length > 0) {
    const vLogs = params.verifications.slice(0, 2);
    vLogs.forEach((v, vIdx) => {
      const vy = verifBoxY + 22 + vIdx * 48;
      ctx.fillStyle = "#0E753B";
      ctx.font = "bold 11.5px sans-serif";
      ctx.fillText(`✓ [${v.verifier_name} — ${v.role_label}]`, 75, vy);

      ctx.fillStyle = "#334155";
      ctx.font = "11px sans-serif";
      const snippet = v.notes.length > 110 ? v.notes.slice(0, 110) + "..." : v.notes;
      ctx.fillText(`"${snippet}"`, 75, vy + 18);
    });
  } else {
    ctx.fillStyle = "#475569";
    ctx.font = "italic 11.5px sans-serif";
    ctx.fillText("Belum ada log verifikasi darat tambahan hari ini. Menunggu laporan relawan regu patroli.", 75, verifBoxY + 30);
  }

  // 7. INSTRUKSI & DISPOSISI OPERASIONAL SATGAS ------------------------------------
  const notesY = verifBoxY + verifBoxH + 24;
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("4. INSTRUKSI OPERASIONAL KEDARURATAN (DISPOSISI SATGAS)", 60, notesY);

  const notesBoxY = notesY + 10;
  const notesBoxH = 105;
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(60, notesBoxY, 1080, notesBoxH);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.strokeRect(60, notesBoxY, 1080, notesBoxH);

  ctx.fillStyle = "#334155";
  ctx.font = "11.5px sans-serif";
  const instructions = [
    "A. Kerahkan regu Manggala Agni dan Relawan Desa untuk membasahi sekat kanal gambut di sekeliling area pendinginan.",
    "B. Prioritaskan pembagian masker N95 & evakuasi kelompok rentan pada permukiman desa di jalur lintasan asap (downwind).",
    "C. Pantau perubahan arah dan kecepatan angin dari stasiun Open-Meteo / BMKG secara kontinu (setiap 30 menit).",
    "D. Koordinasikan posko kesehatan desa siaga 24 jam dengan tabung oksigen pada zona PM2.5 di atas 150 µg/m³.",
  ];
  instructions.forEach((ins, i) => {
    ctx.fillText(ins, 75, notesBoxY + 24 + i * 21);
  });

  // 8. LEMBAR TANDA TANGAN & PENGESAHAN KEPALA SATGAS -----------------------------
  const signY = notesBoxY + notesBoxH + 30;
  ctx.textAlign = "left";
  ctx.fillStyle = "#475569";
  ctx.font = "11px sans-serif";
  ctx.fillText("Dokumen ini dihasilkan secara otomatis oleh Subsistem Pemantauan Karhutla BuktiPulih.", 60, signY + 30);
  ctx.fillText("Data tersinkronisasi dengan WebGIS BNPB ArcGIS & sensor satelit termal NASA MODIS / NOAA VIIRS.", 60, signY + 48);

  ctx.textAlign = "center";
  ctx.fillStyle = "#0F172A";
  ctx.font = "12px sans-serif";
  ctx.fillText("Posko Induk Pengendalian Karhutla,", 950, signY + 16);
  ctx.fillText("Komandan Satgas Operasi Siaga Darurat", 950, signY + 34);

  ctx.font = "bold 12.5px sans-serif";
  ctx.fillText("( IR. H. MANGGALA WAHYUDI, M.SC )", 950, signY + 105);
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#64748B";
  ctx.fillText("NIP. 19780415 200312 1 002", 950, signY + 122);

  return canvas;
}

// function pengunduh berkas canvas ke format file png
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename = "lembar-disposisi-karhutla.png"): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
// end of helper ------------------------------------------------------------------
