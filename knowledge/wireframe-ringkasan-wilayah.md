# Dasar wireframe ringkasan wilayah

Catatan ini menyimpan dasar rancangan dan sumber untuk wireframe 17 Oktober 2026.

## Keputusan

Pengguna memilih wireframe ponsel dan desktop berdasarkan [BRD](../planning/brd-ringkasan-wilayah.md). Pilihan sebelumnya tetap berlaku: menemukan informasi dengan cepat melalui ringkasan per wilayah. Rancangan: [wireframe versi 1](../planning/wireframes/ringkasan-wilayah/README.md).

Artefak dibuat sebagai SVG dan PNG karena tahap ini meninjau urutan serta kepadatan informasi. Tidak ada server, layanan, framework, gambar AI, atau koneksi eksternal baru yang diperlukan. Skill dokumentasi dan panduan lokal `anti-slop-ui-roaster` digunakan; temuan yang relevan dari audit sebelumnya tetap menjadi dasar.

## Sumber yang diperiksa

| Sumber | Dasar | Penerapan pada rancangan |
|---|---|---|
| [GOV.UK - Making prototypes](https://www.gov.uk/service-manual/design/making-prototypes) | Bentuk prototipe dipilih sesuai hal yang hendak ditinjau; prototipe membantu mengevaluasi sebelum pembangunan | Gambar statis untuk menyepakati susunan; interaksi dan waktu penyelesaian tugas belum diklaim teruji |
| [NN/g - Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Prioritaskan informasi yang sering dibutuhkan dan sediakan jalan jelas menuju rincian | Wilayah, ringkasan, lalu bukti; peta serta sumber tetap mudah ditemukan |
| [W3C - Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Kontrol perlu area yang dapat diaktifkan; ukuran AA minimum 24 × 24 px memiliki pengecualian | Rancangan menggunakan target produk sedikitnya 44 × 44 px untuk kontrol utama |

Sumber diperiksa pada 17 Oktober 2026. Susunan yang diusulkan merupakan penerapan pada kebutuhan proyek, bukan hasil penelitian pengguna BuktiPulih. Nilai pada frame hanya data contoh; kondisi riil dan verifikasi lapangan belum dinilai.

## Dampak yang perlu diperiksa pada tahap implementasi

- Pemilihan wilayah harus memperbarui seluruh ringkasan, bukan hanya peta.
- Membuka bukti harus menjaga konteks petak dan wilayah; audit sebelumnya menemukan kode petak terabaikan.
- Peta yang baru terlihat setelah dibuka memerlukan penyesuaian ukuran kontainernya.
- Jalur tiga tab lama dan detail forum tetap perlu tersedia agar tautan lama berfungsi.
- Label penyedia, tanggal observasi, serta status data harus mengikuti hasil nyata. Pemangkasan teks tidak boleh menyembunyikan keadaan fallback.
- Tidak ada perubahan alur kiriman, komentar, ekspor, autentikasi, atau penyimpanan yang dilakukan melalui artefak ini.

`frontend-req` serta mockup lama masih belum ditemukan. Wireframe versi 1 didasarkan pada keputusan sesi, dokumen proyek, dan inspeksi aplikasi yang tercatat dalam [audit](ui-ux-audit-2026-10-17.md).
