# Operasi TMC & Water Bombing: Parameter Fisika Pemadaman Karhutla Gambut

Dokumen ini mendokumentasikan spesifikasi intervensi darurat penanganan karhutla lahan gambut (Teknologi Modifikasi Cuaca / TMC dan Water Bombing) serta pemodelan dampaknya terhadap parameter spasial, partikel asap, dan status titik api pada platform BuktiPulih.

---

## 1. Konteks Operasional Lapangan (BNPB, BMKG & BRIN)

Di Indonesia, lahan gambut (khususnya Riau, Jambi, Sumsel, Kalbar, Kalteng) memiliki kedalaman bahan organik hingga lebih dari 3 meter. Saat terbakar:
1. **Kebakaran Permukaan (*Surface Flaming*)**: Menghasilkan api terbuka dengan panas radiasi ekstrem ($> 600^\circ\text{C}$) dan asap pekat oranye/merah.
2. **Kebakaran Bawah Permukaan (*Smoldering / Subsurface Peat Fire*)**: Pembakaran tanpa lidah api di dalam tanah gambut yang melepaskan partikel karbon halus (PM2.5) dan gas beracun (CO, $\text{CO}_2$, $\text{CH}_4$).

### Dua Jenis Intervensi Udara Utama:
* **Water Bombing Helikopter (Bambi Bucket 4.000–5.000 Liter)**:
  - Sasaran: Menjinakkan kobaran api permukaan (*surface flaming*), memutus lidah api agar tidak menjalar ke permukiman atau tegakan hutan yang belum terbakar.
  - Dampak Seketika: Menurunkan suhu api di titik jatuh air dalam hitungan detik.
* **Operasi TMC (Teknologi Modifikasi Cuaca / Penyemaian Awan NaCl)**:
  - Sasaran: Membasahi kubah gambut (*peat dome*) secara luas dengan memicu presipitasi hujan lebat terkonsentrasi.
  - Dampak Luas: Menaikkan kadar air tanah gambut (*peat moisture content*) hingga $> 100\%$ dan mematikan titik api bawah permukaan secara permanen.

---

## 2. Pemodelan Transisi Status & Fisika Simulasi di BuktiPulih

Ketika tombol intervensi **Operasi TMC / Water Bombing** diaktifkan pada titik terpilih atau seluruh wilayah siaga:

| Parameter Metrik | Sebelum Intervensi (Darurat) | Pasca-Intervensi (TMC / Water Bombing) |
| :--- | :--- | :--- |
| **Status Titik Api** | `aktif membara` | `tahap pendinginan` (*cooling stage*) |
| **Ikon Api Petak** | Kobaran api merah berdenyut (`#DC2626`) | Titik uap biru-kehijauan/abu-abu (`#10B981` / `#6EE7B7`) |
| **Warna Partikel Asap** | Merah/Oranye pekat (`rgb(234, 88, 12)`) | Uap air putih transparan (`rgba(220, 230, 240, 0.15)`) |
| **Radius Asap (km)** | Radius penuh (15–35 km) | Berangsur menyusut (-60% hingga -80%) |
| **Indeks PM2.5** | 180–320 $\mu\text{g/m}^3$ (Sangat Berbahaya) | Menurun ke rentang aman 25–45 $\mu\text{g/m}^3$ |
| **Kelembapan Gambut** | $< 60\%$ (Kering Ekstrem) | Meningkat hingga $95\%–100\%$ (Lembap Basah Terjaga) |
| **Status Siaga Lahan** | `Siaga 1 Darurat` | `Terkendali / Pemulihan Aktif` |

---

## 3. Desain Siklus Intervensi (Intervention Lifecycle)

1. **Inisiasi Aksi**:
   - Pengguna menekan tombol aksi: `Luncurkan Water Bombing` (titik spesifik) atau `Operasi TMC Hujan Buatan` (seluruh kawasan aktif).
2. **Animasi Efek Visual (Droplet & Steam Plume)**:
   - Muncul riak air penyejuk (*cooling ripple wave*) pada titik koordinat yang disiram.
   - Partikel asap berubah transisi dari kepulan pekat menjadi uap putih tipis (*steam condensation*).
3. **Pembaruan Metrik KPI Real-Time**:
   - Jumlah titik api aktif berkurang.
   - Angka estimasi luas terdampak asap menyusut.
   - Indeks kualitas udara bergeser dari merah ke hijau sehat.
4. **Opsi Pemulihan / Reset**:
   - Pengguna dapat mengembalikan ke kondisi semula (*Reset Pengamatan Satelit*) untuk mempelajari kembali simulasi sebaran sebelum dipadamkan.
