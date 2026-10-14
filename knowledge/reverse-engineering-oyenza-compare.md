# Reverse Engineering Architecture (REA): transit-staging.oyenza.com/compare

Dokumen ini merupakan hasil dekonstruksi mendalam (*reverse engineering*) terhadap arsitektur, tumpukan teknologi, manajemen data, dan sistem desain antarmuka dari **`https://transit-staging.oyenza.com/compare`** (*Cameras vs Model Comparison Dashboard*).

---

## 1. Temuan Utama Dekonstruksi Teknologi (Tech Stack REA)

Melalui pembongkaran berkas sumber (`compare-LYLYVKIH.js`, `compare-TM43V3N7.css`, `lib-PQIEZ5UY.js`, dan `lib-LI4GC7QK.js`):

| Komponen | Implementasi Asli Oyenza Compare | Temuan Kunci & Alasan Arsitektur |
| :--- | :--- | :--- |
| **Mesin Peta** | **MapLibre GL JS** (`Ie.maplibregl = M()`) | **TIDAK menggunakan Three.js**. Peta menggunakan WebGL 2D geospasial native (MapLibre GL) dengan vector tiles (`osm-bright` / `dark-matter`). |
| **Model Simulasi** | **Mathematical Extrapolation Model** (`function Le(s=Date.now(), m=null)`) | Simulasi dijalankan secara matematis di sisi klien: membaca jadwal (*timetable*), menginterpolasi koordinat lintasan kurva, lalu memproyeksikan posisi kendaraan berdasarkan kecepatan rata-rata. |
| **Sistem Desain UI** | **Vanilla CSS Modern + Segmented Pills** | Menggunakan CSS Variables `:root` bersih, tipografi sistem Apple/San Francisco (`SF Pro Text`), sudut membulat 16px (`radius-xl`), dan tombol segmented pill (`border-radius: 999px`). |
| **Rendering Partikel/Dot** | **Vector Map Circle Layers & DOM Markers** | Titik armada dan kamera dirender menggunakan lingkaran berskala warna kontras: biru kamera (`#2563EB`) vs oranye model (`#E8702A`). |

---

## 2. Bedah Struktur Antarmuka & UX Oyenza Compare

Halaman `compare` terbagi menjadi 5 hierarki modular:

1. **Header & Time Window Pills (`.cv-head`)**:
   * Judul besar + deskripsi perbandingan.
   * Kontrol jendela waktu (*time window*) berbentul pill terisolasi: `[15 min]`, `[1 hour]` *(aktif)*, `[3 hours]`, `[24 hours]`.
2. **KPIs Grid Summary (`.cv-kpis`)**:
   * 5 kartu metrik grid responsif (`repeat(5, minmax(0, 1fr))`):
     * Metrik 1: Total armada terkonfirmasi kamera vs model estimasi.
     * Metrik 2: Selisih margin (*model minus camera*).
     * Metrik 3: Persentase akurasi verifikasi kamera.
     * Metrik 4: Kecepatan laju rata-rata.
     * Metrik 5: Status kesehatan sensor pemantau.
3. **Peta Interaktif & Filter Mode (`.cv-grid > .cv-mapcard`)**:
   * Bilah kontrol peta (`.cv-maphead`):
     * Segment layer toggle: `[Both]` | `[Cameras]` | `[Model]` | `[Side by side]`
     * Kolom pencarian instan rute/spot: `input[type="search"].cv-input`
   * Komparasi Berdampingan (*Side by Side*):
     * Mendukung pembagian dua kanvas peta (`#map-a` dan `#map-b`) yang tersinkronisasi pergeserannya (*synchronized pan & zoom*).
   * Legenda mengambang (`.cv-legend`):
     * Titik biru kamera (data terkonfirmasi).
     * Titik oranye model (data estimasi simulasi).
4. **Tabel Analisis Rinci per Titik Pantau (`.cv-spots`)**:
   * Menampilkan daftar kamera/spot dengan pengurutan: *Biggest gap*, *Most buses*, *Lowest confirmed*, *Name*.
5. **Grafik Runtun Waktu (*Time Series Chart*)**:
   * Visualisasi tren pergerakan armada per 15 menit dengan rentang 3 jam s.d. 24 jam.

---

## 3. Adaptasi Konseptual untuk BuktiPulih (Karhutla & Asap)

Konsep **Kamera Nyata vs Model Estimasi** pada Oyenza sangat selaras jika diadaptasi ke dalam pemantauan kebakaran hutan dan pemulihan lahan:

```
[Oyenza Compare Model]                [BuktiPulih Karhutla Model]
Kamera Pengawas (Realita Terverifikasi)  --->  Satelit BNPB / BRIN (Hotspot Api Nyata)
Model Simulasi (Estimasi Jadwal)        --->  Model Dispersi Asap (Simulasi Fisika Angin & PM2.5)
Margin Deviasi (Selisih)                --->  Tingkat Bahaya Sebaran Asap ke Pemukiman
Side-by-Side View                       --->  Peta Kondisi Sekarang vs Prediksi 6 Jam ke Depan
```

### Visualisasi yang Dihasilkan:
1. **Ikon Titik Api Membara (*Animated Flame Pin*)**:
   * Menggantikan dot statis dengan ikon api SVG berdenyut (*flame flicker*) dan lingkaran radiasi panas berkobar (*thermal heat pulse*).
2. **Simulasi Partikel Asap Mengalir (*Wind Dispersion Particle Stream*)**:
   * Mengalir dari titik api mengikuti vektor arah dan kecepatan angin.
   * Kepekatan warna partikel disesuaikan dengan tingkat bahaya daerah:
     * *Merah Bara (`#DC2626`)*: Bahaya Ekstrem (Gambut terbakar dalam).
     * *Oranye Asap (`#F97316`)*: Berbahaya (ISPU > 200, asap pekat).
     * *Kuning Amber (`#D97706`)*: Waspada / Pendinginan.
3. **Floating Control Sheet & Mode Switcher**:
   * Segmented pill: `[Semua (Both)]` | `[Titik Api Satelit]` | `[Simulasi Sebaran Asap]` | `[Komparasi 6 Jam]`
   * Slider pengatur kecepatan angin dan pemilih arah mata angin.
