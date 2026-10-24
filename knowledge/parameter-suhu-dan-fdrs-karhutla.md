# Parameter Suhu Udara, Suhu Kecerahan Termal, dan Indeks FDRS Karhutla

Dokumen ini mendokumentasikan analisis ilmiah dan teknis integrasi parameter suhu pada papan pantauan peringkat provinsi (*Leaderboard*) BNPB di platform BuktiPulih.

---

## 1. Analisis Kritis Sumber Data & Ambiguitas Parameter Suhu

Dalam konteks penanggulangan kebakaran hutan dan lahan (karhutla), terdapat dua definisi suhu yang berbeda secara mendasar:

### A. Suhu Udara Ambien Permukaan (*Ambient Air Temperature - °C*)
- **Definisi:** Suhu udara pada ketinggian 2 meter di atas permukaan tanah yang diukur oleh stasiun meteorologi BMKG atau model reanalisis numerik (Open-Meteo / ECMWF).
- **Peran:** Bersama dengan kelembapan relatif (*Relative Humidity* / RH) dan curah hujan, suhu udara menjadi variabel pengendali laju penguapan (*evapotranspirasi*) yang mengeringkan serasah daun dan kubah gambut (*Fine Fuel Moisture Code* / FFMC).
- **Keterbatasan Spasial:** Suhu udara bervariasi drastis di dalam satu provinsi yang luas. Contoh: Provinsi Sumatera Selatan memiliki suhu sejuk di kawasan pegunungan Pagar Alam (20°C - 24°C) namun mencapai 34°C - 36°C di rawa gambut Ogan Komering Ilir (OKI). Menampilkan satu nilai suhu tunggal per provinsi memerlukan penentuan stasiun/koordinat representatif zona rawan.

### B. Suhu Kecerahan Termal Satelit (*Thermal Brightness Temperature - Kelvin / °C*)
- **Definisi:** Radiasi termal inframerah gelombang pendek (kanal 4 µm pada MODIS dan kanal I4 pada VIIRS) yang dipancarkan langsung oleh titik api di permukaan bumi saat satelit melintas (*overpass*).
- **Satuan Standar:** Kelvin (K) atau Celsius (°C). Nilai deteksi karhutla umumnya berada pada rentang 310 K (37°C) hingga > 365 K (92°C).
- **Kelebihan:** Merefleksikan intensitas riil energi pelepasan panas api (*Fire Radiative Power* / FRP), bukan sekadar cuaca sekitar.

---

## 2. Status Data pada WebGIS BNPB ArcGIS

Berdasarkan hasil audit endpoint `mv_prov_karhutla_2026` di `knowledge/bnpb-karhutla-api.md`:
- Lapisan atribut resmi BNPB **tidak menyediakan kolom suhu**.
- Kolom yang tersedia: `provinsi`, `tgl_update`, `today_luas_terbakar`, `total_hotspot`, `hotspot_tinggi`, `relawan`, `total_personil_gabungan`, `kualitas_udara_pm25`, `kesimpulan`.
- **Konsekuensi Desain:** Apabila suhu ditampilkan di dalam kartu berlabel *"WEBGIS BNPB ARCGIS"*, sumber data suhu wajib dinyatakan secara terpisah dan transparan (misal: *"Suhu Udara: Open-Meteo / BMKG"* atau *"Suhu Termal: Sensor VIIRS/MODIS"*) agar tidak menimbulkan disinformasi ilmiah.

---

## 3. Matriks Komparasi 3 Pendekatan Implementasi

| Kriteria Evaluasi | Opsi 1: Suhu Udara & RH Terbuka (Open-Meteo/BMKG) | Opsi 2: Suhu Kecerahan Satelit (Brightness Temp MODIS/VIIRS) | Opsi 3: Drawer/Modal Detail Cuaca Interaktif |
| :--- | :--- | :--- | :--- |
| **Relevansi Pencegahan** | Tinggi (Mengukur risiko kekeringan bahan bakar) | Sedang (Mengukur intensitas api yang sudah menyala) | Sangat Tinggi (Menyajikan gambaran meteorologi komprehensif) |
| **Dampak Tata Letak Mobile** | Ringan jika diletakkan inline di header kartu | Ringan jika diintegrasikan ke baris Hotspot Satelit | Nol (Tata letak kartu tetap lapang dan bersih) |
| **Ketergantungan API** | Memerlukan koordinat representatif zona gambut | Tanpa API baru (menggunakan data satelit internal) | Memanggil API cuaca saat kartu dibuka (*on-demand*) |
| **Kesesuaian Anti-Slop** | Baik, asalkan sumber dicantumkan transparan | Sangat Baik (data termal riil satelit) | Terbaik (Menghindari penumpukan data sempit pada kartu) |

---

## 4. Referensi Koordinat Titik Rawan Gambut per Provinsi (Untuk Opsi 1 & 3)

Untuk merepresentasikan suhu udara wilayah terdampak karhutla secara akurat:
1. **Kalimantan Barat:** Kubu Raya / Ketapang (`lat: -0.15, lng: 109.35`)
2. **Kalimantan Tengah:** Pulang Pisau / Kapuas (`lat: -2.75, lng: 114.15`)
3. **Kalimantan Selatan:** Banjarbaru / Gambut (`lat: -3.45, lng: 114.85`)
4. **Sumatera Selatan:** Ogan Komering Ilir (OKI) (`lat: -3.40, lng: 104.85`)
5. **Jambi:** Muaro Jambi (`lat: -1.55, lng: 103.80`)
6. **Riau:** Pelalawan / Siak (`lat: 0.50, lng: 101.90`)
