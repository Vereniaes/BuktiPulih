# Dokumen Perencanaan & Spesifikasi Teknis: Simulasi Titik Api & Sebaran Asap Karhutla (Hasil REA transit-staging.oyenza.com/compare)

Dokumen ini menyusun perencanaan arsitektur, hasil *Reverse Engineering Architecture* (REA) terhadap `transit-staging.oyenza.com/compare`, serta opsi implementasi untuk modul simulasi geospasial pada portal BuktiPulih.

---

## 1. Temuan Krusial dari Reverse Engineering `transit-staging.oyenza.com/compare`

Berdasarkan pembongkaran kode sumber aset produksi (`compare-LYLYVKIH.js`, `compare-TM43V3N7.css`, dan pustaka peta `lib-LI4GC7QK.js`):

1. **Oyenza TIDAK Menggunakan Three.js**:
   * Peta di `transit.oyenza.com` dan `transit-staging.oyenza.com/compare` **100% menggunakan MapLibre GL JS** (peta vector 2D dengan akselerasi GPU WebGL), bukan Three.js.
   * Simulasi pergerakan armada dibuat menggunakan **model matematika extrapolasi koordinat** (`function Le(...)`) yang menginterpolasi posisi pada kurva koordinat berdasarkan stempel waktu nyata (*time offset*).
2. **Mengapa Three.js adalah Jebakan Overcomplicated**:
   * Three.js bekerja dalam ruang koordinat $X, Y, Z$ 3D. Menyelaraskannya dengan proyeksi Web Mercator peta 2D menyebabkan *jittering* (titik api melayang/terlambat bergeser saat peta digeser).
   * Three.js menambah ukuran *bundle* sebesar **600 KB - 1 MB**, membebani kuota dan memicu panas pada ponsel relawan di daerah kebakaran hutan.
3. **Desain Komparasi Oyenza yang Luar Biasa untuk Diadopsi**:
   * **Bilah Ringkasan 5 KPI (`.cv-kpis`)**: Menampilkan total hotspot, estimasi radius kabut asap, dan indeks bahaya.
   * **Segmented Pill Switches (`.seg`)**: Pengalihan mode layer instan (`Semua`, `Satelit BNPB`, `Model Simulasi`, `Side-by-Side`).
   * **Kontrol Jendela Waktu (`.cv-win`)**: Simulasi proyeksi `15 menit`, `1 jam`, `3 jam`, dan `24 jam` ke depan.
   * **Tabel Rincian Lokasi Rawan (`.cv-spots`)**: Daftar kabupaten/titik rawan dengan pencarian dan filter *Biggest gap / Most danger*.

---

## 2. Pemetaan Arsitektur untuk BuktiPulih (Karhutla & Restorasi)

```
[Komponen Oyenza Compare]               [Komponen BuktiPulih Karhutla]
-----------------------------------------------------------------------------------------
1. Header & Time Window Pills          -> Bilah Waktu Simulasi: [15 Menit] [1 Jam] [3 Jam] [24 Jam]
2. 5 KPI Summary Cards                 -> 5 Metrik Siaga:
                                          - Hotspot Aktif Terdeteksi (Satelit)
                                          - Estimasi Luas Asap (Hektar / Model)
                                          - Kualitas Udara (ISPU / PM2.5)
                                          - Kecepatan & Arah Angin (km/jam)
                                          - Status Siaga Provinsi (Darurat / Waspada)
3. Peta Interaktif & Seg Mode          -> Peta Karhutla dengan Segmented Toggle:
                                          [Semua (Both)] [Satelit BNPB] [Simulasi Asap] [Komparasi 6 Jam]
4. Visualisasi Api & Asap               -> - Ikon Api Membara Berdenyut (Flame Ember SVG)
                                          - Simulasi Partikel Asap Canvas Mengalir Searah Angin
5. Tabel Titik Pantau Kamera           -> Tabel Kabupaten / Petak Rawan Asap Terdekat
```

---

## 3. Tiga Pilihan Arsitektur Teknis untuk Keputusan Pengguna

Sesuai aturan kerja, kami menyajikan 3 opsi solusi arsitektur:

### Opsi 1 (Direkomendasikan): Leaflet HTML5 Canvas Particle Flow + Dashboard Compare Oyenza
* **Teknologi**: Tetap menggunakan Leaflet yang sudah terpasang stabil, diperkuat dengan layer partikel Canvas 2D untuk simulasi aliran kabut asap dan CSS flame SVG untuk ikon api membara.
* **Keuntungan**:
  * **0 KB dependensi baru**: Tanpa mengunduh pustaka besar.
  * **60 FPS mulus**: Sangat hemat daya pada ponsel relawan lapangan.
  * **Tampilan 100% identik dengan Oyenza Compare**: Layout split-view, segmented pills, KPI cards, dan kontrol simulasi angin.
* **Dampak**: Hanya memperbarui modul `FireHazeMap.tsx` dan `globals.css`. Tab lain (`RecoveryMap` dan `ForumFeed`) tetap aman 100%.

### Opsi 2: Migrasi ke MapLibre GL JS (Sama Persis dengan Stack Oyenza Asli)
* **Teknologi**: Mengganti Leaflet di Tab 1 dengan `maplibre-gl` dan memuat style vector tile Carto Dark/Positron.
* **Keuntungan**: Engine peta persis sama dengan Oyenza, dukungan vector tiles tajam.
* **Kelemahan**: Menambah dependensi `maplibre-gl` (~250 KB), memerlukan konfigurasi vector style server, dan ada sedikit perbedaan API dengan `RecoveryMap.tsx`.

### Opsi 3: Memaksakan Three.js WebGL Layer
* **Teknologi**: Menjalankan canvas Three.js di atas peta untuk merender partikel asap 3D volumetrik dan mesh api 3D.
* **Kelemahan Kritis**:
  * Menambah bundle > 600 KB.
  * Risiko koordinat melayang (*jitter*) saat pengguna memperbesar/menggeser peta.
  * Menguras baterai dan memicu *thermal throttling* pada ponsel pintar.

---

## 4. Rencana Tahapan Eksekusi (To-Do List)

1. [ ] **Tahap 1: Keselarasan & Konfirmasi (/grillme)**
   * Menjelaskan hasil REA kepada pengguna dan mengonfirmasi opsi arsitektur yang dipilih.
2. [ ] **Tahap 2: Pembuatan Ikon Api Membara Animasi (Flame Pin)**
   * Perancangan komponen DivIcon Leaflet dengan markup SVG api berkobar, lingkaran denyut radiasi termal, dan percikan bara.
3. [ ] **Tahap 3: Pembuatan Mesin Partikel Asap Canvas Mengalir (Smoke Particle Engine)**
   * Membangun engine partikel di mana kabut asap dipancarkan dari titik api, mengalir searah hembusan angin, dan warnanya berubah sesuai tingkat bahaya wilayah.
4. [ ] **Tahap 4: Rombak Tata Letak `FireHazeMap.tsx` dengan Pola Oyenza Compare**
   * Integrasi 5 KPI Summary Cards di atas peta.
   * Integrasi segmented pills mode (`Semua`, `Satelit BNPB`, `Simulasi Asap`, `Komparasi 6 Jam`).
   * Panel kendali simulasi angin (slider kecepatan 0-60 km/h, arah mata angin, tombol play/pause).
   * Tabel daftar kabupaten/petak rawan kabut asap.
5. [ ] **Tahap 5: Styling Sistem Desain Responsif & Tema Gelap/Terang**
   * Memastikan layout bekerja sempurna pada mode gelap (*Item-Ijo-Orange*) dan mode terang (*Ijo-Krem*).
   * Tampilan responsif: split grid di layar lebar, stacked cards di layar ponsel.
6. [ ] **Tahap 6: Pengujian Produksi & Verifikasi Visual**
   * Uji performa 60 FPS di peramban.
   * Verifikasi `npm run build` Next.js tanpa galat.
