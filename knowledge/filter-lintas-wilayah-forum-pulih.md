# Standarisasi Filter Geospasial Lintas Wilayah Feed Forum Pulih

Dokumen ini memetakan integrasi filter wilayah pada Linimasa Partisipasi Warga (Forum Pulih / Tab 3) agar selaras 100% dengan data satelit BNPB ArcGIS (Tab 1) dan Peta Pemulihan Petak Gambut (Tab 2).

---

## 1. Analisis Kritis & Masalah Antarmuka Sebelumnya

1. **Disparitas Ruang Lingkup Antar Tab**:
   - Tab 1 (Pantau Karhutla) memantau 6 provinsi prioritas BNPB: Kalimantan Tengah, Kalimantan Barat, Riau, Sumatera Selatan, Kalimantan Selatan, dan Jambi.
   - Tab 2 (Bukti Pulih) telah memiliki 9 petak restorasi gambut di 6 provinsi tersebut (+ Bekasi).
   - Namun, Tab 3 (Forum Pulih) sebelumnya hanya memiliki 3 tombol filter statis: *Kubu Raya*, *Sebangau*, dan *Bekasi*. Provinsi rawan tinggi seperti Riau, Sumsel, Kalsel, dan Jambi tidak terwakili.
2. **Ketiadaan Postingan Nyata di Provinsi Prioritas**:
   - Jika pengguna memfilter wilayah Riau atau Sumsel, linimasa kosong melompong.
   - Dibutuhkan entitas kiriman warga dan laporan verifikasi kader darat yang otentik untuk setiap provinsi prioritas BNPB.
3. **Penyelarasan Mental Model Pengguna (Bridging Antar Tab)**:
   - Pengguna yang melihat peringatan titik api Riau di Tab 1 atau petak restorasi di Tab 2 harus dapat langsung melompat ke Tab 3 dengan filter wilayah Riau yang langsung terpasang otomatis melalui parameter URL `?tab=forum&region=riau`.

---

## 2. Struktur Filter Geospasial Standar (`RegionKey`)

Filter wilayah diharmonisasikan menggunakan tipe data `RegionKey` dari `src/utils/plotDisplay.ts`:

```typescript
export type RegionKey =
  | "all"
  | "kalteng"
  | "kalbar"
  | "riau"
  | "sumsel"
  | "kalsel"
  | "jambi"
  | "bekasi";
```

### Kamus Pemetaan Wilayah & Postingan Forum:
| Region Key | Nama Wilayah / Provinsi | Lokasi Lapangan Spesifik | Kelompok Tani / Kader Pembina |
| :--- | :--- | :--- | :--- |
| `kalbar` | Kalimantan Barat | Kubu Raya / Ketapang | KMPG Rasau Jaya & Manggala Agni Pontianak |
| `kalteng` | Kalimantan Tengah | Sebangau / Pulang Pisau | Forum Masyarakat Peduli Rawa Palangka & KMPG Buntoi |
| `riau` | Riau | Teluk Meranti, Pelalawan | Kelompok Tani Gambut Teluk Meranti & Daops Dumai |
| `sumsel` | Sumatera Selatan | Padang Sugihan, OKI | KMPG Lempuing Jaya & Manggala Agni Daops OKI |
| `kalsel` | Kalimantan Selatan | Guntung Manggis, Banjarbaru | Relawan Banjar Hijau Mandiri |
| `jambi` | Jambi | Bram Itam, Muaro Jambi | KMPG Muaro Jambi Bersatu |
| `bekasi` | Jawa Barat (Hutan Kota) | Patriot Bina Bangsa, Bekasi | Relawan Hijau Patriot Bekasi |

---

## 3. Desain Antarmuka Anti-Slop (Ergonomi Mobile & Hierarki Konten)

1. **Horizontal Scrollable Chip Strip**:
   - Tombol pil wilayah dapat digulir horizontal pada perangkat mobile tanpa pembungkusan kaku (*no awkward wrapping*).
   - Menyertakan lencana hitungan postingan dinamis (misal: `Riau (1)`, `Kalteng (2)`).
2. **Regional Context Banner (Strip Kontekstual Wilayah)**:
   - Saat suatu wilayah dipilih, muncul strip ringkas berwarna hijau rimba di atas feed yang menampilkan:
     - Nama resmi provinsi/kabupaten.
     - Jumlah postingan & verifikasi darat kader aktif.
     - Tautan balik cepat untuk melihat sekat kanal di Peta Pemulihan (Tab 2).
3. **Pencarian Adaptif**:
   - Mengizinkan pencarian gabungan berdasarkan nama desa, kabupaten, maupun isi laporan lapangan.
