# Rencana Arsitektur: BuktiPulih Portal Partisipatoris Warga (Tumblr-Style)

Berdasarkan arahan rekaman suara pengguna pada 14 Oktober 2026:
Aplikasi dirombak dari format dashboard statistik kaku menjadi **Platform Partisipatif Warga (Civic Journaling)** yang memadukan pemantauan darurat karhutla/asap BNPB dengan bukti pemulihan nyata yang diunggah oleh warga dan relawan di lapangan.

---

## 1. Tiga Menu Utama (Multi-Tab Portal)

### Tab 1: `pantau karhutla` (Situasi Darurat & Asap BNPB Hari Ini)
- **Tujuan**: Memberikan gambaran kondisi darurat kebakaran hutan terkini secara transparan langsung dari sumber resmi WebGIS BNPB.
- **Peta Karhutla & Asap (Leaflet.js)**:
  - **Titik Api (Hotspot)**: Ditandai lingkaran oranye-merah dengan efek denyut radiasi panas (*pulse heat aura*).
  - **Sebaran Kabut Asap (Smoke Haze)**: Poligon radius kabut asap semi-transparan bergradasi di provinsi terdampak (Kalbar, Kalteng, Riau, Sumsel, Jambi).
  - **Status Udara & Luas Terbakar**: Ringkasan indeks PM2.5, hotspot harian, dan luas kebakaran dari endpoint ArcGIS REST BNPB.
  - **Tautan Cepat**: Tombol menuju *Peta Pemulihan* untuk melihat titik yang sudah padam dan sedang direhabilitasi.

### Tab 2: `bukti pulih` (Peta Pemulihan Lahan Pasca-Padam)
- **Tujuan**: Menyajikan peta geospasial kawasan yang telah berhasil dipadamkan dan kini berada dalam fase pemulihan.
- **Peta Pemulihan (Leaflet.js)**:
  - Petak restorasi aktif dengan status vegetasi (hijau subur vs kuning perlu sulaman).
  - Penanda sekat kanal (*canal blocking*) pada lahan gambut untuk pencegahan kebakaran ulang.
  - **Bottom Sheet Detail**: Rincian luas hektare, kelompok tani pengelola, rasio bibit hidup, serta tautan menuju kiriman warga di petak terkait.

### Tab 3: `forum pulih` (Feed Partisipatif Warga Bergaya Tumblr)
- **Tujuan**: Wadah utama partisipasi publik di mana "bukti pulih" diunggah langsung oleh masyarakat lokal dan relawan, bukan klaim sepihak.
- **Struktur Kartu Tumblr (Masonry Grid)**:
  - Rasio aspek foto alami (*variable scale*: square, portrait, landscape bebas tanpa crop paksa).
  - Badge waktu, lokasi petak, dan identitas pengirim (Nama, Usia, Asal Kota).
  - Indikator status kondisi lahan/bibit.
  - Catatan lapangan autentik.
  - Bilah metrik: Jumlah Suka (*Likes*), Komentar, dan Tayangan (*Views*).
- **Filter Bar Komunitas**:
  - `[terbaru]` (urut tanggal terbaru).
  - `[paling disukai]` (urut like terbanyak).
  - `[paling banyak dibahas]` (urut komentar terbanyak).
  - `[paling banyak dilihat]` (urut views terbanyak).
- **Dialog Interaksi Komentar**:
  - Membaca utas komentar warga.
  - Autentikasi super ringan sebelum memberi komentar: Input **Username/Nama**, **Usia**, dan **Kota Domisili**. Sesi disimpan di `localStorage` tanpa hambatan OTP.
- **Modal Unggah Bukti (`+ posting bukti`)**:
  - Mengunggah foto/video lapangan (kompresi WebP client-side).
  - Input nama, usia, kota, lokasi petak, kondisi tanaman, dan cerita lapangan.

---

## 2. Rincian Modul & Komponen Terdampak

| Komponen | Peran Baru |
| :--- | :--- |
| `src/types/index.ts` | Penambahan tipe data `ForumPost`, `ForumComment`, `UserProfileLight`, dan `FireHotspotItem`. |
| `src/data/forumPostsData.ts` | Dataset awal postingan warga Tumblr-style lengkap dengan foto skala natural, metrik likes/views, dan komentar warga. |
| `src/components/FireHazeMap.tsx` | Komponen peta Leaflet untuk sebaran hotspot dan layer kabut asap (smoke haze) BNPB. |
| `src/components/RecoveryMap.tsx` | Komponen peta Leaflet untuk kawasan pasca-padam dan petak pemulihan gambut. |
| `src/components/ForumFeed.tsx` | Komponen feed masonry Tumblr, filter bar (terbaru, likes, komentar, views), dan kartu postingan responsif. |
| `src/components/PostDetailModal.tsx` | Modal pembaca postingan penuh dan utas komentar warga (dengan form login nama/usia/kota). |
| `src/components/CreatePostModal.tsx` | Modal pembuatan postingan warga baru (`+ posting bukti`) dengan unggah foto/video. |
| `src/components/HeaderNav.tsx` | Navigasi 3 tab: `pantau karhutla`, `bukti pulih`, `forum pulih`, serta tombol aksi `+ posting bukti`. |
| `src/app/page.tsx` | Integrasi switcher 3 tab dan state management global. |
| `src/app/globals.css` | Token efek kabut asap, grid masonry Tumblr, kartu postingan skala bebas, dan tata letak responsif mobile. |
