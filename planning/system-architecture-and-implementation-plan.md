# Dokumen Perencanaan Sistem BuktiPulih
**Platform Transparansi, Pemantauan Hasil Restorasi, dan Akuntabilitas Rehabilitasi Lingkungan Pasca-Karhutla Berbasis Web Partisipatif**

---

## 1. Ringkasan Eksekutif & Penyelarasan Kompetisi
- **Nama Produk:** BuktiPulih
- **Target Kompetisi:** UINIC 8.0 Web Development Competition 2026
- **Tema:** *Engineering Interconnected Web Solutions to Empower Digital Ecosystems*
- **Subtema:** Lingkungan & Keberlanjutan (SDGs 13: Climate Action & SDGs 15: Life on Land)
- **Fokus Utama Teknis:** *High Availability*, *Low-Bandwidth Optimization*, *Accessible Boomer-Friendly UI*, *Zero-Cost GCP Cloud Run Deployment*.

---

## 2. Analisis Pengguna & Rekayasa Antarmuka (UI/UX)

### A. Persona & Karakteristik Perangkat
| Segmentasi Pengguna | Karakteristik Perangkat & Jaringan | Kendala Utama | Solusi UX/UI BuktiPulih |
| :--- | :--- | :--- | :--- |
| **Pengguna Utama**<br>(Kader Lapangan, Kelompok Tani Hutan) | Android low-end (RAM 2–3GB), jaringan 3G/Edge tidak stabil di kawasan gambut/hutan. Usia 40–60 tahun (*boomer*). | Literasi digital terbatas, penglihatan menurun, baterai & kuota terbatas. | **Japanese Clean Functional UI**:<br>• Ukuran font besar (min 16px body, 18px label).<br>• Touch target lebar (min 48px).<br>• Tombol aksi dengan label teks eksplisit (hindari ikon tanpa teks).<br>• Kompresi foto otomatis di peramban sebelum diunggah (maks 200KB). |
| **Pengguna Sekunder**<br>(Donatur, Komunitas, Warga Perkotaan) | Smartphone modern, Laptop, jaringan 4G/Fiber. | Menginginkan transparansi cepat, bukti visual konkret (anti-*greenwashing*). | **Instagram Notes/Collage Timeline**:<br>• Kartu linimasa bergaya catatan polaroid/koleksi bukti fisik.<br>• Perbandingan foto bibit *Before-After* (Bulan ke-1 vs Bulan ke-6).<br>• Indikator *Survival Rate* real-time. |
| **Pengguna Tersier**<br>(Dinas Lingkungan Hidup, BRGM) | Desktop/Tablet browser. | Membutuhkan agregasi data spasial dan format ekspor audit. | **Dashboard Spasial Terpadu**:<br>• Filter zonasi restorasi (Kalimantan vs Hutan Kota Bekasi).<br>• Ekspor rekapitulasi data akuntabilitas bibit hidup vs mati. |

---

## 3. Arsitektur Teknis & Strategi Optimasi Beban Rendah

### A. Arsitektur Komputasi (Server-Side Rendering & Low-Render Client)
```
[ Browser Klien / HP Kentang ]
          │ (HTML Ringan + CSS Murni, JS Minimal)
          ▼
[ CDN / Cloudflare Caching (Edge) ]
          │
          ▼
[ Google Cloud Run (Next.js Server Container) ]
    ├─ React Server Components (RSC) -> 0kb JS Payload untuk konten statis
    ├─ Server Actions -> Validasi form & anti-tamper
    ├─ Next/Image Optimizer -> WebP/AVIF auto convert
          │
          ├─► [ MongoDB Atlas / Local Serverless ] (Data Dokumen: Plots, Logs, Users, Sync Cache)
          └─► [ Google Cloud Storage / R2 ] (Penyimpanan Foto Bukti Lapangan)
```

### B. Strategi Khusus untuk Jaringan Lambat & "HP Kentang":
1. **Client-Side Image Downscaling Sebelum Upload:**
   - Kamera HP menghasilkan foto 5–12MB. Skrip Canvas client-side mengecilkan resolusi ke 1280px dan mengompres ke format WebP (~150KB) sebelum proses POST dimulai. Menghindari kegagalan jaringan di pedalaman.
2. **Dashboard Peta Bertingkat (Tiered Map Rendering):**
   - *Mode Ringan (Default Mobile):* Menampilkan peta visual raster ringan / kartu agregasi per wilayah tanpa memuat pustaka WebGL yang memberatkan RAM.
   - *Mode Interaktif:* Leaflet.js / MapLibre dimuat secara *lazy-load* hanya saat pengguna menekan tombol "Buka Peta Interaktif".
3. **PWA & Offline Draft (Formulir Post Bencana):**
   - Kader dapat mengisi form dan mengambil foto meskipun sinyal hilang di tengah hutan. Data tersimpan di `IndexedDB` lokal dan otomatis terkirim saat mendapatkan sinyal.

---

## 4. Rincian Fitur Inti (Core Features)

### 1. Dashboard Peta Restorasi & Impact Ledger
- Visualisasi zona restorasi: Titik koordinat lahan pasca-karhutla (Kalimantan & Bekasi).
- Metrik Akuntabilitas:
  - Jumlah bibit ditanam vs bibit hidup (*Survival Rate %*).
  - Luas lahan terpulihkan (Hektare).
  - Tanggal verifikasi terakhir oleh tim pengawas.

### 2. Timeline Update Partisipasi Relawan (Instagram Notes Collage Style)
- Format kartu visual terstruktur:
  - Foto pohon terbaru berdampingan dengan foto awal tanam.
  - Tag identitas pohon (`#PK-KALBAR-082`).
  - Label kondisi tanaman: *Tumbuh Subur (Hijau)*, *Perlu Perawatan (Kuning)*, *Bibit Mati/Gagal (Merah)*.
  - Catatan fisik lapangan dari kader lokal (misal: *"Tinggi bibit bertambah 15cm, parit gambut mulai terairi"*).
  - Tanda tangan digital / geo-stamp koordinat terverifikasi.

### 3. Formulir Pelaporan Lapangan (Kader Friendly Form)
- Antarmuka langkah demi langkah (Step-by-Step Wizard):
  - **Langkah 1:** Pilih Zona atau Pindai Kode Pohon.
  - **Langkah 2:** Ambil Foto (langsung membuka kamera HP + geotagging otomatis).
  - **Langkah 3:** Pilih Status Kondisi (tombol besar bergambar: Baik / Kering / Hama).
  - **Langkah 4:** Masukkan tinggi tanaman (cm) & Catatan.
  - **Langkah 5:** Tombol Simpan Laporan.

---

## 5. Rencana Infrastruktur GCP (Fokus Skema Gratis / Free Tier)

| Layanan GCP | Fungsi di BuktiPulih | Konfigurasi Free-Tier / Hemat Biaya |
| :--- | :--- | :--- |
| **Google Cloud Run** | Menjalankan kontainer Next.js (SSR) | • 1 vCPU, 512MB RAM.<br>• Min Instances: `0` (tidak ada biaya saat idle).<br>• Max Instances: `2` (mencegah pembengkakan tagihan).<br>• Tier gratis mencakup 2 juta request/bulan & 360.000 GB-seconds. |
| **Artifact Registry** | Menyimpan Docker Image aplikasi | 0.5 GB gratis penyimpanan image. |
| **Cloud Storage (GCS)** | Penyimpanan foto bukti pohon | 5 GB Standard Storage gratis per bulan di region US/Tier gratis. |
| **Cloud Build** | CI/CD build kontainer otomatis | 120 build-minutes gratis per hari. |
| **Basis Data** | MongoDB NoSQL (Atlas M0 / Self-Hosted) | M0 Sandbox Free Tier (512MB storage, shared RAM, geospatial indexing `2dsphere` bawaan). |

---

## 6. Desain Visual: Japanese Functional Meets Instagram Notes

1. **Prinsip Estetika:**
   - **Tegas & Bersahabat (Japanese Public Utility Web):** Grid rapi, border halus `1px solid #E2E8F0`, warna latar belakang kertas terang (`#F8F9FA`), kontras teks tinggi (`#1A202C` di atas putih).
   - **Elemen Catatan Lapangan (Instagram Notes Collage):** Kartu pelaporan diberi aksen label stiker, metadata tanggal bergaya cap pos (`📅 12 Okt 2026 • Petak B`), dan badge status berwarna solid.
2. **Aksesibilitas Usia Lanjut (Boomer-Ready):**
   - Tidak ada gestur *swipe-only* yang tersembunyi.
   - Semua tombol navigasi memiliki ikon dan teks keterangan jelas.
   - Konfirmasi dialog ramah pengguna sebelum data terkirim.
