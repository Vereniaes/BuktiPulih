# Spesifikasi Format Lembar Disposisi Situasi Karhutla & Ekspor Siaga (BPBD/BNPB)

Dokumen ini mendokumentasikan spesifikasi standar laporan cepat (*dispatch sheet*) posko tanggap darurat bencana karhutla lahan gambut untuk keperluan distribusi informasi ke relawan lapangan, BPBD, dan posko desa.

---

## 1. Standar Struktur Lembar Disposisi Darurat

Sesuai prosedur operasional BNPB dan BPBD, dokumen disposisi situasi harian karhutla wajib memuat 6 komponen esensial:

```
+-----------------------------------------------------------------------------------------+
| [KOP RESMI] KONSORSIUM RESTORASI BUKTIPULIH & SATGAS KARHUTLA                          |
| LEMBAR DISPOSISI SITUASI GEOSPASIAL & SEBARAN KABUT ASAP                               |
| Nomor: DISP-KARHUTLA/2026-10-14/08                               Waktu: 14 Okt 2026, 21:55 WIB |
+-----------------------------------------------------------------------------------------+
| 1. STATUS KEDARURATAN KAWASAN                                                           |
|    - Status Operasional: SIAGA 1 DARURAT / TERKENDALI PENDINGINAN                       |
|    - Total Titik Api: X Lokasi (Y Membara, Z Pendinginan)                                |
|    - Kualitas Udara Tertinggi: XXX µg/m³ PM2.5 (Sangat Berbahaya / Sedang)              |
+-----------------------------------------------------------------------------------------+
| 2. PARAMETER CUACA & VEKTOR HEMBUSAN ANGIN PERMUKAAN                                    |
|    - Kecepatan Angin: XX km/jam | Arah: XXX° (Tenggara)                                  |
|    - Kelembapan Gambut (RH): XX% | Sumber: Open-Meteo High Resolution / BMKG             |
+-----------------------------------------------------------------------------------------+
| 3. SNAPSHOT SPASIAL & DISTRIBUSI SEBARAN KABUT ASAP                                     |
|    [Tangkapan Visual Peta Geospasial dengan Vektor Dispersi Partikel Asap]              |
+-----------------------------------------------------------------------------------------+
| 4. TABEL PRIORITAS TITIK RAWAN KABUPATEN                                                |
|    | Kabupaten | Provinsi | Status Lapangan | PM2.5 | Rekomendasi Tindakan |             |
+-----------------------------------------------------------------------------------------+
| 5. INSTRUKSI OPERASIONAL RELAWAN & MANGGALA AGNI                                        |
|    - Jalur evakuasi/pembagian masker N95 di desa searah hembusan angin.                 |
|    - Pemantauan sekat kanal gambut untuk mempertahankan kelembapan basah.               |
|    - Pengajuan jadwal sortie Water Bombing / TMC lanjutan ke BPBD Provinsi.            |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Strategi Rekayasa Teknis: Zero-Bundle Print & Canvas PNG Export

Untuk menjaga aplikasi tetap ringan (*write less code* dan *0 KB overhead dependensi tambahan*):

1. **Modal Lembar Disposisi Antarmuka**:
   - Menampilkan formulir disposisi berformat resmi di layar dengan nomor berkas unik berbasis stempel waktu.
   - Menyediakan tombol:
     - `Unduh Dokumen PNG (Snapshot Langsung)`: Merender kanvas 2D komposit laporan resmi lengkap dengan bagan spasial beresolusi tinggi.
     - `Cetak / Simpan PDF Resmi`: Memanfaatkan fungsi bawaan `window.print()` yang dikombinasikan dengan stylesheet khusus `@media print`.
2. **Keunggulan Dibanding Pustaka Pihak Ketiga (jsPDF / html2canvas)**:
   - Tidak menambah ukuran bundel sebesar 400–600 KB.
   - Tidak rentan masalah *tainted canvas CORS* dari tile OpenStreetMap.
   - Mendukung format cetak A4 vertikal (*portrait*) secara presisi.
