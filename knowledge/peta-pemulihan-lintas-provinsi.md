# Arsitektur & Spesifikasi Filter Geospasial Lintas Provinsi Tab 2 (Peta Bukti Pulih)

Dokumen ini menetapkan spesifikasi teknis dan desain sistem untuk integrasi filter geospasial lintas provinsi pada Tab 2 (*Bukti Pulih*), yang selaras dengan data karhutla WebGIS BNPB ArcGIS (`mv_prov_karhutla_2026`).

---

## 1. Latar Belakang & Masalah (Problem Statement)

Pada implementasi awal, Tab 2 hanya mendukung 3 tombol filter hardcoded (*Kubu Raya Kalbar, Hutan Kota Bekasi, Sebangau Kalteng*).
Akibatnya:
1. Terjadi diskoneksi data antara Tab 1 (*Pantau Karhutla*) yang memantau 6 provinsi prioritas darurat karhutla (Kalteng, Kalbar, Kalsel, Sumsel, Riau, Jambi) dengan Tab 2 yang hanya menampilkan 3 petak.
2. Saat relawan atau masyarakat ingin melihat efektivitas sekat kanal dan pemulihan vegetasi di provinsi rawan seperti Riau (Pelalawan), Sumsel (OKI), atau Kalsel, data spasial belum terpetakan.
3. Alur transisi dari Tab 1 ("Buka Peta Bukti Pulih →") belum membawa konteks provinsi yang sedang diperiksa.

---

## 2. Taksonomi Wilayah & Koordinat Restorasi Gambut Nyata

Merujuk pada wilayah kerja restorasi Badan Restorasi Gambut dan Mangrove (BRGM) serta satgas karhutla daerah:

| Kunci Wilayah (`RegionKey`) | Provinsi | Kabupaten / Ekosistem | Koordinat Sentral `[lat, lng]` | Spesies Dominan & Infrastruktur |
| :--- | :--- | :--- | :--- | :--- |
| `all` | Semua Wilayah | Seluruh Petak Indonesia | `[-1.5, 112.0]` (Zoom 5) | Agregasi Nasional |
| `kalteng` | Kalimantan Tengah | Sebangau & Pulang Pisau (Gambut) | `[-2.40, 114.05]` (Zoom 9) | *Shorea balangeran*, Sekat Kanal Komposit |
| `kalbar` | Kalimantan Barat | Kubu Raya & Ketapang (Gambut) | `[-0.85, 109.85]` (Zoom 9) | Jelutung Rawa, Ramin, Tabat Barito |
| `riau` | Riau | Pelalawan & Siak (Gambut) | `[0.28, 102.15]` (Zoom 9) | *Dyera polyphylla*, Sekat Kanal Papan |
| `sumsel` | Sumatera Selatan | Ogan Komering Ilir (Gambut) | `[-3.35, 104.92]` (Zoom 9) | Gelam (*Melaleuca*), Meranti Rawa |
| `kalsel` | Kalimantan Selatan | Banjarbaru & Candi Laras (Gambut) | `[-3.45, 114.83]` (Zoom 9) | Pulai Rawa, Saluran Air Sekat Gambut |
| `jambi` | Jambi | Muaro Jambi & Bram Itam (Gambut) | `[-1.58, 103.75]` (Zoom 9) | Pinang Rawa, Jelutung Rawa |
| `bekasi` | Jawa Barat | Hutan Kota Patriot (Mineral/Kota) | `[-6.23, 106.99]` (Zoom 11) | Trembesi, Mahoni, Sengon |

---

## 3. Desain Komponen & Alur Pengguna (User Journey)

1. **Bilah Filter Multi-Provinsi Horizontal Scrollable**:
   - Menampilkan pil interaktif untuk setiap provinsi beserta jumlah petak aktif di dalamnya: `Semua (9)`, `Kalteng (2)`, `Kalbar (2)`, `Riau (1)`, `Sumsel (1)`, `Kalsel (1)`, `Jambi (1)`, `Bekasi (1)`.
   - Ergonomis di perangkat bergerak (*mobile thumb-friendly*) dengan sentuhan horizontal scroll tanpa memecah tata letak.

2. **Banner Ringkasan Situasi Restorasi Provinsi Terpilih**:
   - Total Petak Terpantau di Provinsi Ini.
   - Total Pohon Hidup Terverifikasi.
   - Rerata Angka Harapan Hidup (*Survival Rate %*).
   - Status Infrastruktur Pembasahan Gambut (*Sekat Kanal Terairi Aktif / Siaga Kering*).

3. **Transisi Peta Halus (`map.flyTo`)**:
   - Saat provinsi dipilih, peta Leaflet secara otomatis melakukan animasi *pan & zoom* ke klaster petak di provinsi tersebut.
   - Marker petak terpilih langsung aktif dan memunculkan `PlotBottomSheet` dengan foto aktual, nama koordinator kelompok tani, dan tautan ke forum partisipasi warga.

4. **Bridging Terpadu dari Tab 1 ke Tab 2**:
   - Di Tab 1, tombol "Buka Peta Bukti Pulih →" pada kartu peringkat provinsi mengirim parameter `provinsiKey` sehingga Tab 2 langsung terbuka dalam posisi terfilter provinsi tersebut.
