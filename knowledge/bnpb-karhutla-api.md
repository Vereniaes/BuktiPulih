# Knowledge Base: Integrasi API Karhutla BNPB (Hasil Reverse Engineering)
**Sumber Data Eksternal untuk Platform BuktiPulih**

---

## 1. Ringkasan Investigasi & Penemuan Endpoint
- **URL Asli yang Diklaim:** `https://data.bnpb.go.id/data/karhutla2026` (Menghasilkan HTTP 403 Forbidden karena portal data statis dibatasi oleh Cloudflare WAF).
- **Infrastruktur Asli yang Aktif:** WebGIS BNPB berjalan di atas **Esri ArcGIS Enterprise Server (v11.4)** pada domain `https://gis.bnpb.go.id`.
- **Lokasi Backend:** Seluruh data pemantauan karhutla 2026 disajikan secara terbuka melalui **ArcGIS REST Services Directory**.

---

## 2. Struktur Endpoint API REST BNPB

### A. Direktori Root Server
- **Root Services Directory:**
  `https://gis.bnpb.go.id/server/rest/services?f=json`
- **Folder Khusus Karhutla 2026:**
  `https://gis.bnpb.go.id/server/rest/services/2026_karhutla?f=json`

### B. Service Aktif Karhutla 2026
- **Nama Service:** `2026_karhutla/mv_prov_karhutla_2026`
- **Tipe Service:** `MapServer` dan `FeatureServer`
- **Layer Utama Aktif:** **Layer ID: `3`** (`name: mv_prov_karhutla_2026`, geometri: `esriGeometryPolygon`)

---

## 3. Cara Menarik Data Update (Query Endpoint)

Backend BuktiPulih dapat menarik data pembaruan karhutla secara langsung tanpa perlu melakukan web scraping HTML:

### A. Tarik Data Atribut Ringan (Tanpa Geometri - Hemat Bandwidth)
Gunakan opsi `returnGeometry=false` agar server tidak mengirimkan koordinat poligon berukuran besar:
```http
GET https://gis.bnpb.go.id/server/rest/services/2026_karhutla/mv_prov_karhutla_2026/MapServer/3/query?where=1=1&outFields=provinsi,tgl_update,today_luas_terbakar,luas_lahan_terbakar_sipongi_2026,total_hotspot,relawan,total_personil_gabungan,kualitas_udara_pm25,kesimpulan&returnGeometry=false&f=json
```

### B. Tarik Format Standar GeoJSON (Untuk Google Maps / Leaflet)
```http
GET https://gis.bnpb.go.id/server/rest/services/2026_karhutla/mv_prov_karhutla_2026/MapServer/3/query?where=1=1&outFields=*&f=geojson
```

### C. Tarik Data Khusus Provinsi Tertentu (Misal: Kalimantan Barat)
```http
GET https://gis.bnpb.go.id/server/rest/services/2026_karhutla/mv_prov_karhutla_2026/MapServer/3/query?where=provinsi='Kalimantan Barat'&outFields=*&returnGeometry=false&f=json
```

---

## 4. Kamus Data Atribut Penting (Fields Mapping)

| Nama Kolom (*Field*) | Tipe Data | Deskripsi & Nilai Contoh | Pemanfaatan di BuktiPulih |
| :--- | :--- | :--- | :--- |
| `provinsi` | String | Nama provinsi (misal: "Kalimantan Barat") | Filter pencocokan wilayah petak restorasi |
| `tgl_update` | Date | Tanggal pembaruan data BNPB (misal: "2026-09-26") | Indikator waktu pembaruan (*Last Sync*) |
| `today_luas_terbakar` | Double | Luas lahan terbakar hari ini (Hektare) | Peringatan risiko karhutla aktif |
| `luas_lahan_terbakar_sipongi_2026` | Double | Akumulasi luas terbakar tahun 2026 dari Sipongi KLHK | Tolok ukur urgensi kebutuhan rehabilitasi |
| `total_hotspot` | Integer | Total titik panas terdeteksi satelit | Peringatan dini di dashboard peta |
| `hotspot_tinggi` | Integer | Titik panas dengan tingkat kepercayaan tinggi | Filter area rawan darurat |
| `relawan` | Integer | Jumlah personel relawan lapangan yang dikerahkan | Benchmark partisipasi relawan riil |
| `total_personil_gabungan` | Integer | Gabungan relawan, TNI, Polri, BPBD, Manggala Agni | Metrik mobilisasi aksi mitigasi |
| `kualitas_udara_pm25` | String | Status polusi udara (misal: "Tidak Sehat", "Berbahaya") | Kartu status lingkungan petak |
| `kesimpulan` | String | Narasi ringkas penanganan dan kendala di lapangan | Suplemen teks edukasi di linimasa |

---

## 5. Rekomendasi Arsitektur Penarikan Data di Backend BuktiPulih

Agar tidak membebani server BNPB dan menjaga performa tinggi:
1. **Cron Job Sinkronisasi Terjadwal (Scheduled Ingestion):**
   - Jalankan cron job di backend (misal: setiap 6 jam sekali, `0 */6 * * *`) untuk memanggil endpoint atribut `returnGeometry=false`.
2. **Penyimpanan Lokal di MongoDB (`bnpb_sync_cache`):**
   - Simpan hasil penarikan ke koleksi lokal MongoDB sehingga dashboard BuktiPulih melayani pengguna langsung dari basis data internal tanpa bergantung pada latensi jaringan eksternal.
3. **Penyambungan ke Impact Ledger BuktiPulih:**
   - Luas lahan terbakar dari data BNPB dapat dikorelasikan langsung dengan luas lahan yang telah direhabilitasi oleh kader BuktiPulih untuk menunjukkan persentase pemulihan riil.
