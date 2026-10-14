# Audit Kritis & Pembersihan Sisa Gimmick Simulasi pada Tab 1 (FireHazeMap)

Dokumen ini mencatat hasil audit kritis terhadap komponen Tab 1 (`src/components/FireHazeMap.tsx`), memetakan temuan sisa artefak simulasi fiktif yang tidak berbasis penginderaan jauh, serta merumuskan standardisasi data riil WebGIS BNPB ArcGIS dan satelit pengorbit polar (NASA MODIS & NOAA VIIRS).

---

## 1. Temuan Kritis: 3 Sisa Artefak Simulasi (Gimmick Tells)

Meskipun kontrol ekstrem (Water Bombing dan Operasi TMC) telah dibersihkan pada iterasi sebelumnya, audit mendalam menemukan 3 residu yang tidak sesuai dengan karakteristik observasi satelit riil:

| Sisa Artefak | Lokasi Kode | Masalah Ilmiah & Integritas Data | Solusi Standardisasi Data Riil |
| :--- | :--- | :--- | :--- |
| **1. Layer "Komparasi 6 Jam" (`side_by_side`)** | `FireHazeMap.tsx:389-402` | Menggeser koordinat titik api secara fiktif `[lat + 0.15, lng - 0.15]` dan mengalikan radius `* 1.45`. Ini adalah simulasi visual tanpa dasar fisik. | **Hapus layer fiktif tersebut**. Ganti dengan 3 layer observasi murni: *Semua Layer*, *Titik Sensor Satelit (MODIS/VIIRS)*, dan *Dispersi PM2.5 & Vektor Angin*. |
| **2. Jendela Waktu "15 Mnt" & "1 Jam"** | `FireHazeMap.tsx:474-491` | Satelit pengorbit polar (Terra, Aqua, Suomi NPP) hanya melintasi Indonesia 2–4 kali per hari (selang 6–12 jam). Pemilihan interval "15 Menit" adalah sisa antarmuka simulasi transit Oyenza. | Ubah ke **Jendela Overpass Satelit Riil**: `6 Jam Terakhir` (overpass terdekat), `12 Jam Terakhir` (siklus siang/malam), dan `24 Jam Terakhir` (standar harian BNPB/Sipongi). |
| **3. Estimasi Luas Terbakar Manual (`* 18.5`)** | `FireHazeMap.tsx:268` | Luas area terbakar dihitung dari perkalian acak `totalSmokeRadiusKm * 18.5`, mengabaikan data resmi yang sudah ada. | Gunakan **agregasi resmi WebGIS BNPB ArcGIS**: jumlahkan `today_luas_terbakar_ha` langsung dari `bnpbData.provinces` (contoh: 1.134 Ha total 6 provinsi). |

---

## 2. Parameter Satelit Riil & Standar Penginderaan Jauh

Berdasarkan spesifikasi NASA FIRMS dan NOAA NESDIS:

1. **Sensor Satelit**:
   - **NASA MODIS** (Satelit Terra & Aqua): Resolusi 1 km, deteksi kanal termal 4 µm dan 11 µm, Fire Radiative Power (MW).
   - **NOAA VIIRS** (Satelit Suomi-NPP & NOAA-20): Resolusi 375 m (I-band), sensitivitas tinggi untuk titik api kecil dan awal kebakaran kubah gambut.
2. **Indeks Kepercayaan (*Confidence*)**:
   - `Low` ($<30\%$), `Nominal` ($30-80\%$), `High` ($>80\%$). Pada data disajikan dalam persentase terukur.
3. **Brightness Temperature**:
   - Suhu kecerahan kanal inframerah termal (Kelvin). Ambang batas terbakar gambut umumnya berada di rentang $315\text{ K} - 370\text{ K}$ ($42^\circ\text{C} - 97^\circ\text{C}$).
4. **Agregasi Wilayah**:
   - Sinkronisasi layer `mv_prov_karhutla_2026` dari endpoint ArcGIS REST BNPB untuk peringkat 6 provinsi terdampak (Kalbar, Kalteng, Riau, Sumsel, Kalsel, Jambi).

---

## 3. Matriks Dampak Perubahan Kode (Impact Analysis)

1. **`src/types/index.ts`**:
   - Perbarui `MapViewMode`: dari `"both" | "satellite" | "model" | "side_by_side"` menjadi `"both" | "satellite" | "haze_wind"`.
   - Perbarui `TimeWindowHours`: dari `15 | 60 | 180 | 1440` (menit) menjadi `6 | 12 | 24` (jam overpass satelit).
2. **`src/components/FireHazeMap.tsx`**:
   - Hapus kode `projectedCircle` dan tombol `side_by_side`.
   - Gunakan agregasi `bnpbData.provinces.reduce` untuk kartu KPI Estimasi Luas Terbakar.
   - Perbarui tombol jendela waktu menjadi `6 Jam`, `12 Jam`, dan `24 Jam`.
   - Bersihkan seluruh teks tooltip dari kata "simulasi".
3. **`src/components/TimeLapsePlayerDock.tsx`**:
   - Perbarui label tooltip tombol play/pause dari `"Jeda Simulasi"` menjadi `"Jeda Pemutaran Deret Waktu Satelit"`.
4. **`src/app/globals.css`**:
   - Hapus style sisa yang tidak terpakai terkait legenda komparasi 6 jam fiktif.
