# Arsitektur Verifikasi Lapangan & Komparasi Foto Sebelum-Sesudah Forum Pulih

Dokumen ini mendokumentasikan spesifikasi teknis dan alur integritas akuntabilitas publik pada halaman penuh `/forum/[id]` portal BuktiPulih.

---

## 1. Urgensi Integritas Audit Restorasi (Proof of Recovery)

Pada program restorasi ekosistem gambut dan reboisasi pasca-karhutla, klaim sepihak rentan terhadap pemalsuan (*greenwashing*).
Untuk memastikan bahwa bibit benar-benar bertumbuh dan kanal benar-benar terairi:
1. **Komparasi Temporal Nyata (*Before vs After*)**:
   - Foto kondisi awal pasca-karhutla (*M1: arang pekat, lahan gersang*) disandingkan langsung dengan kondisi terkini (*M6: revegetasi alami, pucuk daun jelutung, kanal terisi air*).
   - Pengguna dapat beralih secara instan melalui tombol komparasi tanpa kehilangan konteks visual.
2. **Sertifikasi Kader Lapangan (*Kader Certification Badge*)**:
   - Menampilkan nomor ID sertifikasi (contoh: `KMPG-KB/2026/041`), organisasi pembina (Manggala Agni / KMPG), dan peran pengendali ekosistem.
3. **Rekam Jejak Audit Partisipatif (*Field Verification Trail*)**:
   - Pengawas independen, akademisi, dan relawan dapat menambahkan catatan inspeksi fisik di lokasi petak bersangkutan.
   - Dilengkapi foto bukti yang diunggah langsung ke CDN Vercel Blob melalui endpoint `/api/upload`.

---

## 2. Alur Pengunggahan Media ke Vercel Blob (`/api/upload`)

```
[ Pengguna / Kader Lapangan ]
           │
           │ 1. Pilih berkas foto (JPG/PNG maks 10MB)
           ▼
[ ForumPostDetailClient.tsx ]
           │
           │ 2. FormData('file', file)
           ▼
[ POST /api/upload (Route Handler) ]
           │
           │ 3. Validasi tipe MIME & Token BLOB_READ_WRITE_TOKEN
           ▼
[ Vercel Blob CDN (SIN1 Region) ]
           │
           │ 4. Mengembalikan public URL permanen
           ▼
[ ForumPostDetailClient.tsx ]
           │
           │ 5. Simpan ke daftar field_verifications & localStorage
           ▼
[ UI Update Seketika (Audit Trail) ]
```

---

## 3. Fallback Offline & Ketahanan Jaringan

- Jika peramban offline atau koneksi internet di pedalaman terbatas, `URL.createObjectURL(file)` digunakan sebagai pratinjau lokal instan dan catatan tetap tersimpan ke penyimpanan lokal (`localStorage`).
- Ketika jaringan pulih, data sinkronisasi dapat diperbarui secara transparan.
