# Knowledge Item: Analisis & Rancang Bangun Peta Simulasi Karhutla & Asap (Gaya transit.oyenza.com)

Dokumen ini mendokumentasikan analisis arsitektur, pemilihan teknologi visualisasi grafis, serta rancang bangun modul simulasi titik api dan sebaran kabut asap interaktif pada portal BuktiPulih dengan inspirasi antarmuka dari [transit.oyenza.com](https://transit.oyenza.com/) (*Bus Jakarta Live*).

---

## 1. Analisis & Benchmarking Teknologi transit.oyenza.com (Bus Jakarta Live)

Berdasarkan inspeksi sistem dan arsitektur pengembangannya (karya Rasyidan Akbar F. / 0xrsydn):
* **Pondasi Peta**: Menggunakan **MapLibre GL JS** (bukan Three.js) dengan basemap vector *Carto Dark Matter / Positron* dan OpenStreetMap data.
* **Performa Kendaraan Real-Time**: Pergerakan armada bus dan kereta dirender langsung pada layer WebGL/Canvas vector map dengan interpolasi posisi halus (*dead reckoning / coordinate smoothing*).
* **Desain UI / UX Khas**:
  1. **Floating Split Sidebar / Sheet**: Panel kontrol samping mengambang di atas peta dengan sudut membulat (*radius-xl*), bayangan halus, dan tipografi modern yang bersih.
  2. **Segmented Pills Selector**: Tab navigasi berukuran padat (`Peta`, `Rute`, `Halte`).
  3. **Search & Status Badges**: Kolom pencarian cepat dengan kartu status armada yang menyala secara dinamis (*Live pill, CCTV, Anker*).

---

## 2. Analisis Kritis: Mengapa Three.js BUKAN Pilihan yang Tepat untuk Peta Ini?

Pengguna menanyakan: *"pake three js atau framework buat ginian gimana?"*

Berikut adalah analisis komparasi mendalam mengapa memaksakan Three.js untuk visualisasi peta ini merupakan jebakan *overcomplicated* yang merugikan:

| Kriteria Evaluasi | Three.js (3D WebGL Engine) | HTML5 Canvas Particle Flow (Leaflet / 2D) | MapLibre GL JS (Vector Map WebGL) |
| :--- | :--- | :--- | :--- |
| **Kesesuaian Ruang Koordinat** | **Buruk**: Three.js beroperasi pada ruang Kartesius 3D ($X, Y, Z$). Memetakan ke koordinat geografis Web Mercator (*lat/lng*) membutuhkan matriks transformasi kamera yang kompleks. | **Sangat Baik**: Menempel langsung pada koordinat geografis Leaflet (`map.latLngToContainerPoint`), otomatis sinkron saat geser (*pan*) dan perbesar (*zoom*). | **Sangat Baik**: Berbasis geospasial asli dengan WebGL shader untuk garis dan partikel. |
| **Ukuran Paket (Bundle Size)** | **Berat**: `three` menambah beban lebih dari **600 KB - 1 MB** ke dalam bundle aplikasi, memperlambat First Contentful Paint (FCP). | **Ringan / Zero-Cost**: **0 KB** dependensi baru (menggunakan Canvas API bawaan peramban). | **Sedang**: ~250 KB (memerlukan instalasi pustaka baru dan tile style server). |
| **Stabilitas & Latensi Ponsel** | **Rawan Lag / Panas**: Penggunaan 3D continuous rendering loop menguras baterai dan memicu *thermal throttling* pada ponsel relawan lapangan kelas *entry-level*. | **60 FPS Mulus**: Sangat hemat daya, hanya menggambar ulang partikel pada viewport aktif. | **60 FPS Mulus**: Akselerasi GPU perangkat keras. |
| **Resiko Koordinat Melayang (*Jitter*)** | **Tinggi**: Kamera 3D Three.js sering terlambat sepersekian milidetik dibanding pergeseran peta Leaflet, menyebabkan ikon "melayang" (*jittering*). | **Nol**: Partikel dan ikon terkunci presisi di atas petak lahan tanpa *drift*. | **Nol**: Terintegrasi pada siklus render peta. |

### Kesimpulan Rekomendasi Teknis:
**Gunakan HTML5 Canvas Smoke Particle Layer + SVG Animated Fire Ember di atas Leaflet (Opsi 1)** atau **Migrasi ke MapLibre GL (Opsi 2)**. Hindari Three.js murni karena tidak efisien dan tidak menyelesaikan masalah geospasial 2D.

---

## 3. Rancang Bangun Simulasi Titik Api & Sebaran Asap Karhutla

### A. Ikon Titik Api Membara (*Animated Burning Fire Pin*)
Visualisasi titik api tidak lagi sekadar lingkaran statis, melainkan:
1. **Inti Api Berdenyut (*Pulsating Flame Heart*)**: Ikon api SVG dinamis dengan animasi lidah api (*flicker animation*).
2. **Aura Radiasi Panas (*Heat Radiation Ring*)**: Gelombang panas melingkar yang mengembang bertahap keluar untuk menunjukkan suhu radiasi api (*Fire Radiative Power - FRP*).
3. **Percikan Bara Api (*Floating Embers*)**: Partikel bara kecil yang terbang naik dari titik pusat kebakaran.
4. **Pewarnaan Tingkat Bahaya**:
   * **Bahaya Ekstrem (Merah Api `#DC2626`)**: Kebakaran gambut aktif membara dalam, suhu > 500°C.
   * **Berasap Pekat (Oranye Bahaya `#EA580C` / `#F97316`)**: Pembakaran vegetasi permukaan tebal (*smoldering*).
   * **Waspada / Pendinginan (Kuning Amber `#D97706`)**: Titik panas yang mulai basah disiram regu darat Manggala Agni.

### B. Simulasi Dispersi Asap Mengalir (*Wind-Driven Smoke Dispersion Simulation*)
Simulasi kabut asap dimodelkan berbasis parameter lingkungan nyata:
1. **Arah & Kecepatan Angin (Wind Vector)**:
   * Mengambil arah mata angin (misal: Angin dari Tenggara $135^\circ$ berhembus ke Barat Laut $315^\circ$ dengan kecepatan 18 km/jam).
   * Partikel kabut asap tidak menetap dalam lingkaran simetris, melainkan melayang memanjang (*plume dispersion*) ke arah hembusan angin.
2. **Kepadatan Partikel Berbasis Bahaya (ISPU & PM2.5)**:
   * Jika titik api berstatus **Ekstrem**, emisi partikel kabut pekat (warna abu-oranye pekat, opasitas 0.65, radius sebaran hingga 45 km).
   * Jika titik api berstatus **Pendinginan**, partikel kabut tipis (abu-abu putih lembut, opasitas 0.25).
3. **Mesin Partikel Canvas 2D (Particle System)**:
   * Setiap partikel asap lahir di koordinat titik api $(x_0, y_0)$, bergerak perlahan searah vektor angin, membesar ukurannya (*expand*), memudar opasitasnya (*fade out*), lalu bereinkarnasi kembali di pusat api.

---

## 4. Rancang Bangun Antarmuka: Oyenza-Style Split Control Panel

Mengadaptasi tata letak `transit.oyenza.com`:

```
+---------------------------------------------------------------------------------------+
|  HEADER BUKTIPULIH (3 Tab: Pantau Karhutla | Bukti Pulih | Forum Pulih)               |
+---------------------------------------------------------------------------------------+
|  [ FLOATING CONTROL PANEL (KIRI) ]           |  [ PETA LEAFLET INTERAKTIF (KANAN) ]    |
|                                              |                                        |
|  * Judul: Pantau Karhutla & Simulasi         |  - Peta Leaflet tajam / Gelap          |
|  * Segmented Pills:                          |  - Ikon Api Membara Berdenyut (Flame)  |
|    [Peta Situasi] [Simulasi Asap] [Siaga]    |  - Aliran Partikel Asap Mengikuti Angin|
|                                              |  - Radius Bahaya PM2.5 Semi-Transparan |
|  * Input Pencarian Lokasi & Hotspot          |  - Popup interaktif petak restorasi    |
|                                              |                                        |
|  * Kartu Layanan Cepat (Mirip Kartu Oyen):   |                                        |
|    1. Kartu Titik Api Aktif (Live BNPB)      |                                        |
|    2. Kartu Simulasi Angin & Asap:           |                                        |
|       - Slider Kecepatan Angin (km/h)        |                                        |
|       - Kompas Arah Angin (Utara/Selatan...) |                                        |
|       - Tombol Putar/Jeda Simulasi           |                                        |
|    3. Kartu Kualitas Udara (Indeks ISPU)     |                                        |
|    4. Tombol Cepat Menuju Posko & Pemulihan  |                                        |
+---------------------------------------------------------------------------------------+
```

---

## 5. Dampak Terhadap Bagian Kode Lain & Mitigasi
1. **Kompatibilitas Komponen `FireHazeMap.tsx`**:
   * Modul ini memperluas fungsi `FireHazeMap.tsx` tanpa merusak tab lain (`RecoveryMap` dan `ForumFeed`).
   * Jika pengguna beralih tab, canvas particle animation otomatis dihentikan (`cancelAnimationFrame`) untuk mencegah kebocoran memori (*memory leak*).
2. **Dukungan Mode Gelap (Item-Ijo-Orange) & Terang (Ijo-Krem)**:
   * Seluruh panel samping dan partikel asap menyesuaikan variabel token CSS yang telah dibangun pada sesi sebelumnya.
3. **Respon Tampilan Ponsel**:
   * Di layar desktop ($\ge 1024\text{px}$), panel samping mengambang di sisi kiri.
   * Di layar ponsel ($< 768\text{px}$), panel bertransformasi menjadi *bottom sheet drawer* yang dapat digulir ke atas seperti aplikasi peta modern.
