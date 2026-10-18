# BRD - BuktiPulih: ringkasan wilayah

Dokumen ini menetapkan fungsi utama dan batas perbaikan UI/UX BuktiPulih.

Tanggal: 17 Oktober 2026, WIB. Status: arah produk disetujui; rincian rancangan merupakan usulan untuk ditinjau. Implementasi belum dilakukan.

Tindak lanjut: pengguna memilih pembuatan wireframe melalui `/grillme`. [Wireframe versi 1](wireframes/ringkasan-wilayah/README.md) tersedia untuk desktop, ponsel, dan keadaan tanpa data. Pemilihan ini belum merupakan persetujuan implementasi UI.

## 1. Fokus produk

**BuktiPulih membantu masyarakat melihat kondisi karhutla, perkembangan pemulihan, dan bukti terbaru pada wilayah yang dipilih.**

Hasil utama: informasi penting ditemukan dengan cepat. Alur utama:

**Pilih wilayah → baca ringkasan → buka bukti atau rincian.**

Keputusan melalui `/grillme`:

- Tujuan: menemukan informasi utama dengan cepat.
- Arah: ringkasan per wilayah, menggabungkan karhutla, pemulihan, dan bukti terbaru.
- Gaya: sederhana, teks langsung, tanpa slogan dan penjelasan tambahan yang tidak membantu tugas.

## 2. Masalah yang diselesaikan

Saat ini informasi satu wilayah tersebar pada tiga tab. Halaman awal mengutamakan kontrol peta, istilah teknis, dan ringkasan lintas wilayah. Foto perkembangan muncul setelah peta dan sejumlah panel. Sumber, waktu, serta cakupan angka belum selalu jelas.

Audit 17 Oktober menemukan menu ponsel berukuran 0 × 0 px, lebar halaman pemulihan 1.200 px pada viewport 390 px, dan perpindahan tab yang tidak memperbarui URL. Kondisi ini menghambat penemuan informasi meskipun komponen sudah tersedia. Bukti dan batas pengujian: [audit UI/UX](../knowledge/ui-ux-audit-2026-10-17.md).

## 3. Pengguna dan nilai

| Prioritas | Pengguna | Kebutuhan | Nilai produk |
|---|---|---|---|
| Utama | Masyarakat yang memeriksa wilayah | Mengetahui kondisi, tanggal data, dan bukti yang mendukungnya | Memahami informasi tanpa mempelajari dashboard teknis |
| Pendukung | Warga dan relawan lapangan | Membaca serta menambahkan bukti pada lokasi yang tepat | Perkembangan lapangan terdokumentasi |
| Lanjutan | Pengelola dan pemeriksa | Membuka riwayat, sumber, dan rincian spasial | Menelusuri dasar informasi |

Segmentasi mengacu pada dokumen proyek, belum merupakan hasil wawancara pengguna baru. Prioritas membaca mengikuti keputusan sesi ini. Pengujian dengan masyarakat dan relawan masih diperlukan.

## 4. Tiga opsi yang dipertimbangkan

| Opsi | Susunan awal | Kelebihan | Konsekuensi | Keputusan |
|---|---|---|---|---|
| 1. Ringkasan wilayah | Wilayah, kondisi karhutla, pemulihan, bukti terbaru | Menyatukan konteks; sesuai tujuan menemukan informasi | Memerlukan penyelarasan wilayah, cakupan, dan sumber antarbagian | Dipilih |
| 2. Bukti pemulihan | Foto perkembangan dan daftar petak | Identitas pemulihan lebih kuat; bukti visual segera terlihat | Pantauan karhutla perlu dibuka terpisah | Alternatif |
| 3. Pantauan karhutla | Kondisi karhutla dan peta | Cocok untuk pemeriksaan spasial yang sering dilakukan | Informasi teknis dan kepastian sumber menjadi tuntutan utama | Alternatif |

## 5. Lingkup perubahan pertama

**Termasuk:**

- Halaman ringkasan wilayah sebagai pintu masuk.
- Satu pemilih wilayah yang berlaku pada ringkasan dan bukti terkait.
- Kondisi karhutla, pemulihan, dan bukti terbaru dengan cakupan yang jelas.
- Rincian peta dan sumber yang mudah dibuka.
- Tautan yang mempertahankan wilayah dan halaman ketika dibagikan atau dimuat ulang.
- Perbaikan navigasi ponsel, lebar halaman, keterbacaan, serta teks antarmuka.
- Penandaan data contoh, data lama, estimasi, dan kegagalan pemuatan.

**Di luar perubahan pertama:** layanan baru, sistem akun baru, desain ulang backend menyeluruh, platform media sosial baru, analitik produksi baru, simulasi baru, perubahan metode ilmiah, deployment, commit, dan push.

Unggah, komentar, verifikasi, ekspor, dan mode gelap yang sudah tersedia harus tetap dapat dijangkau. Perubahan penyimpanan atau autentikasi memerlukan lingkup tersendiri. Klaim keberhasilan publikasi harus mengikuti penyimpanan yang benar-benar terjadi.

## 6. Susunan informasi yang diusulkan

Halaman awal menampilkan daftar ringkas wilayah yang memiliki data, dengan pemilih wilayah di atasnya. Pemilihan satu wilayah memperlihatkan tiga bagian berikut, tanpa mewajibkan interaksi peta.

```text
BuktiPulih                     Wilayah   Bukti   Kirim bukti

Wilayah
[Semua wilayah / wilayah terpilih]

Karhutla
[kondisi atau jumlah] · [tanggal data] · [sumber]

Pemulihan
[petak terpantau dan kondisi] · [tanggal pemeriksaan]

Bukti terbaru
[foto] [lokasi] [tanggal] [status pemeriksaan]
       [catatan singkat]                 Lihat bukti

Lihat peta                              Sumber data
```

Kerangka ini menggambarkan urutan informasi, bukan mockup yang telah disetujui. Label navigasi masih dapat disesuaikan tanpa mengubah alur utama. Pada ponsel, gunakan satu kolom. Pada desktop, tambahan ruang digunakan untuk membaca dan membandingkan wilayah, bukan menambah widget.

- **Karhutla:** tampilkan angka atau kondisi yang didukung sumber, lokasi, dan periode. Jangan menjadikan jumlah titik panas sebagai status darurat resmi secara otomatis.
- **Pemulihan:** tampilkan petak terpantau dan hasil pemeriksaan. Bibit hidup atau foto hijau saja tidak cukup untuk menyatakan seluruh lahan telah pulih.
- **Bukti terbaru:** tampilkan foto, lokasi, tanggal pengamatan, dan status pemeriksaan. Riwayat enam bulan berada di rincian petak.
- **Peta:** dibuka lewat `Lihat peta`; daftar wilayah tetap tersedia jika peta lambat atau gagal.
- **Rincian lanjutan:** lapisan gambut, cuaca, ekspor, riwayat pemeriksaan, dan kontrol teknis ditempatkan sesuai konteks.

Informasi sumber, usia data, dan status verifikasi tetap terlihat. Pengurangan teks tidak boleh menghapus konteks yang menentukan arti informasi. Pemisahan informasi utama dan rincian mengikuti prinsip [progressive disclosure NN/g](https://www.nngroup.com/articles/progressive-disclosure/).

## 7. Kebutuhan dan kriteria penerimaan

| ID | Prioritas | Kebutuhan | Diterima jika |
|---|---|---|---|
| BR-01 | Wajib | Informasi dapat dibaca tanpa masuk akun | Pilih wilayah, baca ringkasan, dan buka bukti tidak meminta login |
| BR-02 | Wajib | Satu konteks wilayah | Karhutla, pemulihan, dan bukti mengikuti pilihan yang sama; cakupan berbeda disebutkan |
| BR-03 | Wajib | Ringkasan langsung | Pada 390 × 844 px, pemilih wilayah dan ringkasan kondisi muncul sebelum pengantar atau kontrol lanjutan |
| BR-04 | Wajib | Bukti terbaru mudah dicapai | Dari ringkasan, bukti sesuai wilayah dapat dibuka dalam maksimal dua aktivasi navigasi |
| BR-05 | Wajib | Informasi dapat ditelusuri | Setiap angka memiliki sumber, cakupan, waktu pengamatan atau pembaruan, dan satuan bila relevan |
| BR-06 | Wajib | Status data jujur | Data contoh, estimasi, tersimpan, kosong, dan gagal dibedakan; kegagalan tidak berubah menjadi angka nol |
| BR-07 | Wajib | Verifikasi berdasarkan rekam pemeriksaan | Lencana diperlihatkan hanya bila pemeriksa, waktu, dan dasar pemeriksaan tersedia; label warga/kader tidak otomatis berarti bukti valid |
| BR-08 | Wajib | Tautan stabil | Refresh, Back, Forward, dan membuka tautan di tab baru mempertahankan halaman serta wilayah; tautan petak mempertahankan petak |
| BR-09 | Wajib | Peta tidak menghalangi membaca | Ringkasan dan bukti tetap tersedia saat tile peta gagal; kegagalan peta memiliki pesan dan tindakan yang jelas |
| BR-10 | Wajib | Tata letak ponsel berfungsi | Tidak ada overflow horizontal halaman pada 320, 360, 390, dan 768 px; navigasi memiliki area sentuh yang terlihat |
| BR-11 | Wajib | Teks ringkas dan bermakna | Label konsisten; tanpa istilah backend, slogan berulang, nama gaya referensi, atau klaim teknis yang tidak diperlukan |
| BR-12 | Wajib | Jalur lama tetap berfungsi | Parameter tab lama, detail forum, unggah, komentar, dan filter tidak kehilangan fungsi setelah perubahan navigasi |
| BR-13 | Berikutnya | Pemeriksaan lanjutan tetap tersedia | Riwayat lengkap, ekspor, dan lapisan peta dapat dijangkau dari rincian yang relevan |

Kebutuhan ini merupakan target rancangan, bukan pernyataan bahwa implementasi saat ini sudah memenuhinya.

## 8. Aturan data

- Gunakan waktu observasi sebagai dasar `Terbaru`. Waktu pengambilan oleh aplikasi dicatat terpisah.
- Tampilkan tanggal lengkap ketika usia data penting. Jangan menyimpan teks `1 jam yang lalu` sebagai nilai tetap.
- Ringkasan wilayah harus menggunakan kumpulan data dan periode yang sama. Jangan mencampur total nasional dengan hasil filter tanpa label.
- Jika satu wilayah tidak memiliki data karhutla tetapi memiliki catatan pemulihan, tampilkan `Data karhutla belum tersedia`. Jangan menyimpulkan wilayah aman.
- Data model kualitas udara diberi label `Estimasi` beserta penyedianya. Perhitungan internal bukan pembacaan sensor resmi.
- Untuk dataset contoh, tampilkan `Data contoh`. Untuk salinan observasi terdahulu yang dapat ditelusuri, tampilkan `Data tersimpan` dan tanggal asal.
- Batas kedaluwarsa ditetapkan per sumber setelah jadwal pembaruan diketahui. Hindari satu ambang waktu buatan untuk seluruh sumber.
- Label `Terverifikasi` memerlukan bukti pemeriksaan. Keaslian foto dan sertifikat pada dataset lokal belum dibuktikan oleh audit ini.

Pembedaan model dan sensor merujuk pada [dokumentasi Open-Meteo](https://open-meteo.com/en/docs/air-quality-api). Arti deteksi panas perlu mengikuti [penjelasan NASA FIRMS](https://forum.earthdata.nasa.gov/viewtopic.php?t=5191).

## 9. Arah visual dan teks

Pertahankan latar krem, aksen hijau, tipografi yang sudah tersedia, foto perkembangan, dan garis pemisah tipis. Gunakan warna peringatan hanya untuk kondisi yang didukung data. Utamakan lokasi, kondisi, dan tanggal sebelum profil pengirim serta metrik sosial.

| Teks saat ini | Usulan |
|---|---|
| Pantau Karhutla & WebGIS Satelit BNPB | Karhutla |
| Peta Kawasan Pemulihan & Sekat Kanal Gambut | Pemulihan |
| Forum Pulih: Catatan Partisipasi Lapangan | Bukti terbaru |
| + posting bukti / Posting Bukti Baru | Kirim bukti |
| lihat catatan petak ini | Lihat bukti petak |
| Survival Rate Rata-rata | Bibit hidup (%) |
| lahan pasca-karhutla dalam rehabilitasi terverifikasi | Hapus pengantar; tampilkan status pada objek yang diperiksa |
| sisanya kami catat juga | Hapus |
| Zero-Cost OpenStreetMap & Cloud Architecture | Hapus dari UI |

Ini adalah daftar usulan untuk rancangan berikutnya. Teks error tetap menyebut masalah dan tindakan, misalnya `Foto gagal diunggah. Coba lagi.` Pedoman menulis mengikuti [GOV.UK](https://www.gov.uk/service-manual/design/writing-for-user-interfaces).

Standar rancangan: teks isi sekitar 16 px; target sentuh kontrol utama 44–48 px; fokus keyboard terlihat; satu judul utama yang jelas; warna disertai teks. Target produk 44–48 px lebih besar daripada minimum WCAG 2.2 AA 24 × 24 px yang memiliki pengecualian. Teks normal perlu rasio kontras minimal 4,5:1, termasuk mode gelap. Acuan: [target sentuh](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [kontras](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), dan [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

## 10. Ukuran keberhasilan

Target berikut masih berupa usulan. Kecepatan pengguna belum memiliki baseline dan belum diuji.

| Ukuran | Target awal | Cara memeriksa |
|---|---|---|
| Menemukan kondisi wilayah | Sedikitnya 4 dari 5 peserta selesai dalam 15 detik setelah konten siap, tanpa bantuan | Beri nama wilayah; minta kondisi dan tanggal datanya |
| Membuka bukti yang sesuai | Sedikitnya 4 dari 5 peserta menemukan bukti dalam 30 detik | Mulai dari halaman ringkasan; catat salah arah |
| Mengenali status data | Sedikitnya 4 dari 5 peserta membedakan data contoh, estimasi, dan observasi | Tampilkan contoh berlabel dengan pertanyaan yang sama |
| Navigasi ke bukti | Maksimal dua aktivasi dari ringkasan wilayah | Uji alur dengan data yang memiliki lebih dari satu petak |
| Tata letak | Nol overflow horizontal halaman pada empat lebar uji | Ukur scrollWidth dan periksa visual |
| Tautan dan konteks | Semua skenario refresh, Back/Forward, dan tab baru mempertahankan konteks | Uji wilayah, petak, dan detail bukti |
| Data gagal dimuat | Semua skenario menampilkan keadaan yang benar | Simulasikan API gagal, data kosong, sumber lama, dan peta gagal |

Lima peserta dipakai untuk putaran evaluasi awal, bukan klaim statistik populasi. Sampel perlu mencakup pengguna ponsel dengan pengalaman digital beragam. Waktu muat jaringan diukur terpisah dari waktu menemukan informasi. Belum ada hasil uji performa produksi.

## 11. Dampak ke bagian lain

| Bagian | Dampak yang perlu dijaga |
|---|---|
| Navigasi dan URL | Tab lama masih dapat dibuka; konteks wilayah dan petak tidak hilang |
| Peta | Tetap memakai komponen yang ada; ukuran diinisialisasi ulang saat panel ditampilkan |
| Ringkasan angka | Angka harus sesuai filter; jangan mengubah rumus atau menggabungkan sumber tanpa definisi |
| Forum | Bukti tetap menuju halaman detail; komentar dan unggah dapat dijangkau; urutan default berdasarkan tanggal |
| Sumber data | Status dan tanggal harus diteruskan ke UI; perubahan kontrak hanya jika data yang diperlukan belum tersedia |
| CSS dan tema | Perubahan selector bersama dapat memengaruhi tiga tab, modal, dan detail; uji terang serta gelap |
| Penyimpanan bukti | Alur publikasi saat ini bergantung pada penyimpanan lokal; jaminan akses lintas perangkat memerlukan pekerjaan layanan tersendiri |

Peta komponen dan risiko teknis tersedia dalam [audit](../knowledge/ui-ux-audit-2026-10-17.md). Gunakan helper serta komponen yang sudah ada. Hindari menambah design system atau framework baru untuk perubahan ini.

## 12. Urutan pekerjaan berikutnya

1. Tinjau BRD dan pilih lingkup tahap berikutnya melalui `/grillme`.
2. Buat satu wireframe ponsel dan satu desktop untuk ringkasan wilayah, termasuk keadaan tanpa data.
3. Ukur waktu penemuan informasi pada tampilan lama dan wireframe.
4. Perbaiki navigasi, overflow, dan label status data pada lingkup yang disetujui.
5. Susun ulang halaman dengan komponen yang tersedia; pertahankan tautan dan fungsi lama.
6. Uji regresi dan ulangi evaluasi tugas pengguna.

Ketergantungan terbuka: lokasi `frontend-req` dan mockup lama; kepastian asal dataset serta foto; definisi status pemulihan; jadwal pembaruan tiap sumber; kebutuhan penyimpanan publik lintas perangkat. Hal-hal tersebut tidak menghalangi penyusunan wireframe, tetapi membatasi klaim data pada implementasi.
