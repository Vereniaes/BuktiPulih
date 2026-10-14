# Integrasi Live Weather API & Pemodelan Sebaran Asap Karhutla

Dokumen ini mendokumentasikan spesifikasi integrasi data cuaca aktual (*live weather*) untuk menentukan vektor kecepatan dan arah angin secara presisi pada modul simulasi karhutla platform BuktiPulih.

---

## 1. Analisis Sumber Data Cuaca: BMKG vs Open-Meteo

Dalam pemantauan karhutla di Indonesia (khususnya wilayah gambut Riau, Jambi, Sumatera Selatan, Kalimantan Barat, dan Kalimantan Tengah):

| Kriteria | BMKG Terbuka (Open Data BMKG) | Open-Meteo Weather API |
| :--- | :--- | :--- |
| **Akurasi Spasial** | Berbasis tingkat Kabupaten/Kota (XML statis) | Berbasis koordinat presisi tinggi (*latitude, longitude*) |
| **Aksesibilitas & Latensi** | Rentan pembatasan akses (*timeout* sering terjadi) | Latensi ultra-rendah (< 100ms), 10.000 reques/hari gratis |
| **Parameter Angin** | Arah mata angin umum (arah mata angin 8 penjuru) | `wind_speed_10m` (km/jam) & `wind_direction_10m` (derajat 0-360°) |
| **Parameter Tambahan** | Cuaca umum (Hujan ringan, Berawan) | `relative_humidity_2m` (%) sangat penting untuk risiko gambut |
| **Autentikasi** | Tanpa API Key (namun struktur XML besar) | **Tanpa API Key, mendukung CORS langsung dari peramban** |

### Keputusan Arsitektur:
Gunakan **Open-Meteo API** sebagai penyedia data primer berbasis koordinat langsung, dengan *fallback* cerdas ke data klimatologi rata-rata provinsi jika gawai sedang berada dalam mode luring (*offline*).

---

## 2. Spesifikasi Endpoint & Kontrak Respon

### Endpoint:
```http
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=wind_speed_10m,wind_direction_10m,relative_humidity_2m&wind_speed_unit=kmh
```

### Sampel Respon Nyata:
```json
{
  "latitude": 0.527,
  "longitude": 101.417,
  "current_units": {
    "wind_speed_10m": "km/h",
    "wind_direction_10m": "°",
    "relative_humidity_2m": "%"
  },
  "current": {
    "time": "2026-10-14T14:15",
    "wind_speed_10m": 12.5,
    "wind_direction_10m": 108,
    "relative_humidity_2m": 72
  }
}
```

---

## 3. Matematika Konversi Arah Angin & Vektor Dispersi

### 1. Konversi Derajat ke 8 Arah Mata Angin (Indonesian Cardinal Directions):
Derajat angin menyatakan **dari mana angin bertiup**.
Untuk memetakan ke 8 arah kompas:
$$index = \left\lfloor \frac{\text{derajat} + 22.5}{45} \right\rfloor \pmod 8$$

| Index | Kode Arah | Nama Indonesia | Rentang Derajat |
| :--- | :--- | :--- | :--- |
| 0 | **U** | Utara (North) | 337.5° – 22.5° |
| 1 | **TL** | Timur Laut (North-East) | 22.5° – 67.5° |
| 2 | **T** | Timur (East) | 67.5° – 112.5° |
| 3 | **TG** | Tenggara (South-East) | 112.5° – 157.5° |
| 4 | **S** | Selatan (South) | 157.5° – 202.5° |
| 5 | **BD** | Barat Daya (South-West) | 202.5° – 247.5° |
| 6 | **B** | Barat (West) | 247.5° – 292.5° |
| 7 | **BL** | Barat Laut (North-West) | 292.5° – 337.5° |

### 2. Arah Aliran Partikel Asap:
Angin bertiup dari derajat $\theta_{\text{wind}}$ menuju arah sebaliknya ($\theta_{\text{wind}} + 180^\circ$).
Dalam simulasi partikel kanvas 2D:
$$v_x = v \cdot \sin(\theta_{\text{drift}})$$
$$v_y = -v \cdot \cos(\theta_{\text{drift}})$$
di mana $\theta_{\text{drift}} = (\theta_{\text{wind}} + 180^\circ) \times \frac{\pi}{180}$.

---

## 4. Efek Kelembapan Relatif (RH) terhadap Karhutla
* **RH > 80% (Lembap / Pagi Hari)**: Partikel asap cenderung tertahan dekat permukaan (*inversion layer*), warna asap lebih putih/kabut air, pembakaran api bergerak lambat.
* **RH 50% - 80% (Sedang)**: Kondisi standar hembusan asap oranye tebal.
* **RH < 50% (Kering Ekstrem / Siang Hari)**: Risiko pembakaran melonjak drastis, partikel asap membubung tinggi dan cepat menyebar (*rapid crowning/smoldering*).

---

## 5. Strategi Caching & Penghematan Kuota
1. Simpan hasil cuaca per koordinat titik api (dibulatkan 2 desimal) dalam *cache* memori dengan masa berlaku (*TTL*) 15 menit.
2. Saat pengguna berpindah titik api di tabel, periksa apakah data cuaca wilayah tersebut sudah tersimpan di *cache*; jika belum, lakukan pemanggilan API secara asinkron tanpa memblokir antarmuka pengguna (*non-blocking UI*).
