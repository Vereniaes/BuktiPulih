# Knowledge: Arah Visual "Jurnal Petak"
Sumber: kritik UI localhost:3001 (2026-10-14), 5 mockup referensi user, skill `impeccable`, `redesign-existing-projects`, `design-taste-frontend`, `emil-design-eng`.

## 1. DNA referensi mockup
| Referensi | Pola yang diambil | Pemetaan BuktiPulih |
|---|---|---|
| Kalender gambar harian | grid tanggal, 1 gambar per sel, anotasi tulisan tangan + panah | grid pertumbuhan per petak, 1 foto per bulan |
| Finder + polaroid | foto polaroid, titik warna tag, label huruf kecil | bukti foto dengan titik status (subur / kritis / mati) |
| Bento Keya | tab map folder, kartu ukuran campuran | filter wilayah sebagai tab folder |
| La Vie en Bleu | judul personal huruf kecil, metadata tanggal | catatan relawan bergaya jurnal |
| Cutting mat flatlay | objek meja fisik | aksen saja (selotip, klip), bukan latar penuh |

Aturan bersama: permukaan kertas hangat, gambar sebagai pembawa halaman, copy pendek orang pertama, tanggal sebagai metadata utama, panduan tulisan tangan.

## 2. Keputusan token (peran baru, nilai tetap)
- navy `#0B0D3B` -> tinta teks
- forest green `#0E753B` -> stempel / status
- pink `#FF3385` -> stabilo (maksimal 1-2 frasa per layar)
- latar -> kertas `#F6F1E7` (satu-satunya nilai baru)
- font aksen tulisan tangan: `Mansalva` (sudah tercatat di design-system-atomic.md)

## 3. Larangan (AI slop tells yang ditemukan)
- brief proposal tampil di UI (SDGs, UINIC, rubrik penilaian, nama tech stack)
- hero gelap gradient + pill badge
- 4 kartu metrik seragam dengan label kapital
- emoji sebagai ikon
- border gelap 2px di semua elemen, `border-left` sebagai aksen
- format angka campur (`82.89%` vs `4.150`), wajib `id-ID`
- keyword SEO di copy terlihat; SEO tetap di `metadata`, OG, dan HTML semantik

## 4. Suara copy
Huruf kecil, gaya jurnal / thread, sapaan "kamu", label panduan besar dan polos untuk pengguna lansia.
Contoh hero: "tahun lalu lahan ini habis terbakar. ini foto bibitnya, tiap bulan."
