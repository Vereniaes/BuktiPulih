# Audit UI/UX BuktiPulih - 17 Oktober 2026

Dokumen ini menyimpan temuan tampilan, alur, kode terkait, dan sumber riset untuk BRD ringkasan wilayah.

## 1. Keputusan dan metode

Keputusan pengguna melalui `/grillme`: informasi utama harus cepat ditemukan; halaman utama mengutamakan ringkasan per wilayah berisi karhutla, pemulihan, dan bukti terbaru. Dokumen rancangan: [BRD ringkasan wilayah](../planning/brd-ringkasan-wilayah.md).

Situs yang diperiksa: `http://localhost:3001`, proses aktif dari direktori BuktiPulih. Pemeriksaan menggunakan Chromium headless dengan konteks terpisah. Tidak ada kiriman, komentar, atau unggahan yang dikirim selama audit.

- Pemeriksaan awal: tab `fire`, `recovery`, dan `forum` pada viewport desktop 1440 × 1000 dan viewport sempit 390 × 844, tema terang.
- Pengujian ulang: emulasi ponsel 390 dan 360 px, tiga tab; ukuran layout dapat melebar akibat overflow.
- Pemeriksaan tambahan: alur Riau dari petak menuju forum lalu refresh, detail `/forum/post-kb-011` pada desktop dan 390 px, serta forum mode gelap.
- Semua tangkapan layar dibuka untuk diperiksa. Tidak ditemukan exception JavaScript pada enam pemuatan awal; hal itu tidak membuktikan alur atau aksesibilitas bebas masalah.
- API lokal `localhost:5000` menolak koneksi pada pengujian jaringan tambahan. Tampilan menggunakan fallback. Ini adalah kondisi sesi lokal, bukan kesimpulan tentang deployment produksi.

## 2. Panduan dan catatan proyek

Inventaris mencakup `AGENTS.md`, `TODO.md`, `.agents/skills`, `planning`, `knowledge`, dan catatan `.md` di `src/utils`. Dokumen alur utama, keputusan desain, audit sebelumnya, kontrak data, filter wilayah, dan sumber atmosfer dibaca sesuai keterkaitannya.

| Skill | Penggunaan |
|---|---|
| `engineering:documentation` | Struktur BRD, batas lingkup, dan kriteria penerimaan |
| Lokal `anti-slop-ui-roaster` | Hirarki informasi, kepadatan kontrol, tampilan ponsel, dan konteks data |
| Lokal `modern-web-seo` | Ditinjau untuk URL detail dan berbagi; tidak ada perubahan SEO pada sesi ini |
| `plugin-management` | Panduan diperiksa ketika mencari sarana inspeksi; Chromium dan Playwright lokal tersedia, tidak perlu koneksi baru |
| Skill pembuatan situs, gambar, dan dokumen Word | Tidak diperlukan untuk audit situs yang sudah berjalan dan BRD Markdown |

Skill bernama `grillme` tidak tersedia pada katalog maupun inventaris lokal yang ditinjau. Klarifikasi dilakukan langsung dengan format `/grillme`. `frontend-req` dan gambar mockup desain tidak ditemukan dalam direktori proyek. Catatan `ui-direction-jurnal-petak.md` menyebut mockup lama, tetapi bukan pengganti pemeriksaan gambar aslinya.

Catatan lama menyatakan beberapa masalah telah selesai. Kode dan hasil browser saat ini menjadi dasar audit ini. Contoh perbedaan: catatan lama menyebut filter kondisi forum, tetapi `ForumFeed.tsx` saat ini hanya menyediakan wilayah dan urutan. Tidak ada penghapusan atau pengembalian fitur pada sesi ini.

## 3. Bagian yang layak dipertahankan

- Palet krem dan hijau membedakan situs tanpa memerlukan banyak dekorasi.
- Foto perkembangan dan hubungan dengan lokasi merupakan materi terkuat untuk menjelaskan pemulihan. Keaslian atau asal foto belum divalidasi.
- Pilihan wilayah sudah tersedia dan dapat dipakai lintasbagian.
- Detail forum memiliki URL sendiri. Pada contoh yang diperiksa, detail tetap selebar 390 px di viewport 390 px.
- Ringkasan angka berbentuk strip dan filter forum berbentuk dropdown sudah lebih hemat ruang daripada banyak kartu atau tombol terpisah.

Masalah utama berada pada prioritas informasi, alur, dan kondisi data. Mengganti font atau menambah gaya visual baru belum memiliki dasar kebutuhan.

## 4. Temuan dan tindakan

| ID | Prioritas | Bukti | Dampak | Tindakan yang diusulkan |
|---|---|---|---|---|
| UX-01 | P1 | Menu ponsel terukur 0 × 0 px pada emulasi 390 dan 360 px; navigasi desktop disembunyikan | Pengunjung tidak memiliki menu atas yang dapat disentuh untuk berpindah tab | Beri kontrol navigasi area dan bentuk yang terlihat; periksa ulang seluruh lebar ponsel |
| UX-02 | P1 | Viewport sempit 390 px menghasilkan documentWidth fire 481, recovery 1200, forum 408 px | Isi terpotong atau halaman bergeser horizontal | Perbaiki batas lebar kontainer dan perilaku isi fleksibel; bukan menutup masalah dengan overflow tersembunyi pada seluruh halaman |
| UX-03 | P1 | Banner menyatakan tersinkronisasi saat API lokal gagal; hotspot dari array lokal; judul menyebut sensor langsung | Status data contoh/tersimpan/estimasi sulit dibedakan dari observasi mutakhir | Tampilkan status per sumber, tanggal observasi, serta kondisi gagal; koreksi klaim sensor |
| UX-04 | P1 | Di Riau, `lihat catatan petak ini` membuka forum tetapi URL tetap `?tab=recovery&region=riau`; refresh kembali ke peta | Tautan dan tampilan tidak sesuai; perjalanan membaca terputus | Simpan tab, wilayah, dan petak dalam navigasi yang dapat dibagikan |
| UX-05 | P1 | Callback halaman membuang kode petak; `selectedPlotFilter` dideklarasikan tetapi tidak dipakai oleh feed | Tombol bukti petak dapat menampilkan bukti wilayah yang lebih luas | Hubungkan bukti dengan petak; uji wilayah dengan sedikitnya dua petak |
| UX-06 | P1 | `time_ago` ditulis tetap dalam dataset; label `Kader Terverifikasi` dirender tanpa syarat pada detail | Umur bukti dan kepastian pemeriksaan dapat terbaca keliru | Hitung usia dari tanggal; tampilkan status berdasarkan bukti pemeriksaan yang tersedia |
| UX-07 | P2 | Banner sumber global, judul panjang, paragraf teknis, dan kontrol mendahului isi; foto kalender pertama sekitar y=1981 pada pengujian ulang mobile | Membutuhkan banyak gulir untuk menemukan bukti | Wilayah dan ringkasan di atas; peta serta riwayat lengkap dibuka dari konteks terkait |
| UX-08 | P2 | Forum menampilkan avatar, usia, suka, komentar, dan tayangan sebelum penilaian bukti | Popularitas dan profil bersaing dengan kondisi lokasi | Dahulukan lokasi, foto, tanggal, dan status pemeriksaan; interaksi sosial di rincian |
| UX-09 | P2 | Mode gelap: judul banner `rgb(241,245,249)` di atas `rgb(255,255,255)` | Judul sumber hampir tidak terbaca | Gunakan pasangan token teks dan permukaan yang sesuai; uji kontras |
| UX-10 | P2 | Ringkasan pemulihan menampilkan 9 petak dan 12.080 pohon; ledger di bawah menyebut 18 petak dan 13.180 pohon | Hubungan cakupan antarangka tidak jelas | Sebut cakupan, periode, dan sumber; jangan menyamakan himpunan data yang berbeda |
| UX-11 | P2 | Screenshot peta memperlihatkan area abu-abu; sebagian tile belum selesai pada pengujian tambahan | Membaca lokasi bergantung pada sumber tile dan jaringan | Sediakan daftar wilayah serta keadaan peta sedang dimuat/gagal |

P1 berarti perlu diselesaikan sebelum mengandalkan alur utama; P2 berarti menghambat kejelasan atau kenyamanan. Ini prioritas produk, bukan audit keamanan atau penetapan keparahan insiden.

UX-11 belum memiliki diagnosis akar masalah: jaringan, penyedia tile, atau ukuran peta masih perlu dibedakan. Bukti cukup untuk kebutuhan alternatif daftar, tidak cukup untuk menyatakan penyedia peta bermasalah.

## 5. Jejak kode dan batas perubahan

| Bagian | Bukti kode | Implikasi implementasi |
|---|---|---|
| Navigasi | `src/components/HeaderNav.tsx:136`; `src/app/globals.css:1180` | Markup menu ada. Pencarian CSS hanya menemukan warna garis pada tema gelap, tanpa ukuran dasar hamburger |
| Kontainer | `src/app/globals.css:92`; `src/app/page.tsx:352` | Kontainer dipakai bersama pada susunan flex; perubahan ukuran perlu diuji pada tiga tab dan detail |
| Data fallback | `src/services/api.ts:21`; `src/components/BnpbSyncBanner.tsx:23` | Fallback tidak membawa status kegagalan ke banner, sedangkan banner selalu mengklaim sinkronisasi |
| Hotspot dan status | `src/components/FireHazeMap.tsx:122`; `src/data/hotspotsData.ts:8` | Titik diinisialisasi dari array lokal; status siaga dihitung internal, bukan diambil dari penetapan resmi |
| Kualitas udara | `src/utils/airQualityService.ts:105`; `src/components/FireHazeMap.tsx:526` | Ada penanda `is_live`, tetapi header tetap mengesankan sensor resmi; sumber fallback disebut BMKG tanpa fetch BMKG di jalur tersebut |
| Kilas balik | `src/utils/timeLapseService.ts:155`; `src/components/FireHazeMap.tsx:290` | PM2.5 dan luas memakai perkalian model diurnal, lalu tampil sebagai deret waktu satelit; jangan diperlakukan sebagai riwayat observasi |
| Petak ke bukti | `src/components/RecoveryMap.tsx:404`; `src/app/page.tsx:384`; `src/components/ForumFeed.tsx:19` | Kode petak dikirim oleh peta lalu diabaikan pada halaman; prop filter petak tidak digunakan |
| Waktu dan verifikasi | `src/data/forumPostsData.ts:20`; `src/components/ForumPostDetailClient.tsx:390` | Label relatif tetap dan lencana tanpa syarat harus mengikuti data yang dapat dibuktikan |
| Publikasi | `src/app/page.tsx:282`; `src/app/forum/[id]/page.tsx:73` | Kiriman disimpan ke localStorage, sedangkan halaman server mencari dataset awal. Tautan kiriman baru lintas perangkat belum dapat dijamin |
| Filter dan format | `src/utils/plotDisplay.ts` | Gunakan kembali taksonomi wilayah, format angka, serta tanggal; jangan membuat kamus paralel |
| Tema bersama | `src/app/globals.css`; `src/components/BnpbSyncBanner.tsx` | Audit kedua tema setelah perubahan token; jangan menganggap warna teks terang cocok untuk kartu putih |

Jejak ini merupakan hasil pembacaan kode. Publikasi baru lintas perangkat tidak diuji dengan pengiriman data pada sesi ini. Tidak ada perubahan pada file aplikasi, dependensi, maupun backend.

## 6. Hasil pengukuran

| Halaman | Viewport awal | Lebar dokumen | Hasil |
|---|---:|---:|---|
| Karhutla | 1440 | 1440 | Tidak ada overflow halaman |
| Pemulihan | 1440 | 1440 | Tidak ada overflow halaman; strip wilayah dapat bergulir |
| Forum | 1440 | 1440 | Tidak ada overflow halaman |
| Karhutla | 390 | 481 | Overflow 91 px |
| Pemulihan | 390 | 1200 | Overflow 810 px |
| Forum | 390 | 408 | Overflow 18 px |
| Detail contoh | 390 | 390 | Tidak ada overflow halaman pada contoh ini |

Sumber angka: `observations.json` dan `checks.json`. Pemeriksaan awal memakai viewport sempit pada konteks desktop. Pengujian ulang memakai emulasi ponsel dengan viewport konfigurasi 390 lalu 360 px; `innerWidth` membesar menjadi 481/1200/408 karena layout meluber. Karena itu, ukuran konfigurasi dan ukuran layout tidak boleh disamakan. Keduanya mengonfirmasi masalah yang sama.

Uji alur Riau mempertahankan filter provinsi ketika pindah ke forum, tetapi tidak memperbarui URL. Hasil satu kiriman pada Riau tidak membuktikan filter petak bekerja; kekurangan filter petak dikonfirmasi dari kode. Uji dua petak dalam satu wilayah diperlukan setelah implementasi.

Belum dilakukan: pengukuran pengguna nyata, audit WCAG menyeluruh, pengujian produksi, pengujian performa pada perangkat fisik, pengiriman laporan, dan validasi fakta lapangan.

## 7. Riset eksternal

Sumber diperiksa pada 17 Oktober 2026. Prinsip yang stabil dipakai dari publikasi primer; tahun lama tidak dianggap berarti prinsip tersebut berubah. Penerapan pada BuktiPulih merupakan rekomendasi audit.

| Sumber | Dasar yang digunakan | Penerapan |
|---|---|---|
| [NN/g - Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Tampilkan kebutuhan utama dahulu; rincian lanjutan dibuka sesuai kebutuhan | Ringkasan wilayah lebih dahulu, kontrol peta di rincian |
| [GOV.UK - Writing for user interfaces](https://www.gov.uk/service-manual/design/writing-for-user-interfaces) | Teks pendek, langsung, dan kata penting di awal | Hapus pengantar berulang dan istilah sistem |
| [W3C - Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Konten biasa perlu menyesuaikan lebar 320 CSS px; peta memiliki pertimbangan dua dimensi | Peta boleh bergeser di dalam area sendiri, halaman dan kontrol tidak ikut meluber |
| [W3C - Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Minimum AA 24 × 24 CSS px dengan pengecualian; area lebih besar membantu penggunaan | Target produk 44–48 px untuk kontrol utama |
| [W3C - Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Teks normal memerlukan kontras 4,5:1 | Periksa banner dan label di kedua tema |
| [Open-Meteo - Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | Layanan kualitas udara memakai model prakiraan CAMS | Sebut estimasi/model dan penyedia; jangan menyebutnya pembacaan sensor KLHK |
| [NASA Earthdata - FIRMS MODIS FAQ](https://forum.earthdata.nasa.gov/viewtopic.php?t=5191) | Deteksi merepresentasikan piksel anomali panas; tidak memberi luas kebakaran secara langsung | Bedakan titik panas, laporan kebakaran, serta luas observasi |

Tidak ada rekomendasi kesehatan atau penafsiran regulasi baru yang ditetapkan dalam audit ini. Label teknis yang sudah ada memerlukan validasi domain tersendiri sebelum dipakai sebagai keputusan operasional.

## 8. Bukti visual

Folder bukti: [ui-ux-audit-2026-10-17](./ui-ux-audit-2026-10-17/).

- Desktop: [karhutla](./ui-ux-audit-2026-10-17/desktop-fire.png), [pemulihan](./ui-ux-audit-2026-10-17/desktop-recovery.png), [forum](./ui-ux-audit-2026-10-17/desktop-forum.png).
- Ponsel halaman penuh: [karhutla](./ui-ux-audit-2026-10-17/mobile-fire.png), [pemulihan](./ui-ux-audit-2026-10-17/mobile-recovery.png), [forum](./ui-ux-audit-2026-10-17/mobile-forum.png).
- Ponsel area layar: [karhutla](./ui-ux-audit-2026-10-17/mobile-fire-viewport.png), [pemulihan](./ui-ux-audit-2026-10-17/mobile-recovery-viewport.png), [forum](./ui-ux-audit-2026-10-17/mobile-forum-viewport.png).
- Detail: [desktop](./ui-ux-audit-2026-10-17/desktop-detail.png), [ponsel](./ui-ux-audit-2026-10-17/mobile-detail-viewport.png).
- Tema: [forum gelap](./ui-ux-audit-2026-10-17/desktop-forum-dark-viewport.png).
- Pengukuran: [observasi awal](./ui-ux-audit-2026-10-17/observations.json), [pengujian ulang](./ui-ux-audit-2026-10-17/checks.json), [jaringan dan warna](./ui-ux-audit-2026-10-17/network-and-theme.json).

Screenshot halaman penuh dapat lebih lebar daripada viewport karena overflow. Foto dengan lazy loading yang belum tampil di luar layar tidak otomatis berarti aset rusak. Indikator Next.js pada screenshot berasal dari server development dan bukan elemen produk.
