# Spesifikasi Fitur 3: Formulir Pelaporan Lapangan (Kader-Friendly Form)
**Platform BuktiPulih — Pemantauan Hasil Restorasi Pasca-Karhutla**

---

## 1. Insight & Urgensi Masalah Lapangan
Kader pemantau dan kelompok tani yang turun ke lapangan pasca-karhutla menghadapi kondisi kerja yang ekstrem:
- Berada di bawah terik matahari langsung dengan layar ponsel redup/silau.
- Menggunakan sarung tangan lapangan sehingga sulit mengetik teks panjang di keyboard virtual kecil.
- Ponsel berspesifikasi rendah (*RAM 2-3GB*) dan koneksi internet 3G/Edge yang sering terputus di pedalaman gambut.
- Formulir konvensional yang panjang dan penuh istilah teknis bahasa asing (seperti *geo-tagging coordinates* atau *vegetation index*) terbukti gagal digunakan oleh pengguna lanjut usia (*boomers*).

---

## 2. Rincian Fitur & Expected Behavior

### A. Alur Kerja Formulir Langkah demi Langkah (Wizard Flow)
Formulir dirancang sebagai alur 4 langkah berurutan (*step-by-step*) dengan satu aksi per layar:

1. **Langkah 1: Identifikasi Lokasi & Petak Pohon**
   - Mengambil titik koordinat GPS perangkat secara otomatis melalui HTML5 Geolocation.
   - Menampilkan indikator status GPS sederhana:
     - 🟢 **Sinyal GPS Akurat** (akurasi < 15 meter).
     - 🟡 **Sinyal Cukup** (akurasi 15–50 meter).
     - 🔴 **GPS Belum Aktif** (tombol besar: *"Aktifkan Lokasi"*).
   - Memilih nama petak dari dropdown dengan tulisan besar atau tombol radio petak terdekat.

2. **Langkah 2: Ambil Foto Bukti Tanaman**
   - Menekan tombol besar: **[ 📷 BUKA KAMERA & AMBIL FOTO ]** yang langsung memicu kamera belakang HP (`<input type="file" accept="image/*" capture="environment">`).
   - Pratinjau foto langsung muncul di layar.
   - **Kompresi Otomatis di Browser:** Skrip Canvas langsung mengecilkan gambar ke lebar 1280px dan kompresi WebP (~150KB) tanpa menghabiskan kuota atau membuat ponsel membeku (*freeze*).

3. **Langkah 3: Pilih Kondisi Tanaman (3 Tombol Raksasa)**
   Kader tidak perlu mengetik, cukup menekan salah satu dari 3 tombol pilihan visual berukuran besar:
   - 🟩 **[ 🌿 HIJAU SUBUR ]** (Tunas tumbuh baik, daun segar).
   - 🟨 **[ 🍂 PERLU DIRAWAT ]** (Tanah kering / daun layu kekuningan).
   - 🟥 **[ 🥀 BIBIT MATI ]** (Batang mengering / terkena hama).

4. **Langkah 4: Pengukuran Sederhana & Catatan**
   - Input angka tinggi pohon (cm) dengan tombol plus-minus (+ / -) berukuran besar agar mudah ditekan tanpa keyboard.
   - Kolom catatan lapangan singkat: Tersedia opsi saran klik-cepat (*quick tags*): `[Tanah Kering]`, `[Saluran Air Normal]`, `[Ada Hama]`.

5. **Langkah 5: Kirim atau Simpan Draft Offline**
   - Jika ada internet: Laporan langsung terkirim.
   - Jika sinyal mati di tengah hutan: Laporan otomatis tersimpan di memori peramban (*IndexedDB*) dengan notifikasi: *"Tersimpan di HP. Laporan akan dikirim otomatis saat ada sinyal."*

---

## 3. Penempatan UI & Layout Wireframe

### A. Filosofi Visual (Japanese Functional Layout)
- Satu kolom vertikal tunggal (*single-column centered*), lebar maksimum 540px.
- Tinggi tombol aksi minimal **56px**, teks tombol berukuran **18px bold**.
- Warna teks hitam pekat (`#1A202C`) di atas kontainer putih dengan batas abu-abu tegas (`#CBD5E0`).
- Progress indicator jelas di bagian atas: `Langkah 1 dari 4`.

### B. Layout Wireframe
```
+-------------------------------------------------------+
| < Kembali ke Menu          LANGKAH 2 DARI 4           |
| FORMULIR PEMANTAUAN POHON                             |
+-------------------------------------------------------+
| LOKASI TERDETEKSI:                                    |
| 🟢 Desa Kubu Raya, Petak Gambut #04 (Akurat 8 meter)  |
+-------------------------------------------------------+
| FOTO KONDISI POHON TERBARU:                           |
| +---------------------------------------------------+ |
| |                                                   | |
| |        [ KOTAK PRATINJAU FOTO LAPANGAN ]          | |
| |                                                   | |
| +---------------------------------------------------+ |
| [ 📷 AMBIL FOTO ULANG ]                               |
+-------------------------------------------------------+
| BAGAIMANA KONDISI BIBIT SAAT INI?                     |
|                                                       |
| [  (O)  🌿 HIJAU SUBUR (Tumbuh Baik)               ]  |
|                                                       |
| [  ( )  🍂 PERLU DIRAWAT (Kering / Butuh Air)      ]  |
|                                                       |
| [  ( )  🥀 BIBIT MATI (Kering Total)               ]  |
+-------------------------------------------------------+
| TINGGI BIBIT:                                         |
| [  -  ]         85 cm         [  +  ]                 |
+-------------------------------------------------------+
| [   SIMPAN DAN KIRIM LAPORAN SEKARANG ➔             ] |
+-------------------------------------------------------+
```

---

## 4. Kebutuhan Backend (BE Requirements & MongoDB Schema)

### A. Skema Koleksi MongoDB (`reports_inbox`)
```javascript
// Collection: reports_inbox
{
  "_id": ObjectId("..."),
  "reporter_id": ObjectId("..."),
  "reporter_name": "Pak Suwardi",
  "plot_id": ObjectId("..."),
  "tree_condition": "subur", // "subur" | "perlu_rawat" | "mati"
  "height_cm": 85,
  "photo_storage_path": "reports/2026/10/PL-KALBAR-001-uuid.webp",
  "photo_url": "https://storage.googleapis.com/.../PL-KALBAR-001-uuid.webp",
  "gps": {
    "latitude": -0.02241,
    "longitude": 109.33318,
    "accuracy": 8.5
  },
  "device_client_timestamp": ISODate("2026-10-13T09:15:00Z"),
  "server_received_at": ISODate("2026-10-13T09:15:02Z"),
  "quick_tags": ["Saluran Air Normal"],
  "notes": "Parit gambut masih basah, daun bertambah banyak.",
  "verification_status": "published", // "published" | "pending_review" | "rejected"
  "is_offline_sync": false
}
```

### B. Spesifikasi API Endpoint
- `POST /api/v1/reports`
  - Content-Type: `multipart/form-data`
  - Fields: `plot_id`, `tree_condition`, `height_cm`, `latitude`, `longitude`, `accuracy`, `notes`, `file` (image).
  - Validasi Payload: Ukuran file foto maksimal 1MB (setelah kompresi klien).
  - Response: `{ status: "success", report_id: "...", message: "Laporan berhasil dicatat!" }`

---

## 5. Penanganan Keamanan Siber (Cybersecurity)

1. **Validasi Anti-Spoofing Lokasi (Anti-Fraud Geotag):**
   - Backend memverifikasi koordinat GPS yang dikirimkan klien terhadap poligon batas petak (*geofencing check* di MongoDB dengan operator `$geoIntersects`). Jika koordinat berada 50 kilometer di luar petak yang diklaim, laporan otomatis ditandai untuk peninjauan manual (*flagged for fraud*).
2. **Pembersihan Metadata EXIF Sensitif (Privacy Stripping):**
   - Sebelum foto disimpan ke Google Cloud Storage, server membuang metadata EXIF kamera (seperti nomor seri perangkat, nama pemilik HP, dan data sensor pribadi) guna melindungi privasi kader lapangan.
3. **Pemeriksaan File & Magic Bytes (Anti-Malware Upload):**
   - Server tidak hanya memeriksa ekstensi file, melainkan memverifikasi *Magic Bytes* (header file biner) untuk memastikan berkas benar-benar berupa citra WebP/JPEG/PNG, bukan skrip executable (`.php`, `.sh`, `.exe`) yang disamarkan.
4. **Proteksi Unggahan Berulang (Throttling & Idempotency):**
   - Terapkan batas pengiriman (maksimal 10 laporan per jam per akun kader) guna mencegah spam bot atau pengiriman data ganda akibat sinyal seluler yang tersendat-sendat (*retry storm*).

---

## 6. To-Do Checklist Fitur 3
- [ ] Buat skrip kompresi gambar berbasis HTML5 Canvas di sisi klien (WebP ~150KB).
- [ ] Buat antarmuka formulir 4 langkah dengan tombol kontrol berukuran besar (56px touch target).
- [ ] Implementasikan integrasi HTML5 Geolocation dengan indikator akurasi sinyal.
- [ ] Buat endpoint `POST /api/v1/reports` lengkap dengan validasi Magic Bytes dan sanitasi EXIF.
- [ ] Tambahkan mekanisme penyimpanan draft di `IndexedDB` untuk mendukung pelaporan saat koneksi terputus.
