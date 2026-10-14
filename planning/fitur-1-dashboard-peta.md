# Spesifikasi Fitur 1: Dashboard Peta Restorasi & Impact Ledger
**Platform BuktiPulih — Pemantauan Wilayah Pasca-Karhutla**

---

## 1. Insight & Urgensi Masalah Lapangan
Karhutla meninggalkan area terbakar yang sangat luas dan terpencar, seperti kawasan gambut di Kalimantan serta ruang terbuka hijau/hutan kota (misal: area sekitar Bekasi). Masalah mendasar saat ini adalah **ketiadaan verifikasi spasial**:
- Donatur dan publik tidak tahu di mana tepatnya bibit ditanam.
- Publik tidak dapat membedakan lahan yang sedang dalam proses pemulihan aktif versus lahan yang ditelantarkan pasca-seremoni.
- Perlu antarmuka peta yang tidak membebani ponsel berdaya rendah (*low-end device*) milik kader dan warga setempat.

---

## 2. Rincian Fitur & Expected Behavior

### A. Alur Kerja Fitur
1. Pengguna membuka halaman Dashboard Peta.
2. Sistem menampilkan peta wilayah Indonesia dengan fokus default pada 2 kluster utama: **Lahan Gambut Kalimantan** dan **Kawasan Hutan Kota Bekasi**.
3. Peta menampilkan titik-titik petak restorasi (*restoration plots*) menggunakan teknik *marker clustering*.
4. Saat titik/kluster ditekan:
   - Muncul **Bottom Sheet** (pada layar mobile) atau **Side Drawer** (pada desktop).
   - Menampilkan ringkasan metrik petak: Nama Petak, Jumlah Bibit, Persentase Hidup (*Survival Rate*), Tanggal Tanam, dan Nama Komunitas Pengelola.
5. Filter Cepat (*Quick Filter*):
   - Switcher tab: `[ Semua Wilayah ]` | `[ Gambut Kalimantan ]` | `[ Hutan Kota Bekasi ]`.
   - Filter Status: `[ Semua ]` | `[ Subur (>80%) ]` | `[ Kritis (<50%) ]`.

### B. Expected Output
- Visualisasi zona hijau (pulih) vs zona merah (rawan/kering) secara transparan.
- Kartu Impact Ledger akumulatif di atas peta: Total Bibit Tertanam, Total Bibit Hidup, dan Total Luas Lahan Terpulihkan (Hektare).

---

## 3. Penempatan UI & Layout Wireframe

### A. Filosofi Visual (Japanese Clean Functional)
- Menggunakan palet peta minimalis (*light/muted tile layer Leaflet & OpenStreetMap*) agar warna pin penanda (hijau restorasi `#0E753B` dan merah peringatan `#DC2626`) kontras dan mudah dibaca oleh mata lansia.
- Bebas kuota API berbayar (*zero API bill risk*), rendering cepat dan ringan untuk ponsel berspesifikasi rendah.
- Tombol kontrol berukuran besar (tinggi minimal 48px), teks tebal dengan kontras tinggi di atas kontainer putih bergaris tepi tegas (`border: 1.5px solid #2D3748`).

### B. Layout Wireframe
```
+------------------------------------------------------------------+
| [Logo BuktiPulih]   [Peta Wilayah]   [Linimasa]   [Lapor (Kader)]|
+------------------------------------------------------------------+
| IMPACT LEDGER SUMMARY BAR                                        |
| [ 12.450 Bibit Ditanam ]  [ 84% Tingkat Hidup ]  [ 42 Hektare ]  |
+------------------------------------------------------------------+
| FILTER: [ Semua Wilayah ] [ Gambut Kalbar ] [ Hutan Bekasi ]     |
+------------------------------------------------------------------+
|                                  | SIDE PANEL / BOTTOM SHEET     |
|         LEAFLET.JS               | Petak #KB-04: Desa Kubu Raya  |
|         OPENSTREETMAP VIEW       | - Komunitas: Tani Gambut Jaya |
|                                  | - Survival Rate: 88% (Subur)  |
|   (Cluster Pin)    (Marker Pin)  | - Bibit: Jelutung Rawa (500)  |
|                                  | [ Lihat Linimasa Petak Ini ➔] |
+------------------------------------------------------------------+
```

---

## 4. Kebutuhan Backend (BE Requirements & MongoDB Schema)

### A. Skema Koleksi MongoDB (`zones` & `plots`)
```javascript
// Collection: plots
{
  "_id": ObjectId("..."),
  "plot_code": "PL-KALBAR-001",
  "name": "Petak Restorasi Gambut Parit Tokaya",
  "region": "Kalimantan Barat",
  "ecosystem_type": "gambut", // "gambut" | "hutan_kota" | "mineral"
  "location": {
    "type": "Point",
    "coordinates": [109.3333, -0.0222] // [longitude, latitude]
  },
  "area_hectares": 2.5,
  "community_name": "Kelompok Tani Peduli Gambut",
  "initial_planting_date": ISODate("2026-01-15T00:00:00Z"),
  "total_planted": 1200,
  "current_alive": 1040,
  "survival_rate": 86.6,
  "latest_status": "subur", // "subur" | "perlu_rawat" | "kritis"
  "last_monitored_at": ISODate("2026-10-10T08:30:00Z"),
  "cover_image_url": "https://storage.googleapis.com/.../cover.webp",
  "created_at": ISODate("...")
}
```

### B. Indexing MongoDB
- Geospasial Index: `db.plots.createIndex({ "location": "2dsphere" })`
- Status & Region Index: `db.plots.createIndex({ "region": 1, "latest_status": 1 })`

### C. Spesifikasi API Endpoint
- `GET /api/v1/plots`
  - Query Params: `region`, `status`, `bbox` (minLng, minLat, maxLng, maxLat).
  - Response: Ringkasan GeoJSON feature collection (koordinat, id, survival_rate, nama).
- `GET /api/v1/plots/:id/summary`
  - Response: Detail petak, riwayat pemantauan 3 bulan terakhir, metrik pertumbuhan.
- `GET /api/v1/metrics/impact-ledger`
  - Response: Agregasi total nasional (bibit ditanam, bibit hidup, luas lahan).

---

## 5. Penanganan Keamanan Siber (Cybersecurity)
1. **Pengamanan Tile Layer & Leaflet Integration:**
   - Gunakan tile server publik terpercaya (OpenStreetMap / CartoDB Positron) dengan caching lokal atau reverse-proxy ringan guna meminimalkan lonjakan request jaringan.
   - Tanpa ketergantungan API Key berbayar di sisi klien, mengeliminasi risiko kebocoran kunci (*API Key Leakage*).
2. **Validasi Geospasial & Sanitasi Query Bounding Box:**
   - Cegah NoSQL Injection pada query operator `$geoWithin` atau `$near`. Validasi koordinat numerik dengan skema Zod (Longitude -180 s/d 180, Latitude -90 s/d 90).
3. **Penyembunyian Titik Presisi Bibit Langka (Anti-Poaching Protection):**
   - Untuk bibit bernilai ekonomis tinggi atau pohon endemik dilindungi, backend mengaburkan koordinat publik dengan *random offset* radius 50-100 meter guna mencegah pencurian bibit oleh pihak tidak bertanggung jawab.
4. **Caching & Rate Limiting:**
   - Gunakan cache Cloudflare / Next.js ISR untuk endpoint agregasi metrik (revalidate tiap 10 menit) guna melindungi backend dari lonjakan trafik dan serangan DoS.

---

## 6. To-Do Checklist Fitur 1
- [ ] Buat skema koleksi MongoDB `plots` dengan index `2dsphere`.
- [ ] Implementasikan endpoint `GET /api/v1/plots` dengan pipeline agregasi ringan.
- [ ] Bangun komponen peta Leaflet.js dengan styling ramah kontras dan marker clustering.
- [ ] Bangun Bottom Sheet responsif untuk menampilkan detail petak pada perangkat mobile.
