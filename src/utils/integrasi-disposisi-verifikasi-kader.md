# Integrasi Lembar Disposisi Posko Siaga BPBD & Log Verifikasi Kader Terkini

Dokumen ini mendokumentasikan pemutakhiran modul lembar disposisi resmi posko siaga karhutla agar terintegrasi dengan data sensor satelit nyata (NASA MODIS, NOAA VIIRS) dan rekam jejak audit verifikasi darat kader lapangan.

---

## 1. Landasan Operasional & Audit Resmi

Lembar disposisi posko siaga darurat adalah instrumen komando penanggulangan bencana karhutla bagi BPBD, BNPB, dan relawan gabungan.
Sebelumnya, disposisi menggunakan label simulasi generik (*Water Bombing*). Pada pemutakhiran ini:
1. **Penyelarasan Tindakan Satgas Berbasis Status Lapangan**:
   - Status `Kubah Gambut Kering` -> Tindakan: **Pembasahan Sekat Kanal & Penyekatan Bara**.
   - Status `Verifikasi Manggala Agni` -> Tindakan: **Patroli Darat Regu Manggala Agni**.
   - Status `Pemantauan Sensor Satelit` -> Tindakan: **Verifikasi Darat Overpass Satelit**.
2. **Integrasi Log Verifikasi Fisik Kader (*Field Audit Integration*)**:
   - Menampilkan catatan inspeksi terbaru dari kader bersertifikat (nama pemeriksa, instansi pembina, kedalaman muka air gambut, dan status vegetasi).
   - Memberikan legalitas dan transparansi ganda: data satelit pengorbit bumi dikonfirmasi oleh fakta mata air dan tanah di lapangan.

---

## 2. Struktur Data `DispatchExportParams` Mutakhir

```typescript
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
  estimatedAreaHa: number;
  hotspots: HotspotPoint[];
  verifications?: DispatchVerificationLog[];
}
```

---

## 3. Komposisi Kanvas 2D Ekspor Resolusi Tinggi (1200 x 1800 px)

1. Kop resmi Sekretariat Bersama Satgas Karhutla & BuktiPulih.
2. Baris 4 KPI Utama (Status Siaga, Titik Api Satelit, PM2.5, Vektor Angin/RH).
3. Bagan Sketsa Spasial Koordinat Hotspot & Radius Dispersi.
4. Tabel Rincian Kabupaten dengan Kolom Sensor (MODIS/VIIRS) & Status Lapangan.
5. **Log Verifikasi Darat Kader Lapangan Terkini**.
6. Instruksi Operasional Kedaruratan Satgas.
7. Kolom Pengesahan Tanda Tangan Komandan Operasi.
