# Filter Status Kondisi Lahan & Vegetasi Gambut pada Forum Pulih

Dokumen ini mendokumentasikan implementasi filter sekunder berbasis kondisi fisik lahan (*status_condition*) pada feed Forum Pulih (Tab 3) untuk memudahkan pemilahan antara area yang telah pulih subur, area basah aman, area butuh perawatan, dan area darurat rawan kering.

---

## 1. Landasan Ekologis & Klasifikasi Kondisi Lahan

Berdasarkan parameter monitoring restorasi gambut BRGM dan Manggala Agni, kondisi fisik lahan dikelompokkan ke dalam 4 kategori status operasional:

| Status Kondisi | Definisi Lapangan | Ambang Batas Muka Air | Warna Indikator | Tindakan Warga & Relawan |
| :--- | :--- | :--- | :--- | :--- |
| **Tumbuh Subur** | Vegetasi revegetasi (jelutung, ramin, pulai) berkembang sehat dengan tunas baru aktif. | $>-20\text{ cm}$ (lembab optimal) | `#059669` (Emerald) | Pembersihan gulma liar dan dokumentasi berkala. |
| **Lahan Basah** | Sekat kanal terisi air penuh, tanah gambut jenuh air, nihil risiko api bawah tanah. | $0\text{ s/d }-30\text{ cm}$ (basah aman) | `#0284C7` (Biru Laut) | Pemeliharaan fisik struktur sekat kanal komunal. |
| **Perlu Rawat** | Daun menguning/layu ringan, terpaan panas terik, atau debit air parit mulai berkurang. | $-30\text{ s/d }-40\text{ cm}$ (waspada) | `#D97706` (Kuning Amber) | Penyiraman darurat dan penambahan serasah basah. |
| **Rawan Kering** | Air parit kanal surut melewati batas kritis, gambut retak dan berisiko memicu bara api. | $<-40\text{ cm}$ (ambang kritis) | `#DC2626` (Merah Bahaya) | Pembasahan sekat darurat menggunakan pompa apung. |

---

## 2. Struktur Filter Multi-Dimensi di ForumFeed

Pengguna dapat menyaring postingan secara fleksibel melalui 3 dimensi data yang bekerja simultan:
1. **Dimensi Geospasial** (`regionFilter`): Semua Wilayah, Kalteng, Kalbar, Riau, Sumsel, Kalsel, Jambi, Bekasi.
2. **Dimensi Kondisi Lahan** (`conditionFilter`): Semua Kondisi, Tumbuh Subur, Lahan Basah, Perlu Rawat, Rawan Kering.
3. **Dimensi Urutan** (`currentSort`): Terbaru, Paling Disukai, Banyak Komentar, Banyak Dilihat.

### Formula Penyaringan:
```typescript
function getSortedPosts(
  posts: ForumPost[],
  regionFilter: string,
  conditionFilter: string,
  sortKey: SortCriteria
): ForumPost[]
```

---

## 3. Desain Antarmuka Anti-Slop (Content-Driven & Ergonomi Jempol)

1. **Badge Hitungan Dinamis**:
   - Setiap tombol pil kondisi menampilkan jumlah postingan yang cocok secara real-time (contoh: `Rawan Kering (1)`, `Tumbuh Subur (5)`).
2. **Garis Pembatas Halus 1px & Titik Penanda Warna**:
   - Menggunakan bulatan warna aksen kecil (*status color dot*) di samping label alih-alih gradien ungu yang mengaburkan teks.
3. **Ergonomi Ponsel**:
   - Ditempatkan di baris filter tersendiri dengan dukungan scroll horizontal pada viewport sempit ($360\text{px}-420\text{px}$).
