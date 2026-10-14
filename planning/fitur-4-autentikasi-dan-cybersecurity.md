# Spesifikasi Fitur 4: Autentikasi Ringan & Pertahanan Keamanan Siber
**Platform BuktiPulih — Mitigasi Rekayasa Sosial, Anti-Fraud, & Forum Terbuka**

---

## 1. Insight & Urgensi Masalah Lapangan
Di wilayah rehabilitasi pasca-karhutla, sistem autentikasi menghadapi dua tantangan bertolak belakang:
- **Tantangan Pengguna:** Kader lapangan dan kelompok tani umumnya adalah orang tua/lansia (*boomers*) yang kesulitan menghafal kata sandi rumit 16 karakter dengan simbol atau memecahkan teka-teki CAPTCHA gambar yang rumit. Sistem login yang rumit akan membuat platform tidak pernah dipakai di lapangan.
- **Tantangan Keamanan & Integritas Publik:** Platform publik yang menampung data transparansi reboisasi sangat rentan disusupi:
  - **Social Engineering & Impersonasi:** Penyerang membuat akun palsu dengan nama "Dinas Kehutanan" atau "Ketua Kelompok Tani" untuk menerbitkan klaim bohong (*fake greenwashing*).
  - **Spamming & Bot Injection:** Forum warga dibanjiri komentar spam promosi, judi online, atau tautan pancingan (*phishing*).
  - **NoSQL Injection:** Upaya membobol autentikasi MongoDB dengan manipulasi payload objek JSON (`{"$gt": ""}`).

Solusinya adalah **Autentikasi Rendah Hambatan (*Low-Friction Authentication*)** yang dipadukan dengan **Sistem Lencana Identitas Keras (*Hardened Role Badging*)** di tingkat backend.

---

## 2. Rincian Fitur & Hirarki Peran (Role Hierarchy)

### A. Hirarki Peran
1. **Tamu Publik (`PUBLIC_GUEST`):**
   - Akses baca 100% tanpa perlu login.
   - Dapat memberikan komentar dan konfirmasi warga cukup dengan memasukkan Nama Lengkap dan Nomor WhatsApp/Email aktif.
2. **Kader Lapangan Terdaftar (`COMMUNITY_VOLUNTEER`):**
   - Mendapatkan lencana hijau terverifikasi: **[ 🌿 Kader Terdaftar ✓ ]**.
   - Akses membuat laporan tumbuh kembang pohon dan mengunggah foto lapangan.
   - Login menggunakan Nomor HP + PIN 6 Digit atau Kata Sandi sederhana.
3. **Verifikator Resmi / Instansi (`GOVERNMENT_VERIFIER`):**
   - Mendapatkan lencana biru emas: **[ 🏛️ Verifikator Resmi DLH/BRGM ✓ ]**.
   - Hak memverifikasi laporan kader dan mengubah status petak menjadi resmi diakui pemerintah.
4. **Administrator Sistem (`ADMIN_SUPER`):**
   - Manajemen petak restorasi, aktivasi kader baru, dan moderasi forum.

### B. Alur Login Ramah Lansia (Kader Lapangan)
1. Kader memasukkan Nomor WhatsApp terdaftar.
2. Memasukkan PIN 6 Digit dengan tampilan tombol angka (*numeric keypad*) berukuran besar.
3. Sesi login disimpan menggunakan *Persistent Secure Cookie* (berlaku 30 hari) agar kader tidak perlu berulang kali login setiap kali membuka browser di lapangan.

---

## 3. Penempatan UI & Layout Wireframe

### A. Filosofi Visual
- Tampilan dialog login bersih dan tidak intimidatif.
- Bidang input nomor dan PIN berukuran tinggi **56px** dengan font angka 24px lapang.
- Label teks bahasa Indonesia yang santun dan gamblang (misal: *"Masukkan 6 angka PIN rahasia Anda"*).

### B. Layout Wireframe (Modal Login Kader)
```
+-------------------------------------------------------+
| [X] Tutup                                             |
| MASUK SEBAGAI KADER LAPANGAN                          |
| Khusus Petugas Pemantau & Kelompok Tani Terdaftar     |
+-------------------------------------------------------+
| NOMOR WHATSAPP ANDA:                                  |
| [ 0812-3456-7890                                    ] |
+-------------------------------------------------------+
| MASUKKAN 6 ANGKA PIN:                                 |
| [  *  ] [  *  ] [  *  ] [  *  ] [  *  ] [  *  ]       |
+-------------------------------------------------------+
| [     MASUK KE FORMULIR LAPORAN ➔                   ] |
+-------------------------------------------------------+
| Lupa PIN? Hubungi Koordinator Desa: [0812-xxxx-xxxx]  |
| Pengunjung umum? [Tetap Membaca Tanpa Login]          |
+-------------------------------------------------------+
```

---

## 4. Kebutuhan Backend (BE Requirements & MongoDB Schema)

### A. Skema Koleksi MongoDB (`users` & `audit_logs`)
```javascript
// Collection: users
{
  "_id": ObjectId("..."),
  "full_name": "Suwardi Pratama",
  "phone_number": "081234567890",
  "pin_hash": "$2b$12$e8Y7z9...", // Bcrypt cost factor 12
  "role": "COMMUNITY_VOLUNTEER", // "PUBLIC_GUEST" | "COMMUNITY_VOLUNTEER" | "GOVERNMENT_VERIFIER" | "ADMIN_SUPER"
  "assigned_plot_ids": [ObjectId("...")],
  "organization_name": "Kelompok Tani Gambut Jaya Kubu Raya",
  "is_active": true,
  "failed_login_attempts": 0,
  "lock_until": null,
  "created_at": ISODate("2026-01-10T00:00:00Z"),
  "last_login_at": ISODate("2026-10-13T08:00:00Z")
}
```

```javascript
// Collection: security_audit_logs
{
  "_id": ObjectId("..."),
  "event_type": "REPORT_SUBMISSION", // "LOGIN_FAIL" | "IMPERSONATION_ATTEMPT" | "REPORT_SUBMISSION"
  "ip_address": "114.125.x.x",
  "user_agent": "Mozilla/5.0 (Android...)",
  "payload_summary": { "user_id": ObjectId("..."), "plot_id": "PL-KALBAR-001" },
  "created_at": ISODate("2026-10-13T09:15:00Z")
}
```

### B. Spesifikasi API Endpoint
- `POST /api/v1/auth/login`
  - Payload: `{ phone_number: "...", pin: "..." }`
  - Proteksi: Validasi Bcrypt, generate JWT Token di HTTP-Only Cookie (`SameSite=Lax`, `Secure=true`).
- `POST /api/v1/auth/logout`
  - Menghapus cookie sesi secara aman.
- `GET /api/v1/auth/me`
  - Mengembalikan data profil dan peran pengguna yang sedang aktif.

---

## 5. Penanganan Keamanan Siber & Rekayasa Sosial (Cybersecurity)

### A. Mitigasi Rekayasa Sosial & Peniruan Identitas (Social Engineering Prevention)
1. **Daftar Hitam Nama Profil (Name Blacklisting):**
   - Sistem menolak pendaftaran nama profil publik yang mengandung kata kunci institusi sensitif, seperti: `"Dinas"`, `"Kementerian"`, `"DLH"`, `"BRGM"`, `"Polisi Kehutanan"`, `"Admin"`, `"Verifikator"`.
2. **Kriptografi Lencana Terverifikasi (Cryptographic Badging):**
   - Lencana hijau kader dan lencana emas dinas hanya disematkan jika data peran (`role`) berasal langsung dari token otentikasi server, bukan dari klaim teks yang dikirimkan formulir klien.

### B. Pertahanan Teknis Backend (Technical Hardening)
1. **Pencegahan NoSQL Injection:**
   - Semua input parameter dibersihkan menggunakan pemfilteran skema ketat (Zod Validation) dan pemutus operator MongoDB (mencegah payload seperti `{"$ne": null}`).
2. **Anti-Brute Force PIN:**
   - Batasi percobaan login maksimal 5 kali berturut-turut per nomor HP dalam 15 menit. Jika gagal, akun dikunci sementara (*rate limiting via Redis/in-memory store*).
3. **Penyaringan Bot Tanpa CAPTCHA (Honeypot Technique):**
   - Menyisipkan bidang input tersembunyi berlabel `website_url` yang disamarkan dari mata manusia dengan CSS `display: none; tab-index: -1`. Jika field ini terisi data, server langsung mendeteksi pengirim sebagai skrip bot dan menolak permintaan tanpa mengganggu pengguna lansia.
4. **Perlindungan Sesi (Session Hijacking Protection):**
   - Token sesi disimpan di `HttpOnly` dan `Secure` Cookie sehingga tidak dapat dibaca oleh skrip jahat peramban (Anti-XSS token theft).

---

## 6. To-Do Checklist Fitur 4
- [ ] Buat skema koleksi MongoDB `users` dengan enkripsi Bcrypt (cost factor 12).
- [ ] Implementasikan endpoint `POST /api/v1/auth/login` dengan pembatasan percobaan gagal (*rate-limiting*).
- [ ] Terapkan middleware sanitasi input untuk mencegah serangan NoSQL Injection.
- [ ] Buat filter pencegah impersonasi nama dinas/instansi pada registrasi profil publik.
- [ ] Bangun antarmuka modal login ramah lansia dengan keypad angka berukuran besar.
