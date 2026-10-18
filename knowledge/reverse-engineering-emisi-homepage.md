# Homepage BuktiPulih - referensi Emisi

Catatan riset, keputusan, dan pemeriksaan implementasi. Diperbarui: 19 Oktober 2026, WIB.

## Keputusan /grillme

- Homepage: ringkasan wilayah, peta, prakiraan lokasi, lalu tiga bukti terbaru.
- Pertahankan warna krem-hijau, Manrope, mode gelap, dan fitur portal lama.
- Perbesar peta dalam halaman yang sama; tidak menambah rute /map.
- Tambahkan prakiraan Open-Meteo dan observasi NASA FIRMS. Tidak membangun model asap.
- Tanpa commit, push, atau deployment.

## Sumber dan batas pengetahuan

- https://emisi.app/ dan https://emisi.app/map/ - HTML, CSS, dan JavaScript publik dibaca langsung. Emisi memakai Leaflet dan satu komponen peta untuk tampilan inline/fullscreen. Browser otomatis mendapat 403; kemiripan visual belum diverifikasi langsung.
- https://github.com/BennetMC2/haze-twin - referensi arsitektur publik berlisensi MIT; bukan bukti bahwa seluruh kode Emisi tersedia di repositori ini.
- https://firms.modaps.eosdis.nasa.gov/api/area/ - VIIRS NOAA-20/21, CSV, bounding box, dan tanggal UTC.
- https://firms.modaps.eosdis.nasa.gov/api/map_key/ - membutuhkan MAP_KEY khusus FIRMS, berbeda dari api.nasa.gov.
- https://open-meteo.com/en/docs/air-quality-api - PM2.5 CAMS Global adalah estimasi model; horizon lima hari.
- https://open-meteo.com/en/docs - angin 10 meter dan presipitasi per jam.
- Dokumentasi Next.js terpasang: linking/navigation, useSearchParams, CSS Modules.

Wireframe dan audit 17 Oktober di planning/ dan knowledge/ menjadi dasar identitas, aksesibilitas, dan status sumber. frontend-req dan mockup lain tidak ditemukan. Skills: anti-slop-ui-roaster dan modern-web-seo lokal; Sites untuk alur kerja lokal.

## Aturan implementasi

- Hitung petak dari dataset yang difilter, bukan ledger dengan cakupan berbeda.
- Hotspot mengikuti area peta, bukan klaim jumlah per provinsi. Jendela 6/12/24 jam adalah observasi, bukan prediksi.
- Jangan mengubah confidence VIIRS menjadi persentase buatan atau menambah radius asap/status kebakaran yang tidak diberikan sumber.
- Setiap sumber dapat gagal secara terpisah. Data contoh, cache, kosong, sebagian, dan gagal harus terlihat berbeda.
- Kunci FIRMS hanya pada environment backend. Tidak ada nilai rahasia di dokumen, log, atau frontend.
- Gunakan kembali RestorationMap, helper wilayah, layanan cuaca, serta mekanisme rincian petak/kiriman.

## Pemeriksaan

- Baseline sebelum perubahan: TypeScript frontend dan backend lulus.
- Open-Meteo: contoh permintaan lima hari mengembalikan 120 titik per jam.
- NASA live: menunggu FIRMS_MAP_KEY valid; kunci api.nasa.gov tidak digunakan.
- TypeScript frontend/backend dan kedua build produksi lulus.
- Backend `npm run test:hotspots`: 9 pengujian lulus. Mencakup CSV kosong yang valid, respons rusak, confidence kategoris, deduplikasi rekaman lengkap, batas UTC, validasi bbox, cache, permintaan identik, kegagalan satu satelit/429, jaringan, dan kunci hilang.
- Frontend `npm run test:homepage`: 6 pengujian lulus. Mencakup null, nol yang valid, respons rusak, WIB, kegagalan penyedia terpisah, cache, serta waktu pengambilan asli.
- Browser Chromium: homepage tidak overflow pada 320, 360, 390, 768, dan 1440 px dalam kedua tema. Navigasi dan zoom peta minimal 44 px. Label grafik ponsel diperbesar setelah inspeksi gambar.
- Perbesar/Tutup/Escape mempertahankan instance Leaflet, pusat peta, pilihan hotspot/petak, posisi gulir, dan fokus. `invalidateSize` memakai pan bawaan tanpa animasi agar pusat geografis tetap sama.
- URL wilayah/tab, refresh, Back/Forward, tautan fire/recovery/forum, pergantian wilayah cepat, rincian forum, dan dialog ekspor lulus.
- Login/logout, unggah, pembuatan bukti lokal, serta komentar lulus dengan seluruh permintaan tulis dialihkan ke fixture dalam browser terisolasi. Tidak menulis ke layanan produksi. Pengunduhan hasil ekspor dan layanan penyimpanan unggahan produksi tidak diuji end-to-end.
- Keadaan kosong layanan, NASA gagal/sebagian/tersimpan, dan kegagalan PM2.5 tanpa mematikan prakiraan angin lulus. Tidak ada galat JavaScript pada rangkaian browser.
- Endpoint backend tanpa database: bbox valid tanpa kunci menghasilkan 503 `FIRMS_NOT_CONFIGURED`; bbox rusak menghasilkan 400 `INVALID_BOUNDS`.

## Susunan perubahan

- `src/app/page.tsx` membungkus `PortalClient` dengan Suspense. URL menjadi sumber tab/wilayah; Beranda menjadi pilihan awal. Handler kontribusi lama tetap dipakai.
- `src/components/home/` menyimpan ringkasan, kendali peta, grafik SVG/tabel, dan CSS khusus homepage. Header bersama tetap menampilkan semua tujuan pada ponsel.
- `RestorationMap` memakai satu instance Leaflet dan dua layer terpisah. Permintaan bbox ditunda 300 ms serta dibatalkan saat pilihan berubah.
- `src/utils/hourlyForecast.ts` dipakai oleh layanan cuaca dan kualitas udara. Cache dibatasi 64 lokasi selama 15 menit, tanpa mengganti nilai hilang dengan angka buatan.
- `src/utils/forumDisplay.ts` memindahkan helper pengurutan lama agar forum dan bukti homepage menggunakan aturan yang sama. Kiriman lokal dibuka melalui modal yang sudah ada.
- Backend `src/modules/hotspots/` menambah adaptor dan route, tanpa migrasi database. Dua sumber dan dua tanggal UTC mencakup 24 jam berjalan. Cache lengkap 15 menit; data sebagian dicoba ulang setelah satu menit. Cache lama maksimal 24 jam tersedia saat pembaruan gagal, dengan timestamp aslinya.
- Cakupan BNPB tetap tingkat provinsi. Pilihan Bekasi menampilkan label Jawa Barat untuk angka BNPB; petak dihitung dari hasil penyaringan dataset, tanpa memakai total ledger.

## Menjalankan dan meninjau

1. Backend: jalankan `npm run test:hotspots`, `npx tsc --noEmit`, dan `npm run build` dari `bukti-pulih-be`.
2. Frontend: jalankan `npm run test:homepage`, `npx tsc --noEmit`, dan `npm run build` dari `BuktiPulih`.
3. Jalankan frontend lokal pada port 3002, lalu `python3 tests/homepage.browser.py` dari frontend. Membutuhkan Python Playwright dan Chromium. Port lain dapat dipilih melalui `QA_BASE_URL`.
4. Hasil terperinci: [checks.json](emisi-homepage-qa/checks.json). Gambar `home-*` dan `map-expanded-mobile.png` menggunakan fixture NASA/prakiraan untuk menguji antarmuka, bukan observasi satelit live. Gambar `homepage-live-*` memakai layanan asli serta status kegagalan yang sebenarnya.
5. Isi `FIRMS_MAP_KEY` pada environment backend secara lokal, lalu restart backend untuk pengujian live. Contoh konfigurasi tanpa rahasia tersedia pada `bukti-pulih-be/.env.example`. Jangan menggunakan kunci api.nasa.gov sebagai penggantinya.

## Batas hasil dan masalah lama

- NASA live belum dapat diverifikasi karena MAP_KEY FIRMS belum tersedia. Implementasi dan pengujian fixture selesai; pemeriksaan kredensial serta observasi live tetap terbuka.
- Tab Karhutla lama masih memiliki lebar dokumen 467 px pada viewport 390 px. Audit 17 Oktober sudah mencatat overflow 481 px pada tab tersebut. Pemulihan dan Forum berukuran 390 px pada pengujian yang sama. Perombakan konten Karhutla tidak masuk perubahan ini.
- Node 20.18 bawaan lingkungan dapat membangun backend tetapi startup aplikasi lama terhambat ketergantungan ESM `sanitize-html`. Uji HTTP backend dilakukan dengan Node 24.22.0 yang tersedia, tanpa mengubah dependensi lama atau menyalakan pekerjaan terjadwal.
- Build Next.js menampilkan peringatan lockfile di luar repositori. Preview melalui skrip start lama juga memperingatkan konfigurasi standalone. Kedua peringatan tidak menggagalkan build maupun rangkaian browser.
- Tidak ada commit, push, deployment, atau perubahan rahasia. Perubahan lokal yang sudah ada dipertahankan.
