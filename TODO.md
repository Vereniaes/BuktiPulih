# BuktiPulih — Roadmap & Task Tracker

## 27. Pulihkan ikon tombol tema - 19 Oktober 2026

- [x] Reproduksi ikon hilang dan periksa header sebelum/sesudah perubahan.
- [x] Pulihkan SVG bulan/matahari dengan gaya yang sudah tersedia.
- [x] Periksa perpindahan tema, refresh, dan tampilan 320/360/390/768/1440 px; TypeScript lulus.

## 26. Homepage referensi Emisi - 18–19 Oktober 2026

- [x] Keputusan /grillme dan rencana implementasi disetujui.
- [x] Riset Emisi, NASA FIRMS, Open-Meteo, kode, dan dokumentasi lokal.
- [x] Adaptor hotspot, parser CSV, cache, dan pengujian kegagalan sumber.
- [x] Prakiraan lima hari dengan nilai kosong dan kegagalan terpisah.
- [x] Homepage, peta, pembesaran, bukti, dan navigasi URL.
- [x] TypeScript, build, pengujian data, dan browser kedua tema.
- [ ] Uji live NASA setelah FIRMS_MAP_KEY valid tersedia.

Verifikasi: 9 pengujian adaptor dan 6 pengujian prakiraan lulus; browser lulus untuk homepage, navigasi, dan kontribusi terisolasi. Overflow ponsel pada tab Karhutla lama masih tercatat sebagai masalah sebelumnya, di luar susunan homepage baru.

Catatan: [knowledge Emisi](knowledge/reverse-engineering-emisi-homepage.md). Tanpa commit, push, deployment, atau migrasi database.

## 24. Audit UI/UX dan BRD ringkasan wilayah - 17 Oktober 2026

- [x] Konfirmasi tujuan melalui `/grillme`: menemukan informasi utama dengan cepat.
- [x] Konfirmasi arah: ringkasan per wilayah berisi karhutla, pemulihan, dan bukti terbaru.
- [x] Inventarisasi panduan, skill lokal, catatan, serta kode alur utama.
- [x] Periksa tiga tab pada desktop 1440 px dan ponsel 390 px; simpan tangkapan layar.
- [x] Ulangi temuan kritis dan periksa perpindahan wilayah, detail, serta navigasi ponsel.
- [x] Simpan temuan dan sumber eksternal di `knowledge/ui-ux-audit-2026-10-17.md`.
- [x] Susun BRD ringkas di `planning/brd-ringkasan-wilayah.md`, termasuk tiga opsi, batas lingkup, dampak, dan ukuran keberhasilan.
- [x] Periksa dokumen, 12 tangkapan layar, 3 berkas hasil pengujian, tautan lokal, dan perubahan berkas.
- [x] Konfirmasi langkah berikutnya melalui `/grillme` setelah BRD tersedia: wireframe ponsel dan desktop dipilih.

Lingkup sesi: audit dan dokumen. Implementasi UI belum dilakukan. Berkas `frontend-req` dan gambar mockup lama belum ditemukan pada inventaris proyek. Catatan audit baru menjadi bukti kondisi saat ini; status selesai pada catatan lama bukan hasil pengujian ulang.

Hasil: arah ringkasan wilayah dipilih; masalah navigasi ponsel, overflow, konteks URL/petak, dan label asal data dicatat. Pengujian desktop, emulasi ponsel, detail, serta tema gelap dilakukan pada server development. Belum ada uji pengguna atau performa produksi. Tidak ada perubahan kode aplikasi, commit, atau push.

## 25. Wireframe ringkasan wilayah - 17 Oktober 2026

- [x] Konfirmasi lingkup berdasarkan pilihan `/grillme`: wireframe, sebelum implementasi UI.
- [x] Tinjau BRD, audit visual, panduan lokal, token, dan taksonomi wilayah.
- [x] Buat tampilan semua wilayah, satu wilayah, dan keadaan tanpa data untuk desktop serta ponsel.
- [x] Render SVG menjadi PNG dan periksa keterbacaan, urutan informasi, serta area sentuh.
- [x] Dokumentasikan alur, data contoh, pemetaan kebutuhan BRD, dan referensi riset.
- [x] Periksa hasil: enam frame, satu papan pratinjau, dan tautan dokumen; teks tidak keluar atau bertumpuk, area kontrol minimal 44 px.
- [ ] Pilih tindak lanjut melalui `/grillme` setelah meninjau wireframe.

Hasil tersimpan di `planning/wireframes/ringkasan-wilayah/README.md` dengan PNG, SVG, dan `visual-checks.json`. Referensi ada di `knowledge/wireframe-ringkasan-wilayah.md`. Wireframe bersifat statis dengan data contoh; belum ada pengukuran pengguna atau implementasi aplikasi. Tidak ada commit atau push.

## 1. Status Tracker
- [x] **Analisis UI Design System Website Referensi** (`bijakmemantau.id`)
  - [x] Inspeksi token, layout, tipografi, dan palet warna.
  - [x] Identifikasi critical issues & UX bottlenecks.
- [x] **Penyusunan Knowledge Base Atomic Design System**
  - [x] Dokumentasi Sub-Atomic (Tokens: Color, Typography, Radii, Shadows).
  - [x] Dokumentasi Atoms (Buttons, Badges, Status Pills, Inputs).
  - [x] Dokumentasi Molecules (Search bar, Metadata row, Commitment counters).
  - [x] Dokumentasi Organisms (Navbar, Metrics panel, Tracker cards, Editorial cards).
  - [x] Dokumentasi Templates & Pages mapping.
  - [x] Disimpan di `knowledge/design-system-atomic.md`.
- [x] **Penyusunan Perencanaan Spesifikasi per Fitur (Detailed Feature Planning)**
  - [x] Fitur 1: Dashboard Peta Restorasi & Impact Ledger (`planning/fitur-1-dashboard-peta.md`).
  - [x] Fitur 2: Timeline Partisipasi Relawan / Notes Collage (`planning/fitur-2-timeline-relawan.md`).
  - [x] Fitur 3: Formulir Pelaporan Lapangan / Low-Bandwidth Form (`planning/fitur-3-form-post-bencana.md`).
  - [x] Fitur 4: Autentikasi Ringan & Pertahanan Keamanan Siber (`planning/fitur-4-autentikasi-dan-cybersecurity.md`).
- [x] **Reverse Engineering & Penemuan Sumber Data Eksternal Karhutla**
  - [x] Analisis backend WebGIS BNPB (`gis.bnpb.go.id`).
  - [x] Pemetaan endpoint ArcGIS REST Service (`2026_karhutla/mv_prov_karhutla_2026/MapServer/3`).
  - [x] Dokumentasi query GeoJSON & kamus atribut di `knowledge/bnpb-karhutla-api.md`.
- [x] **Persiapan Frontend & Kontrak API (Mock Data / Backend Ready)**
  - [x] Pembuatan kontrak API (RESTful JSON Envelope) sesuai skema MongoDB per fitur (`knowledge/api-contracts-and-mock-data.md`).
  - [x] Integrasi adapter data eksternal BNPB ke dalam skema petak BuktiPulih (`knowledge/mock-data/bnpb_sync_cache.json`).
  - [x] Penyediaan mock dataset terpisah (`plots.json`, `impact_ledger.json`, `timeline.json`, `bnpb_sync_cache.json`).
  - [x] Implementasi UI Mockup / Component Library Next.js (SSR) siap integrasi ke backend (`src/app/`, `src/components/`, `src/data/`, `src/types/`).
- [x] **Pembangunan Backend Service (`bukti-pulih-be`)**
  - [x] Inisialisasi Node.js, Express, TypeScript, Mongoose MongoDB.
  - [x] Implementasi skema koleksi MongoDB dengan indeks geospasial `2dsphere` (`plots`, `monitoring_logs`, `reports_inbox`, `users`, `bnpb_sync_cache`).
  - [x] Implementasi 6 modul RESTful API (`plots`, `metrics`, `external/bnpb`, `timeline`, `reports`, `auth`).
  - [x] Implementasi background worker cron sinkronisasi live WebGIS BNPB (`bnpb.cron.ts`).
  - [x] Penyusunan skrip seeder basis data (`seed.ts`) dan eksekusi sukses.
  - [x] Pengujian seluruh endpoint via curl (HTTP 200/201 lulus).
- [x] **Kontainerisasi & Deployment Cloud Readiness**
  - [x] Dockerfile multi-stage standalone runner Next.js frontend (`BuktiPulih/Dockerfile`).
  - [x] Dockerfile multi-stage production runner Express backend (`bukti-pulih-be/Dockerfile`).
  - [x] Berkas `.dockerignore` untuk frontend dan backend.
- [x] **Pengujian & Validasi Kualitas (QA Testing)**
  - [x] Pembuatan skrip pengujian otomatis 12 kasus QA (`bukti-pulih-be/src/scripts/qa-test.ts`).
  - [x] Eksekusi uji otomatis 12/12 kasus lulus (100% lulus, 0 gagal).
  - [x] Verifikasi build produksi frontend (`npm run build` lolos tanpa error).
  - [x] Verifikasi build kompilasi TypeScript backend (`npm run build` lolos tanpa error).
- [x] **Dokumentasi Infrastruktur GCP & Firebase Console**
  - [x] Panduan alokasi Free Tier & Budget Alert Rp 0 (`knowledge/gcp-firebase-console-guide.md`).
  - [x] Panduan aktivasi API, Artifact Registry, dan Secret Manager.
  - [x] Panduan konfigurasi Firebase Storage, aturan keamanan (Rules), dan CORS JSON.
  - [x] Panduan parameter Cloud Run untuk Backend & Frontend (asia-southeast2 Jakarta).

---

## 2. Activity Log
- **2026-10-13 22:30**: Inspeksi live URL `pantau-tuntutan-masyarakat` dan `tuntutan-178` menggunakan browser subagent.
- **2026-10-13 22:34**: Pembuatan file `knowledge/design-system-atomic.md` memetakan seluruh sistem desain secara atomic.
- **2026-10-13 22:35**: Inisialisasi file tracker `TODO.md`.
- **2026-10-13 22:42**: Penyusunan dokumen arsitektur dan perencanaan implementasi lengkap di `planning/system-architecture-and-implementation-plan.md`.
- **2026-10-13 22:49**: Penyusunan 4 file spesifikasi fitur lengkap (Fitur 1 Dashboard Peta, Fitur 2 Timeline Notes, Fitur 3 Form Pelaporan, Fitur 4 Autentikasi & Cyber).
- **2026-10-13 23:03**: Berhasil melakukan reverse engineering backend WebGIS BNPB Karhutla 2026 dan menemukan endpoint ArcGIS REST aktif (`mv_prov_karhutla_2026`) terdokumentasi di `knowledge/bnpb-karhutla-api.md`.
- **2026-10-13 23:10**: Verifikasi live payload ArcGIS REST BNPB (berhasil menarik data real-time 6 provinsi terdampak) dan peninjauan kritis keselarasan arsitektur (disparitas MongoDB vs PostgreSQL & Google Maps vs Leaflet).
- **2026-10-13 23:15**: Sinkronisasi sesi kerja ke lingkungan Linux (`/home/vereniaes/project/uinic`), validasi koneksi live `curl` ke WebGIS BNPB berhasil (HTTP 200, 6 provinsi terdampak), persiapan penentuan langkah berikutnya melalui `/grill-me`.
- **2026-10-13 23:20**: Penyusunan spesifikasi Kontrak API v1.0 lengkap di `knowledge/api-contracts-and-mock-data.md`, standarisasi arsitektur ke MongoDB + Leaflet.js (zero-cost), dan pembuatan 4 dataset mock JSON di `knowledge/mock-data/`.
- **2026-10-13 23:30**: Berhasil menginisialisasi frontend Next.js App Router di `BuktiPulih`, membangun modul Vanilla CSS design tokens (`globals.css`), mengimplementasikan 7 komponen modular (HeaderNav, ImpactLedger, BnpbSyncBanner, RestorationMap Leaflet OSM, PlotBottomSheet, TimelineNotes Polaroid, QuickReportModal), dan verifikasi kompilasi `npm run build` (lolos 100%).
- **2026-10-13 23:45**: Berhasil membangun backend service mandiri di `bukti-pulih-be` (Express + TypeScript + Mongoose MongoDB), implementasi 6 modul RESTful API berstandar envelope, aktivasi cron worker BNPB Karhutla, injeksi seeder data awal, dan verifikasi seluruh endpoint via curl (lolos 100%).
- **2026-10-13 23:55**: Penyempurnaan menyeluruh antarmuka frontend BuktiPulih: integrasi klien API live (`api.ts`), utilitas kompresi citra canvas WebP (`imageCompression.ts`), manajemen draft offline (`offlineQueue.ts`), komponen modal login kader berbasis keypad angka 56px (`AuthModal.tsx`), interaksi upvote live & dialog catatan warga pada linimasa (`TimelineNotes.tsx`), visualisasi survival rate progress bar pada Bottom Sheet, dan verifikasi kompilasi produksi `npm run build` (lolos 100%).
- **2026-10-14 00:20**: Kontainerisasi Docker backend (`Dockerfile`, `.dockerignore`), implementasi dan eksekusi skrip pengujian otomatis 12 kasus QA (`qa-test.ts`) dengan hasil 100% lulus (12/12), serta penyusunan panduan operasional lengkap GCP & Firebase Console di `knowledge/gcp-firebase-console-guide.md`.
- **2026-10-14 00:49**: Kritik UI localhost:3001 (AI slop tells), pemilihan arah "Jurnal Petak" (layout A, token peran baru, suara jurnal "kamu"), pembuatan mockup desktop + mobile, dokumentasi di `knowledge/ui-direction-jurnal-petak.md`.
- **2026-10-14 13:15**: Pemilihan Opsi 1 (Jurnal Alur Penuh), implementasi token warm paper `#F6F1E7`, integrasi font `Manrope` & `Mansalva`, pembuatan 18 foto riwayat bulanan di `public/journal/`, implementasi komponen `GrowthCalendar`, restyle `ImpactLedger`, `TimelineNotes`, `HeaderNav`, `RestorationMap`, `PlotBottomSheet`, pembersihan footer dari rubric lomba, dan verifikasi `npm run build` (lulus 100%) serta audit visual browser desktop dan mobile.
- **2026-10-14 14:18**: Penerimaan rekaman suara arahan perombakan konsep menjadi platform partisipasi warga (Tumblr-style) dengan peta detail karhutla/asap BNPB, penyusunan spesifikasi arsitektur di `planning/revisi-portal-partisipatif-tumblr.md`, dan pemilihan Opsi 1 (Multi-Tab Portal).
- **2026-10-14 23:25**: Otomasi integrasi lembar disposisi posko siaga BPBD (PDF/PNG) dengan data verifikasi kader lapangan terkini (Manggala Agni, BRGM, KMPG) dan parameter sensor satelit nyata (NASA MODIS, NOAA VIIRS). Eliminasi seluruh residu teks simulasi fiktif (Sortie Water Bombing diganti pembasahan sekat kanal & patroli darat), perluasan kanvas ekspor resolusi tinggi 1200x1800 px, dan pengujian build Turbopack Next.js lolos 0 error.
- **2026-10-15 00:30**: Penggelaran filter lintas wilayah interaktif pada Forum Pulih (Tab 3), pengkayaan postingan otentik untuk 6 provinsi prioritas BNPB (Riau, Sumsel, Kalsel, Jambi, Kalteng, Kalbar) + Bekasi, penyelarasan parameter URL '?tab=forum&region=...', dan penambahan banner konteks provinsi.
- **2026-10-15 00:40**: Integrasi sensor live kualitas udara ISPU KLHK (Permen LHK 14/2020) & PM2.5 via Open-Meteo Atmospheric CAMS. Penambahan lencana live ISPU pada header posko siaga, pembacaan live pada kartu KPI 3, dan sinkronisasi kategori baku mutu ke lembar disposisi BPBD.
- **2026-10-15 00:55**: Penggelaran filter status kondisi lahan gambut (*Tumbuh Subur*, *Lahan Basah*, *Perlu Rawat*, *Rawan Kering*) pada feed Forum Pulih (Tab 3). Penghitungan dinamis per wilayah, dot warna status semantik, strip banner multi-dimensi, empty state interaktif, dan kompilasi Turbopack Next.js lulus 100% (0 error).
- **2026-10-15 01:25**: Penyusunan dokumen pengetahuan teknis di `knowledge/indikator-tmat-dan-khg-tab2.md` mencakup standar baku mutu air tanah gambut PP No. 57 Tahun 2016 (ambang batas kritis -40 cm) dan spesifikasi integrasi layer spasial KHG BRGM pada Tab 2.
- **2026-10-15 01:28**: Implementasi penuh Paket Lengkap (Opsi 1 & Opsi 2): Indikator Tinggi Muka Air Gambut (TMAT) terukur dan spanduk siaga darurat bahaya karhutla PP 57/2016 pada `/forum/[id]`, serta integrasi layer poligon spasial Kesatuan Hidrologis Gambut (KHG) BRGM 7 kawasan prioritas pada Tab 2 (`RecoveryMap.tsx`). Verifikasi build Turbopack Next.js (18 halaman statis) 100% lulus 0 error dan audit visual peramban browser subagent sukses.
- **2026-10-15 01:50**: Implementasi penuh pembersihan AI slop sesuai persetujuan Opsi 3 (The Unified Ledger): konsolidasi 5 kartu KPI menjadi 1 Unified Status Strip, penyederhanaan 17 pill buttons menjadi Forum Control Bar terpadu, pembersihan 36 placeholder kotak abu-abu GrowthCalendar menjadi kartu status petak terdaftar, perbaikan unclosed media query di globals.css (line 4384), sinkronisasi ke WSL, verifikasi build Turbopack Next.js 18/18 halaman lulus 100% (0 error), dan audit visual browser subagent sukses.

## 23. Deslop UI/UX, Eliminasi AI Pattern & Refaktor Hirarki Visual (Selesai)
- [x] Riset mendalam 4 repositori anti-slop eksternal & sintesis ke `knowledge/anti-slop-ui-ux-audit.md`.
- [x] Audit visual tangkapan layar 3 tab portal (Tab 1 Karhutla, Tab 2 Bukti Pulih, Tab 3 Forum Pulih).
- [x] Penyelarasan arah desain dengan pengguna melalui `/grill-me` (Opsi 3: The Unified Ledger disetujui).
- [x] Eliminasi Pill Overload dan Cardocalypse (konsolidasi 5 kartu KPI ke Unified Status Strip).
- [x] Pembersihan 36 placeholder abu-abu kosong pada GrowthCalendar menjadi kartu petak terdaftar informatif.
- [x] Perbaikan layout glitch (penutupan kurung kurawal @media line 4384 di globals.css).
- [x] Perbaikan hidrasi cache postingan forum (mencegah 0 post empty state).
- [x] Penyederhanaan copywriting agar terasa alami, ringkas, dan bersuara manusia nyata.
- [x] Sinkronisasi seluruh berkas ke WSL dan verifikasi build Next.js 18/18 halaman (0 error).
- [x] Audit visual browser desktop pada Tab 1, Tab 2, dan Tab 3.

## 22. Indikator Muka Air Gambut (TMAT) /forum/[id] & Layer KHG Tab 2 (Selesai)
- [x] Penyusunan spesifikasi regulasi PP 57/2016 & dokumentasi di `knowledge/indikator-tmat-dan-khg-tab2.md`.
- [x] Pembaruan model data di `src/types/index.ts` (penambahan `water_table_depth_cm` dan `water_table_status` pada `FieldVerification` & `ForumPost`).
- [x] Pengkayaan data terukur di `src/data/forumPostsData.ts` (nilai TMAT terukur -18 cm, -20 cm, -22 cm, -25 cm, -32 cm, -38 cm, dan -48 cm untuk kubah gambut).
- [x] Implementasi widget monitoring TMAT pada `src/components/ForumPostDetailClient.tsx`:
  - [x] Kartu metrik TMAT linear minimalis dengan penanda permukaan (0 cm) dan ambang kritis PP 57/2016 (-40 cm).
  - [x] Spanduk peringatan bahaya siaga darurat jika TMAT < -40 cm (misal pada `post-kb-011` di Ketapang).
  - [x] Penambahan input TMAT pada formulir audit lapangan vercel blob.
  - [x] Lencana TMAT pada kartu rekam jejak audit verifikasi kader.
- [x] Implementasi Layer Kesatuan Hidrologis Gambut (KHG) pada `src/components/RecoveryMap.tsx`:
  - [x] Import dataset `peatHydrologicalUnitsData.ts`.
  - [x] Tombol sakelar mandiri `Kubah Gambut BRGM` pada header peta Tab 2.
  - [x] Render poligon interaktif Leaflet (Fungsi Lindung >3m vs Fungsi Budidaya <3m) dengan popup rincian SK MenLHK.
  - [x] Deteksi otomatis petak restorasi yang berada di dalam zona kubah gambut lindung (`khg-spot-indicator-box`).
- [x] Penyelarasan styling di `src/app/globals.css` (Dark Mode & Light Mode, mobile responsive).
- [x] Sinkronisasi seluruh berkas ke WSL dan verifikasi build Next.js lulus 100% (0 error).
- [x] Audit visual peramban desktop dan seluler pada halaman `/forum/[id]` dan `/?tab=recovery`.


## 3. Redesign "Jurnal Petak" (Selesai)
- [x] Audit visual desktop + mobile dan daftar AI slop tells.
- [x] Keputusan arah: layout A, token peran baru, suara jurnal.
- [x] Mockup desktop + mobile.
- [x] Persetujuan mockup (Opsi 1: Jurnal Alur Penuh disetujui).
- [x] Token + font (`globals.css`, `layout.tsx`).
- [x] Aset foto perkembangan bulanan nyata (`public/journal/` 18 foto riwayat m1..m6).
- [x] Komponen `GrowthCalendar` (tab map folder wilayah + grid 6 bulan + laci foto).
- [x] Restyle `ImpactLedger`, `TimelineNotes`, `HeaderNav` (hamburger drawer mobile anti-overflow).
- [x] Restyle `RestorationMap`, `PlotBottomSheet`, `BnpbSyncBanner` (tanpa emoji, format angka id-ID).
- [x] Integrasi alur halaman `src/app/page.tsx` + copy deck anti-slop + pembersihan footer dari rubric lomba.
- [x] Uji visual desktop + mobile di browser, verifikasi `npm run build` sukses (Turbopack, TypeScript 0 error).

## 4. Perombakan Portal Partisipatoris Warga (Tumblr-Style & Peta Asap BNPB) (Selesai)
- [x] Analisis pesan suara pengguna & identifikasi disparitas mental model.
- [x] Penyusunan dokumen arsitektur di `planning/revisi-portal-partisipatif-tumblr.md`.
- [x] Pemilihan arsitektur Opsi 1 (Multi-Tab Portal: Pantau Karhutla, Bukti Pulih, Forum Pulih).
- [x] Definisi tipe data `ForumPost`, `ForumComment`, `UserProfileLight`, `HotspotPoint` di `src/types/index.ts`.
- [x] Dataset awal partisipasi warga Tumblr di `src/data/forumPostsData.ts`.
- [x] Komponen `FireHazeMap.tsx` (Peta situasi darurat BNPB dengan titik api pulse + layer radius kabut asap/haze PM2.5).
- [x] Komponen `RecoveryMap.tsx` (Peta pemulihan kawasan pasca-padam & sekat kanal).
- [x] Komponen `ForumFeed.tsx` (Grid Tumblr masonry kartu skala bebas + filter latest/likes/comments/views).
- [x] Komponen `PostDetailModal.tsx` (Detail postingan & komentar dengan profil username/usia/domisili).
- [x] Komponen `CreatePostModal.tsx` (Formulir `+ posting bukti` unggah foto/video warga).
- [x] Navigasi 3 tab di `src/components/HeaderNav.tsx`.
- [x] Integrasi tata letak di `src/app/page.tsx` dan styling di `src/app/globals.css`.
- [x] Uji visual desktop & mobile di browser, verifikasi kompilasi `npm run build` sukses (Turbopack, TypeScript 0 error).

## 5. Sistem Tema Antarmuka: Item-Ijo-Orange (Dark Mode) & Ijo-Krem (Light Mode) (Selesai)
- [x] Implementasi token CSS `:root` untuk Mode Terang (Ijo-Krem): latar kertas hangat (`#F6F1E7`), kartu gading (`#FFFFFF`), cap & tombol hijau rimba (`#0E753B`).
- [x] Implementasi token CSS `[data-theme="dark"]` untuk Mode Gelap (Item-Ijo-Orange): kanvas hitam obsidian (`#080C0E`), kartu arang (`#11161C`), cap status/pemulihan hijau emerald hidup (`#22C55E`), tombol aksi `+ posting bukti` & sorotan aktif oranye api/hazard (`#F97316`).
- [x] Inversi otomatis peta Leaflet OpenStreetMap di mode gelap dengan filter CSS tanpa biaya API tambahan.
- [x] Sakelar sakelar tema (`btn-theme-toggle`) dengan ikon SVG bersih (tanpa emoji berlebih) di desktop header dan mobile drawer.
- [x] Penyimpanan preferensi pengguna ke `localStorage` (`buktipulih_theme`) dengan fallback deteksi OS `prefers-color-scheme`.
- [x] Uji visual dan transisi tema di browser (`http://localhost:3001`), build Next.js lulus 100% (TypeScript 0 error).

## 6. Integrasi Vercel Blob Storage & Deployment Pipeline (Vercel Frontend + Cloud Run Backend) (Selesai)
- [x] Instalasi SDK `@vercel/blob` pada frontend Next.js (`BuktiPulih`).
- [x] Pembuatan berkas `.env.local` dan template `.env.example` dengan token Vercel Blob `BLOB_READ_WRITE_TOKEN`.
- [x] Pembuatan App Router API route handler `src/app/api/upload/route.ts` dengan validasi tipe MIME (JPEG, PNG, WebP, MP4, WebM) dan limit 10 MB.
- [x] Pembaruan `CreatePostModal.tsx`: input berkas foto/video nyata, pratinjau instan (*instant thumbnail preview*), indikator *loading* saat mengunggah ke CDN Vercel Blob, serta *fallback* sampel foto lokal.
- [x] Penyesuaian konfigurasi CORS di backend `bukti-pulih-be/src/app.ts` untuk mengizinkan seluruh domain `*.vercel.app`.
- [x] Penyusunan panduan deployment operasional langkah demi langkah di `planning/panduan-deploy-vercel-cloudrun.md`.
- [x] Verifikasi kompilasi produksi `npm run build` di frontend (Next.js Turbopack) dan backend (TypeScript tsc) lulus 100% (0 error).

## 7. Rancang Bangun Modul Simulasi Titik Api & Sebaran Asap Karhutla (Hasil REA transit-staging.oyenza.com/compare) (Selesai)
- [x] Reverse Engineering Architecture (REA) mendalam terhadap aset produksi `https://transit-staging.oyenza.com/compare`.
- [x] Identifikasi arsitektur nyata: Pembongkaran mitos Three.js, konfirmasi penggunaan MapLibre GL JS + model matematika ekstrapolasi koordinat + layout kartu komparasi.
- [x] Dokumentasi pengetahuan di `knowledge/peta-simulasi-oyenza-style.md` dan `knowledge/reverse-engineering-oyenza-compare.md`.
- [x] Penyusunan dokumen perencanaan teknis lengkap di `planning/simulasi-peta-karhutla-oyenza.md` dengan 3 opsi solusi arsitektur.
- [x] Konfirmasi pemilihan opsi arsitektur: Opsi 1 (Leaflet Canvas Particle Flow + Oyenza Compare Dashboard) untuk performa 60 FPS tanpa beban bundle.
- [x] Implementasi Ikon Api Membara Animasi (`fire-flame-pin`, `heat-aura`, dan `ember-spark`).
- [x] Implementasi Mesin Partikel Asap Canvas Mengalir (`smokeParticleEngine.ts`) mengikuti arah angin, kecepatan angin (0-60 km/h), dan status bahaya titik api.
- [x] Implementasi Dashboard Komparasi Oyenza di `FireHazeMap.tsx` (5 KPI cards, segmented layer pills, kontrol simulasi angin, pemilih jendela waktu 15m/1j/3j/24j, dan tabel titik rawan dengan interaksi flyTo).
- [x] Pengujian visual desktop/mobile di browser (`http://localhost:3001`), pengujian tema ganda (Light Ijo-Krem & Dark Item-Ijo-Orange), dan verifikasi build Next.js lulus 100% (0 error).

## 8. Integrasi Live Weather API (BMKG / Open-Meteo) untuk Kecepatan & Arah Angin Nyata (Selesai)
- [x] Riset endpoint, format respon, dan pengujian query langsung ke Open-Meteo API untuk koordinat Riau, Sumsel, Kalbar.
- [x] Dokumentasi pengetahuan di `knowledge/live-weather-wind-dispersion.md` (vektor sudut 0-360 derajat ke 8 mata angin & indeks kelembapan relatif).
- [x] Implementasi modul layanan cuaca `src/utils/weatherService.ts` dengan in-memory cache dan fallback offline.
- [x] Integrasi tombol sakelar mode cuaca (*Mode Otomatis Live Cuaca* vs *Mode Manual Simulasi*) pada Dashboard Oyenza Compare di `FireHazeMap.tsx`.
- [x] Integrasi otomatisasi arah mata angin, kecepatan angin (km/h), dan indeks kelembapan (RH%) saat memilih titik api di tabel (interaksi flyTo langsung memicu pembaruan cuaca riil koordinat).
- [x] Penyesuaian `SmokeParticleEngine` untuk memperhitungkan kelembapan relatif terhadap dispersi dan opasitas kabut asap.
- [x] Pengujian peramban, visual audit live data cuaca (`live_weather_audit`), dan verifikasi build `npm run build` lulus 0 error.

## 9. Simulasi Modifikasi Cuaca & Pemadaman (Operasi TMC & Water Bombing) (Selesai)
- [x] Riset parameter lapangan (Bambi Bucket 4.000L & penyemaian awan NaCl BRIN/BNPB) dan dokumentasi di `knowledge/operasi-tmc-water-bombing.md`.
- [x] Implementasi fungsi intervensi pemadaman pada `FireHazeMap.tsx` (Water Bombing titik terpilih & Operasi TMC massal).
- [x] Animasi visual penyejukan: efek riak air pendinginan (`water-drop-ripple`), transisi marker kobaran api ke uap pendinginan (`cooling-steam-aura` dan tetesan uap air).
- [x] Integrasi transisi partikel asap pada `smokeParticleEngine.ts` menjadi uap air tipis kondensasi putih kebiruan transparan (`rgba(180, 215, 230, 0.18)`).
- [x] Sinkronisasi dinamis 5 kartu KPI (titik api aktif padam, estimasi luas asap menyusut drastis ke 759 Ha, penurunan PM2.5 ke 25 µg/m³, dan peralihan status ke 'Terkendali / Pemulihan').
- [x] Tombol pemulihan observasi satelit awal (*Reset ke Status Satelit Awal*).
- [x] Verifikasi build `npm run build` dan audit visual interaksi pemadaman di browser (`water_bombing_tmc_audit`).

## 10. Fitur Ekspor Peta & Lembar Disposisi Posko Siaga (PNG / PDF Dispatch) (Selesai)
- [x] Riset format disposisi posko BPBD/BNPB & dokumentasi di `knowledge/lembar-disposisi-karhutla.md`.
- [x] Pembuatan utilitas ekspor grafis kanvas 2D mandiri `src/utils/dispatchExporter.ts` (0 KB dependensi baru, komposit visual tajam 1200x1600 px).
- [x] Pembuatan komponen modal `src/components/DispatchModal.tsx` berstandar posko darurat (kop satgas, ringkasan siaga, tabel wilayah, rekomendasi aksi, dan tanda tangan).
- [x] Penambahan tombol `Ekspor Disposisi` pada bilah kontrol `FireHazeMap.tsx`.
- [x] Styling print stylesheet `@media print` pada `globals.css` untuk output cetak PDF resmi ukuran A4.
- [x] Pengujian unduh PNG & cetak PDF di peramban (`dispatch_export_audit`) dan verifikasi kompilasi `npm run build` lulus 0 error.

## 11. Fitur Kilas Balik Titik Api 24 Jam & Pemutar Linimasa (24-Hour Time-Lapse Playback) (Selesai)
- [x] Riset siklus diurnal (suhu, RH, FRP, pergeseran angin 24 jam) & dokumentasi di `knowledge/time-lapse-playback-karhutla.md`.
- [x] Penyusunan utilitas penghasil frame deret waktu 24 jam (`src/utils/timeLapseService.ts`) terhubung ke Open-Meteo Hourly API.
- [x] Implementasi kontrol pemutar linimasa interaktif (Play/Pause, Slider Scrubbing 24 Jam, Kecepatan Putar 1x/2x/4x, Indikator Waktu Riil) pada `FireHazeMap.tsx`.
- [x] Pengikatan reaktif pergeseran arah angin & kelembapan ke mesin partikel kanvas `SmokeParticleEngine` saat pemutar berjalan.
- [x] Penyesuaian styling pemutar linimasa di `globals.css` untuk kedua tema (Dark Item-Ijo-Orange & Light Ijo-Krem).
- [x] Pengujian peramban, audit visual time-lapse playback, dan verifikasi kompilasi `npm run build` (lulus 0 error).

## 12. Rekayasa Halaman Penuh Forum Pulih (/forum/[id]), Anti-Slop UI & SEO Optimization (Selesai)
- [x] Penciptaan skill kustom `.agents/skills/anti-slop-ui-roaster` (eliminasi 6 pola AI slop, layout berbasis konten).
- [x] Penciptaan skill kustom `.agents/skills/modern-web-seo` (dynamic metadata Next.js, OpenGraph card WhatsApp/Twitter).
- [x] Implementasi rute dinamis halaman penuh `src/app/forum/[id]/page.tsx` menggantikan modal pop-up.
- [x] Pengikatan fungsi `generateMetadata` untuk SEO & pratinjau kartu sosial WhatsApp ($1200\times630$ px).
- [x] Desain tata letak editorial lapang untuk desktop & antarmuka jempol responsif untuk mobile (360px-420px).
- [x] Integrasi tombol salin tautan / Web Share API dan penambahan komentar persisten lokal.
- [x] Pembaruan `ForumFeed.tsx` agar menggunakan navigasi tautan asli `<Link href="/forum/[id]">`.
- [x] Pengujian visual desktop dan peramban ponsel (audit mobile viewport) serta verifikasi build Next.js 0 error.

## 13. Penataan Ulang Tab 1: Fokus Murni Data Satelit BNPB ArcGIS & Sensor MODIS/VIIRS (Selesai)
- [x] Riset spesifikasi sensor satelit & dokumentasi di `knowledge/real-bnpb-satellite-dashboard.md`.
- [x] Pembersihan kode simulasi fiktif (*Water Bombing*, *Operasi TMC*, *Slider kecepatan manual*) dari `FireHazeMap.tsx`.
- [x] Pengkayaan data titik api satelit dengan atribut sensor riil (NASA MODIS, VIIRS SNPP, FRP Megawatt, Brightness Kelvin, Status Ground-Check).
- [x] Implementasi panel samping tab ganda: Tab A (Peringkat 6 Provinsi ArcGIS BNPB) & Tab B (Rincian Titik Deteksi Satelit per Kabupaten).
- [x] Penyelarasan styling panel riil di `globals.css` untuk Dark Mode (Item-Ijo-Orange) & Light Mode (Ijo-Krem).
- [x] Pengujian peramban, audit visual data riil tanpa gimmick, dan verifikasi kompilasi `npm run build` (lulus 0 error).

## 14. Filter Geospasial Lintas Provinsi di Tab 2 (Peta Bukti Pulih) Selaras Data Satelit BNPB (Selesai)
- [x] Riset spasial ekosistem gambut BRGM & dokumentasi di `knowledge/peta-pemulihan-lintas-provinsi.md`.
- [x] Pembaruan tipe data `RegionKey` dan konstanta `REGION_TABS` di `src/utils/plotDisplay.ts` untuk 6 provinsi prioritas BNPB (Kalteng, Kalbar, Riau, Sumsel, Kalsel, Jambi) + Bekasi.
- [x] Pengkayaan data spasial petak restorasi di `src/data/plotsData.ts` (penambahan petak gambut nyata di Pelalawan Riau, OKI Sumsel, Banjarbaru Kalsel, Muaro Jambi, Pulang Pisau Kalteng, dan Ketapang Kalbar).
- [x] Pembaruan `RecoveryMap.tsx` dengan bilah filter horizontal scrollable, chip metrik ringkasan provinsi, dan animasi fokus `map.flyTo` ke titik koordinat provinsi terpilih.
- [x] Integrasi parameter provinsi dari tautan Tab 1 ("Buka Peta Bukti Pulih →") ke `src/app/page.tsx` dan `FireHazeMap.tsx`.
- [x] Penyelarasan styling di `src/app/globals.css` (Dark Mode & Light Mode, mobile touch-friendly).
- [x] Pengujian visual desktop dan peramban ponsel di browser, serta verifikasi build `npm run build` lulus 0 error.

## 15. Peningkatan Halaman Penuh Forum Pulih (/forum/[id]): Komparasi Foto, Lencana Kader, & Verifikasi Vercel Blob (Selesai)
- [x] Riset spesifikasi integritas audit fisik & dokumentasi di `knowledge/verifikasi-lapangan-dan-komparasi-foto.md`.
- [x] Pembaruan model data `FieldVerification`, `ComparativeMedia`, dan perluasan antarmuka `ForumPost` di `src/types/index.ts`.
- [x] Pengkayaan dataset postingan di `src/data/forumPostsData.ts` dengan foto komparasi sebelum-sesudah (M1 vs M6) dan nomor sertifikasi kader.
- [x] Implementasi bilah alih komparasi foto sebelum-sesudah (*Comparative Media Toggle*) di `ForumPostDetailClient.tsx`.
- [x] Implementasi kartu sertifikasi kader lapangan resmi (*Kader Certificate Badge* dengan nomor sertifikasi dan instansi).
- [x] Implementasi formulir unggah bukti verifikasi lapangan baru langsung ke CDN Vercel Blob (`/api/upload`) dengan pratinjau instan.
- [x] Implementasi rekam jejak audit verifikasi lapangan (*Audit Trail Cards*) dan persistensi lokal.
- [x] Penyelarasan styling di `src/app/globals.css` untuk Dark Mode & Light Mode.
- [x] Pengujian visual desktop dan peramban ponsel di browser, serta verifikasi kompilasi `npm run build` (lulus 0 error).

## 16. Standardisasi SEO Teknis & Metadata Mesin Pencari Google Penuh (Selesai)
- [x] Riset spesifikasi teknis SEO & dokumentasi di `knowledge/seo-dan-structured-data-schema-org.md`.
- [x] Pembuatan generator sitemap dinamis `src/app/sitemap.ts` (memetakan rute portal dan seluruh artikel forum `/forum/[id]`).
- [x] Pembuatan generator robots.txt `src/app/robots.ts` standar RFC 9309 dengan deklarasi sitemap.
- [x] Implementasi structured data JSON-LD Schema.org `WebApplication` pada Root Layout `src/app/layout.tsx`.
- [x] Implementasi structured data JSON-LD Schema.org `SocialMediaPosting` pada Halaman Detail `src/app/forum/[id]/page.tsx`.
- [x] Verifikasi HTTP endpoint `/robots.txt` dan `/sitemap.xml` melalui cURL dan kompilasi Turbopack Next.js (lulus 0 error).

## 17. Otomasi Sinkronisasi Ekspor Lembar Disposisi Posko Siaga BPBD dengan Data Verifikasi Lapangan (Selesai)
- [x] Riset & dokumentasi di `knowledge/integrasi-disposisi-verifikasi-kader.md` (keselarasan sensor satelit MODIS/VIIRS dan log kader bersertifikat).
- [x] Pembaruan modul kanvas 2D `src/utils/dispatchExporter.ts` (resolusi $1200 \times 1800$ px, penambahan tabel sensor satelit nyata, fungsi helper `getActionText`, dan Section 3 Log Verifikasi Darat Kader).
- [x] Pembaruan komponen modal `src/components/DispatchModal.tsx` (tabel HTML sinkron sensor satelit, eliminasi total label fiktif 'Sortie Water Bombing', integrasi kotak rekam jejak audit kader).
- [x] Pengikatan data reaktif pada `src/components/FireHazeMap.tsx` (pemetaan otomatis log verifikasi darat dari `initialForumPosts` ke parameter `DispatchModal`).
- [x] Penyelarasan styling print & tampilan modal di `src/app/globals.css` (`.dispatch-verif-box`, `.dispatch-verif-entry`, `.dispatch-verif-head`, `.dispatch-verif-notes`).
- [x] Sinkronisasi seluruh berkas ke WSL dan verifikasi build Next.js lulus 100% (0 error).
- [x] Pengujian visual lembar disposisi di browser (inspeksi tabel satelit dan log kader).

## 18. Filter Lintas Wilayah Interaktif pada Feed Forum Pulih (Selesai)
- [x] Riset & penyusunan spesifikasi di `knowledge/filter-lintas-wilayah-forum-pulih.md` (penyelarasan geospasial Tab 1, 2, dan 3).
- [x] Pengkayaan dataset postingan forum di `src/data/forumPostsData.ts` (penambahan 4 postingan otentik untuk Riau, Sumsel, Kalsel, dan Jambi beserta komparasi sebelum-sesudah dan sertifikasi kader).
- [x] Peningkatan komponen `src/components/ForumFeed.tsx` (integrasi `REGION_TABS`, penghitungan badge postingan per provinsi, bilah gulir horizontal ramah sentuhan, dan strip ringkasan kontekstual).
- [x] Penyelarasan di `src/app/page.tsx` (pembacaan query param `?tab=forum&region=...` dan sinkronisasi dua arah navigasi filter antar tab).
- [x] Penyelarasan styling di `src/app/globals.css` untuk Dark Mode (Item-Ijo-Orange) dan Light Mode (Ijo-Krem).
- [x] Sinkronisasi berkas ke WSL dan verifikasi build Turbopack Next.js (lulus 0 error).
- [x] Pengujian visual filter wilayah di browser peramban.

## 19. Integrasi Live Sensor Kualitas Udara ISPU KLHK & PM2.5 (Open-Meteo / BMKG) (Selesai)
- [x] Riset & dokumentasi di `knowledge/integrasi-sensor-ispu-dan-pm25.md` (formula interpolasi linier Permen LHK No. 14/2020 & Open-Meteo Air Quality CAMS).
- [x] Pembuatan modul layanan mandiri `src/utils/airQualityService.ts` (kalkulasi baku mutu ISPU 5 kategori KLHK, fetcher Open-Meteo CAMS, cache memori geospasial, dan fallback cerdas).
- [x] Peningkatan komponen `src/components/FireHazeMap.tsx` (penambahan lencana live ISPU berdenyut di header posko, sinkronisasi dinamis KPI Card 3, dan penyesuaian parameter lembar disposisi).
- [x] Sinkronisasi lembar disposisi resmi pada `src/utils/dispatchExporter.ts` dan `src/components/DispatchModal.tsx` dengan kategori baku mutu ISPU KLHK.
- [x] Penyelarasan styling di `src/app/globals.css` (`.live-ispu-badge`, `.ispu-pulse-dot`, `.ispu-pm-label` untuk Dark Mode & Light Mode).
- [x] Sinkronisasi seluruh berkas ke WSL dan verifikasi build Next.js lulus 100% (0 error).
- [x] Pengujian visual live sensor ISPU di peramban.

## 20. Filter Status Kondisi Lahan & Vegetasi Gambut pada Feed Forum Pulih (Selesai)
- [x] Riset & dokumentasi parameter kebasahan gambut BRGM/Manggala Agni di `knowledge/filter-kondisi-lahan-forum-pulih.md`.
- [x] Pengkayaan dataset `src/data/forumPostsData.ts` dengan postingan kewaspadaan dini lahan kering (`post-kb-011` di Ketapang Kalbar) untuk memastikan seluruh 4 kategori kondisi memiliki data otentik.
- [x] Peningkatan komponen `src/components/ForumFeed.tsx`:
  - [x] Definisi `ConditionFilterKey` dan `CONDITION_TABS` (5 pilihan status: Semua, Tumbuh Subur, Lahan Basah, Perlu Rawat, Rawan Kering).
  - [x] Logika penyaringan multi-dimensi (`getSortedPosts`) yang bekerja bersamaan dengan filter wilayah dan kriteria urutan.
  - [x] Penghitungan dinamis jumlah postingan per kondisi pada wilayah aktif (`conditionCounts`).
  - [x] Komponen UI baris filter scrollable dengan bulatan warna status dan badge hitungan.
  - [x] Banner informasi multi-dimensi wilayah dan kondisi beserta tombol reset cepat ganda (`forum-banner-actions`).
  - [x] Tampilan kotak pesan interaktif saat nihil hasil pencarian (`forum-empty-box`).
- [x] Penyelarasan styling di `src/app/globals.css` (`.condition-filter-scroll-wrapper`, `.condition-tag-btn`, `.condition-color-dot`, `.condition-count-badge`, `.forum-banner-actions`, `.forum-empty-title`, `.forum-empty-desc` untuk Dark Mode & Light Mode).
- [x] Sinkronisasi seluruh berkas ke WSL dan verifikasi build Turbopack Next.js (18 halaman statis lulus 0 error).
- [x] Audit visual browser desktop dan peramban pada `http://localhost:3001/?tab=forum`.

## 21. Pembersihan Sisa Gimmick Simulasi Tab 1 & Integrasi Layer Kubah Gambut BRGM (KHG) (Selesai)
- [x] Riset & dokumentasi audit kritis di `knowledge/audit-pembersihan-gimmick-tab1.md` (identifikasi 3 kelemahan: lingkaran geser komparasi 6 jam fiktif, interval 15 menit non-polar, dan rumus luas acak `* 18.5`).
- [x] Penyusunan dataset spasial GeoJSON 7 kawasan Kesatuan Hidrologis Gambut (KHG) BRGM/KLHK prioritas di `src/data/peatHydrologicalUnitsData.ts` (SK.130/MENLHK/2017, kedalaman rata-rata kubah 2.6m - 6.5m).
- [x] Standardisasi model data di `src/types/index.ts`:
  - [x] `MapViewMode` disederhanakan menjadi `"both" | "satellite" | "haze_wind"`.
  - [x] `SatelliteTimeWindowHours` (`6 | 12 | 24` jam siklus lintas satelit).
- [x] Peningkatan komponen `src/components/FireHazeMap.tsx`:
  - [x] Eliminasi total lingkaran proyeksi fiktif `projectedCircle` `[+0.15, -0.15]` dan tombol mode `side_by_side`.
  - [x] Pengikatan metrik Luas Terbakar Harian pada Kartu KPI 2 langsung ke agregasi resmi WebGIS BNPB ArcGIS (`bnpbData.provinces.reduce`) bernilai 1.134 Ha.
  - [x] Penyesuaian bilah jendela waktu ke standar lintasan satelit: 6 Jam, 12 Jam, dan 24 Jam Terakhir.
  - [x] Implementasi render layer poligon interaktif kubah gambut KHG BRGM pada Leaflet dengan popup SK MenLHK dan zonasi lindung/budidaya.
  - [x] Tombol sakelar mandiri `Kubah Gambut BRGM` pada header peta.
  - [x] Deteksi otomatis koordinat titik api terhadap poligon KHG (ray-casting) dan penayangan lencana `Kubah Gambut BRGM` pada kartu rincian titik aktif.
  - [x] Penyesuaian legenda peta satelit murni.
- [x] Pembersihan kata "simulasi" pada tooltip pemutar linimasa di `src/components/TimeLapsePlayerDock.tsx`.
- [x] Penyelarasan styling di `src/app/globals.css` (`.btn-toggle-khg`, `.khg-dot-indicator`, `.khg-spot-indicator-box` untuk tema terang & gelap).
- [x] Sinkronisasi seluruh berkas ke WSL dan verifikasi build Turbopack Next.js (18 halaman statis lulus 0 error).
- [x] Audit visual browser desktop pada `http://localhost:3001/?tab=fire_haze` memverifikasi data satelit murni dan layer KHG.













