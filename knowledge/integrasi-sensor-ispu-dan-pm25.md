# Integrasi Sensor Live Kualitas Udara ISPU KLHK & PM2.5 (Open-Meteo / BMKG)

Dokumen ini memetakan integrasi pemantauan kualitas udara real-time berbasis Indeks Standar Pencemar Udara (ISPU) resmi Kementerian Lingkungan Hidup dan Kehutanan (Permen LHK No. 14 Tahun 2020) serta konsentrasi PM2.5 dari Open-Meteo Atmospheric / CAMS.

---

## 1. Landasan Regulasi & Formula Perhitungan ISPU

Berdasarkan **Permen LHK No. P.14/MENLHK/SETJEN/KUM.1/7/2020**, indeks kualitas udara dihitung melalui rumus interpolasi linier terhadap konsentrasi ambien partikulat debu halus $PM_{2.5}$:

$$I = \frac{I_a - I_b}{X_a - X_b} (X - X_b) + I_b$$

### Tabel Rentang Baku Mutu $PM_{2.5}$ & Skala ISPU:
| Rentang $PM_{2.5}$ ($\mu\text{g/m}^3$) | Rentang ISPU | Kategori Kualitas Udara | Kode Warna Standar | Implikasi Kesehatan & Saran Lapangan |
| :--- | :--- | :--- | :--- | :--- |
| **$0.0 - 15.5$** | **$0 - 50$** | **BAIK** | `#059669` (Hijau) | Kualitas udara sangat baik. Aman untuk beraktivitas luar ruangan. |
| **$15.6 - 55.4$** | **$51 - 100$** | **SEDANG** | `#0284C7` (Biru) | Kualitas udara dapat diterima. Kelompok sangat sensitif waspada. |
| **$55.5 - 150.4$** | **$101 - 200$** | **TIDAK SEHAT** | `#EAB308` (Kuning-Oranye) | Udara mulai merugikan kesehatan. Gunakan masker saat berada di luar. |
| **$150.5 - 250.4$** | **$201 - 300$** | **SANGAT TIDAK SEHAT** | `#DC2626` (Merah) | Risiko kesehatan meningkat bagi semua orang. Batasi aktivitas fisik luar. |
| **$> 250.4$** | **$> 300$** | **BERBAHAYA** | `#1E293B` (Hitam Pekat) | Tingkat darurat kesehatan. Evakuasi kelompok rentan, tutup ventilasi. |

---

## 2. Sumber Data & Endpoint API

Platform menggunakan endpoint **Open-Meteo Air Quality API** yang terintegrasi dengan model asimilasi data satelit atmosfer Copernicus Atmosphere Monitoring Service (CAMS) dan prakiraan aerosol global ECMWF:

- **Endpoint**: `https://air-quality-api.open-meteo.com/v1/air-quality`
- **Parameter Kueri**:
  - `latitude`: Koordinat garis lintang titik pantau
  - `longitude`: Koordinat garis bujur titik pantau
  - `current`: `pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,us_aqi`
- **Karakteristik**:
  - Zero-cost, tanpa memerlukan API Key berbayar.
  - Waktu generasi respon rata-rata $< 1\text{ ms}$.
  - Terkoneksi otomatis dengan koordinat geografis titik api yang dipilih di peta.

---

## 3. Komposisi Antarmuka & Ergonomi Posko Siaga

1. **Badge Sensor Header Posko Siaga**:
   - Menampilkan status live: `[● ISPU KLHK: 149 TIDAK SEHAT | PM2.5 101.7 µg/m³]`.
   - Warna lencana menyesuaikan 5 kategori resmi Permen LHK.
2. **Sinkronisasi Kartu KPI PM2.5**:
   - Kartu metrik ke-3 menampilkan nilai PM2.5 terukur riil beserta angka ISPU terhitung.
   - Menampilkan catatan rekomendasi kesehatan otomatis bagi petugas dan relawan di zona terdampak.
