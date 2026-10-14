# Spesifikasi Fitur 2: Timeline Partisipasi Relawan (Instagram Notes Collage)
**Platform BuktiPulih — Pemantauan Hasil Restorasi Pasca-Karhutla**

---

## 1. Insight & Urgensi Masalah Lapangan
Laporan reboisasi saat ini umumnya berupa dokumen PDF tebal atau tabel kaku yang jarang dibuka oleh donatur dan publik. Akibatnya:
- Tidak ada kedekatan emosional antara donatur perkotaan dengan petani/kader lapangan.
- Muncul keraguan publik apakah bibit benar-benar dirawat setelah acara seremoni tanam selesai.
- Dibutuhkan format komunikasi visual yang segar: menggabungkan **keaslian catatan lapangan fisik** (*field notebook / bulletin board*) dengan **kemudahan konsumsi linimasa Instagram Notes/Collage**.

---

## 2. Rincian Fitur & Expected Behavior

### A. Alur Kerja Fitur
1. Publik membuka tab **Linimasa Pulih**.
2. Sistem menyajikan kartu-kartu pembaruan berkala yang disusun secara kronologis terbaru (*reverse chronological*).
3. Setiap kartu pembaruan memuat:
   - **Perbandingan Visual (Before vs After):** Foto saat pertama kali ditanam berdampingan dengan foto kondisi terkini (misal: Bulan ke-1 vs Bulan ke-6).
   - **Kartu Catatan Relawan (Notes Collage):** Blok catatan bergaya memo/kertas tempel berisi kondisi riil tanaman (tinggi bibit, kondisi daun, kondisi tanah gambut).
   - **Cap Pos Verifikasi (Postmark Geotag):** Tanggal inspeksi, petak lokasi, dan koordinat ringkas.
   - **Lencana Relawan Terdaftar:** Menampilkan nama kader lokal dengan tanda centang hijau tanda akun terverifikasi.
4. **Verifikasi & Dukungan Warga (Forum Partisipasi):**
   - Warga dan donatur dapat memberikan tanggapan: tombol cepat *"Terverifikasi Subur 🌿"* atau *"Perlu Dicek Ulang ⚠️"*.
   - Kolom komentar publik untuk menyemangati atau menanyakan perkembangan spesifik.
5. Tombol muat data menggunakan pola **"Tampilkan Catatan Sebelumnya"** (eksplisit dan tidak menggunakan *infinite scroll* otomatis yang membingungkan pengguna lanjut usia).

---

## 3. Penempatan UI & Layout Wireframe

### A. Filosofi Visual (Japanese Bulletin Board x Instagram Notes)
- Menggunakan latar belakang kertas terang bertekstur bersih (`#F7FAFC`).
- Kartu linimasa berbingkai tegas (`1.5px solid #2D3748`) dengan aksen label stiker warna pastel (Kuning Memo `#FEFCBF`, Hijau Daun `#C6F6D5`, Merah Perhatian `#FED7D7`).
- Tipografi judul kartu menggunakan sans-serif tebal 18px-20px dengan jarak baris lapang (*line-height 1.6*).

### B. Layout Wireframe
```
+------------------------------------------------------------------+
| LINIMASA CATATAN PEMULIHAN LAPANGAN                              |
| Filter: [ Semua Petak ] [ Petak Kubu Raya ] [ Hutan Kota Bekasi ]|
+------------------------------------------------------------------+
|                                                                  |
|  [ KARTU LINIMASA POLAROID / NOTES ]                             |
|  +------------------------------------------------------------+  |
|  | [Stiker: Petak #KB-04]          [Cap Pos: 12 Okt 2026]     |  |
|  | KONDISI: [ Tumbuh Subur 🌿 ]   STATUS: [ Terverifikasi ✓ ] |  |
|  +------------------------------------------------------------+  |
|  | [ FOTO SEBELUM TANAM ]       [ FOTO HARI INI (BULAN KE-6)] |  |
|  | (15 Jan 2026 - Bibit 20cm)   (12 Okt 2026 - Pohon 85cm)    |  |
|  +------------------------------------------------------------+  |
|  | CATATAN KADER PAK SUWARDI (Kelompok Tani Gambut Jaya):     |  |
|  | "Alhamdulillah, bibit jelutung rawa petak utara sudah      |  |
|  | berdaun lebat. Sekat kanal gambut berfungsi menjaga        |  |
|  | kelembaban tanah sehingga tidak terbakar di kemarau."       |  |
|  +------------------------------------------------------------+  |
|  | VERIFIKASI WARGA: [🌿 42 Warga Mengonfirmasi] [💬 8 Catatan]|  |
|  | [ Beri Konfirmasi / Catatan Warga ➔ ]                      |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  [ TOMBOL: MUAT 10 CATATAN BERIKUTNYA (HALAMAN 2) ]              |
+------------------------------------------------------------------+
```

---

## 4. Kebutuhan Backend (BE Requirements & MongoDB Schema)

### A. Skema Koleksi MongoDB (`monitoring_logs`)
```javascript
// Collection: monitoring_logs
{
  "_id": ObjectId("..."),
  "plot_id": ObjectId("..."),
  "plot_code": "PL-KALBAR-001",
  "reporter": {
    "user_id": ObjectId("..."),
    "full_name": "Pak Suwardi",
    "role": "kader_lapangan",
    "is_verified": true
  },
  "monitoring_date": ISODate("2026-10-12T07:15:00Z"),
  "tree_metrics": {
    "average_height_cm": 85,
    "condition_status": "subur", // "subur" | "perlu_rawat" | "mati"
    "estimated_survival_rate": 88.5
  },
  "field_notes": "Alhamdulillah, bibit jelutung rawa petak utara sudah berdaun lebat...",
  "images": {
    "initial_photo_url": "https://storage.googleapis.com/.../initial_tree.webp",
    "current_photo_url": "https://storage.googleapis.com/.../tree_month_6.webp"
  },
  "gps_coordinates": {
    "latitude": -0.02241,
    "longitude": 109.33318,
    "accuracy_meters": 8.5
  },
  "community_verifications": {
    "upvote_subur_count": 42,
    "report_dispute_count": 0
  },
  "comment_count": 8,
  "created_at": ISODate("2026-10-12T08:00:00Z")
}
```

### B. Skema Koleksi Komentar / Verifikasi Publik (`log_comments`)
```javascript
// Collection: log_comments
{
  "_id": ObjectId("..."),
  "log_id": ObjectId("..."),
  "author_name": "Rina Wijaya (Donatur)",
  "author_badge": "donatur", // "donatur" | "warga_lokal" | "pemerhati"
  "content": "Senang sekali melihat jelutungnya tumbuh subur. Tetap semangat pak!",
  "is_flagged": false,
  "created_at": ISODate("2026-10-12T09:30:00Z")
}
```

### C. Spesifikasi API Endpoint
- `GET /api/v1/timeline`
  - Query Params: `plot_id`, `status`, `page` (default 1), `limit` (default 10).
  - Response: Daftar kartu linimasa terurut dari yang terbaru, menyertakan metadata komparasi foto.
- `POST /api/v1/timeline/:id/verify`
  - Request Payload: `{ type: "subur" | "kritis", visitor_identifier: "..." }`
  - Response: Jumlah akumulasi suara warga terbaru.
- `POST /api/v1/timeline/:id/comments`
  - Request Payload: `{ author_name: "...", author_badge: "...", content: "..." }`
  - Response: Objek komentar yang baru disimpan.

---

## 5. Penanganan Keamanan Siber (Cybersecurity)
1. **Pembersihan Konten HTML (Cegah Stored XSS):**
   - Catatan kader dan komentar warga wajib disaring melalui pustaka sanitasi (seperti `DOMPurify` / `sanitize-html`) sebelum disimpan ke basis data MongoDB untuk mematikan skrip berbahaya `<script>` atau tag `<iframe>`.
2. **Penyaringan Konten Spam & Kata Promosi (Word Filtering):**
   - Menerapkan pustaka filter kata terlarang (judi online, tautan pancingan/phishing) pada kolom komentar warga untuk menjaga ruang publik tetap bersih.
3. **Pencegahan Manipulasi Suara Verifikasi (Vote Tampering):**
   - Mencegah spam klik tombol "Konfirmasi Warga" dengan menyimpan *fingerprint cookie* atau token sesi sementara. Batasi maksimal 1 kali voting per log per pengunjung dalam 24 jam.
4. **Pencegahan NoSQL Injection pada Pagination & Query:**
   - Validasi parameter `page` dan `limit` sebagai integer murni (maksimal `limit = 20`) untuk mencegah penyerang mengirimkan objek MongoDB berbahaya (`{"$gt": ""}`).

---

## 6. To-Do Checklist Fitur 2
- [ ] Buat skema koleksi MongoDB `monitoring_logs` dan `log_comments`.
- [ ] Buat endpoint `GET /api/v1/timeline` dengan optimasi indexing compound `{ created_at: -1 }`.
- [ ] Rancang komponen kartu visual linimasa bergaya memo/polaroid dua foto (*Before & After*).
- [ ] Implementasikan form komentar publik ringan dengan sanitasi input anti-XSS.
- [ ] Buat tombol kontrol "Tampilkan Catatan Sebelumnya" berukuran besar dan ramah klik.
