# Spesifikasi Kontrak API & Mock Data (BuktiPulih v1.0)
**Arsitektur RESTful JSON — Selaras dengan MongoDB & Adapter WebGIS BNPB**

---

## 1. Konvensi Global & Standar API

### A. Base URL & Prefix
- **Development:** `http://localhost:5000/api/v1` (Backend service `bukti-pulih-be`)
- **Frontend BFF / Mock:** `http://localhost:3000/api/v1` (Next.js Route Handlers)
- **Production:** `https://api.buktipulih.id/api/v1` (Google Cloud Run)

### B. Standard Response Envelopes

#### 1. Success Envelope (`200 OK`, `201 Created`)
```json
{
  "status": "success",
  "data": {},
  "meta": {
    "timestamp": "2026-10-13T23:20:00.000Z",
    "version": "v1.0"
  }
}
```

#### 2. Error Envelope (`400`, `401`, `403`, `404`, `422`, `500`)
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Koordinat GPS tidak valid.",
    "details": [
      {
        "field": "latitude",
        "issue": "Nilai latitude harus berada di antara -90 dan 90."
      }
    ]
  },
  "meta": {
    "timestamp": "2026-10-13T23:20:00.000Z"
  }
}
```

### C. Autentikasi & Cookie Sesi
- Sesi disimpan dalam cookie berformat HTTP-Only:
  `Set-Cookie: bp_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000` (30 hari).
- Endpoint publik dapat diakses tanpa cookie sesi (`PUBLIC_GUEST`).

---

## 2. Modul 1: Dashboard Peta Restorasi & Impact Ledger

### 1.1 `GET /api/v1/plots`
Mengambil daftar petak restorasi untuk visualisasi pada peta Leaflet.js dengan marker clustering.

- **Query Parameters:**
  - `region` (opsional, string): Filter wilayah (contoh: `Kalimantan Barat`, `Jawa Barat`).
  - `status` (opsional, string): `subur` | `perlu_rawat` | `kritis`.
  - `bbox` (opsional, string): Bounding box format `minLng,minLat,maxLng,maxLat` untuk kueri spasial viewport peta.
- **Status Response:** `200 OK`
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "670c5e1b1d8f8a001a111111",
        "geometry": {
          "type": "Point",
          "coordinates": [109.3333, -0.0222]
        },
        "properties": {
          "plot_code": "PL-KALBAR-001",
          "name": "Petak Restorasi Gambut Parit Tokaya",
          "region": "Kalimantan Barat",
          "ecosystem_type": "gambut",
          "community_name": "Kelompok Tani Peduli Gambut Kubu Raya",
          "total_planted": 1200,
          "current_alive": 1040,
          "survival_rate": 86.67,
          "latest_status": "subur",
          "last_monitored_at": "2026-10-12T07:15:00.000Z",
          "cover_image_url": "https://storage.buktipulih.id/plots/PL-KALBAR-001-cover.webp"
        }
      },
      {
        "type": "Feature",
        "id": "670c5e1b1d8f8a001a111112",
        "geometry": {
          "type": "Point",
          "coordinates": [106.9924, -6.2383]
        },
        "properties": {
          "plot_code": "PL-BEKASI-002",
          "name": "Hutan Kota Patriot Bina Bangsa",
          "region": "Jawa Barat",
          "ecosystem_type": "hutan_kota",
          "community_name": "Relawan Hijau Patriot Bekasi",
          "total_planted": 850,
          "current_alive": 710,
          "survival_rate": 83.53,
          "latest_status": "subur",
          "last_monitored_at": "2026-10-11T10:00:00.000Z",
          "cover_image_url": "https://storage.buktipulih.id/plots/PL-BEKASI-002-cover.webp"
        }
      }
    ]
  },
  "meta": {
    "total_count": 2,
    "timestamp": "2026-10-13T23:20:00.000Z"
  }
}
```

---

### 1.2 `GET /api/v1/plots/:id/summary`
Mengambil informasi lengkap petak saat pengguna memilih marker pin atau item pada daftar petak (ditampilkan di Bottom Sheet mobile / Side Panel desktop).

- **Path Parameter:** `id` (MongoDB ObjectId).
- **Status Response:** `200 OK`
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "id": "670c5e1b1d8f8a001a111111",
    "plot_code": "PL-KALBAR-001",
    "name": "Petak Restorasi Gambut Parit Tokaya",
    "region": "Kalimantan Barat",
    "ecosystem_type": "gambut",
    "area_hectares": 2.5,
    "community_name": "Kelompok Tani Peduli Gambut Kubu Raya",
    "coordinator": {
      "name": "Pak Suwardi",
      "phone_contact": "0812-3456-7890",
      "is_verified": true
    },
    "planting_timeline": {
      "initial_planting_date": "2026-01-15T00:00:00.000Z",
      "days_since_planted": 271,
      "last_monitored_at": "2026-10-12T07:15:00.000Z"
    },
    "tree_metrics": {
      "total_planted": 1200,
      "current_alive": 1040,
      "dead_count": 160,
      "survival_rate": 86.67,
      "primary_species": "Jelutung Rawa & Belangeran",
      "status": "subur"
    },
    "environmental_condition": {
      "peat_water_table_cm": -25,
      "soil_moisture_level": "optimal",
      "air_quality_index": "Sedang (PM2.5: 38)"
    },
    "recent_logs": [
      {
        "log_id": "670c6a2b1d8f8a001a222221",
        "date": "2026-10-12T07:15:00.000Z",
        "notes": "Parit gambut masih basah, daun bertambah banyak dan tunas kokoh.",
        "photo_url": "https://storage.buktipulih.id/logs/PL-KALBAR-001-m6.webp",
        "reporter": "Pak Suwardi"
      }
    ]
  }
}
```

---

### 1.3 `GET /api/v1/metrics/impact-ledger`
Agregasi angka akuntabilitas nasional untuk baris ringkasan metrik di atas peta.

- **Status Response:** `200 OK`
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "total_planted_trees": 15420,
    "total_alive_trees": 13180,
    "overall_survival_rate": 85.47,
    "restored_area_hectares": 48.75,
    "active_plots_count": 18,
    "active_communities_count": 9,
    "total_field_reports": 242,
    "last_updated_at": "2026-10-13T23:15:00.000Z"
  }
}
```

---

### 1.4 `GET /api/v1/external/bnpb-karhutla`
Adapter penyelarasan data riil karhutla dari WebGIS BNPB ArcGIS REST Server dengan komparasi restorasi BuktiPulih.

- **Status Response:** `200 OK`
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "source": "WebGIS BNPB (gis.bnpb.go.id - 2026_karhutla)",
    "sync_timestamp": "2026-09-26T00:00:00.000Z",
    "provinces": [
      {
        "provinsi": "Kalimantan Barat",
        "tgl_update": "2026-09-26",
        "today_luas_terbakar_ha": 120.44,
        "total_hotspot": 44,
        "relawan_lapangan": 5281,
        "kualitas_udara_pm25": "Tidak Sehat",
        "buktipulih_coverage": {
          "active_plots": 6,
          "restored_area_ha": 18.2,
          "alive_trees": 4850
        }
      },
      {
        "provinsi": "Kalimantan Tengah",
        "tgl_update": "2026-09-26",
        "today_luas_terbakar_ha": 335.1,
        "total_hotspot": 3608,
        "relawan_lapangan": 1163,
        "kualitas_udara_pm25": "Baik-Berbahaya",
        "buktipulih_coverage": {
          "active_plots": 4,
          "restored_area_ha": 12.5,
          "alive_trees": 3200
        }
      }
    ]
  }
}
```

---

## 3. Modul 2: Linimasa Partisipasi Relawan (Instagram Notes Collage)

### 2.1 `GET /api/v1/timeline`
Menampilkan kartu-kartu memo lapangan (*Before vs After*) berurutan dari yang terbaru (*reverse chronological*).

- **Query Parameters:**
  - `plot_id` (opsional): Filter per petak spesifik.
  - `page` (default: 1, integer).
  - `limit` (default: 10, integer, maks: 20).
- **Status Response:** `200 OK`
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": "670c6a2b1d8f8a001a222221",
        "plot_id": "670c5e1b1d8f8a001a111111",
        "plot_code": "PL-KALBAR-001",
        "plot_name": "Petak Gambut Parit Tokaya",
        "reporter": {
          "user_id": "670c50001d8f8a001a000001",
          "full_name": "Pak Suwardi",
          "role_label": "Kader Lapangan Terdaftar",
          "is_verified": true
        },
        "monitoring_date": "2026-10-12T07:15:00.000Z",
        "postmark_badge": "📅 12 Okt 2026 • Petak #KB-04",
        "tree_metrics": {
          "height_cm": 85,
          "condition_status": "subur",
          "condition_label": "Tumbuh Subur 🌿",
          "estimated_survival_rate": 88.5
        },
        "field_notes": "Alhamdulillah, bibit jelutung rawa petak utara sudah berdaun lebat. Sekat kanal gambut berfungsi menjaga kelembaban tanah sehingga tidak terbakar di kemarau.",
        "images": {
          "initial_photo_url": "https://storage.buktipulih.id/logs/PL-KALBAR-001-m0.webp",
          "initial_label": "15 Jan 2026 (Bibit 20cm)",
          "current_photo_url": "https://storage.buktipulih.id/logs/PL-KALBAR-001-m6.webp",
          "current_label": "12 Okt 2026 (Pohon 85cm)"
        },
        "community_verifications": {
          "confirmed_subur_count": 42,
          "dispute_count": 0,
          "user_has_verified": false
        },
        "comment_count": 8
      }
    ],
    "pagination": {
      "current_page": 1,
      "limit": 10,
      "total_items": 42,
      "total_pages": 5,
      "has_next": true
    }
  }
}
```

---

### 2.2 `POST /api/v1/timeline/:id/verify`
Pengunjung memberikan konfirmasi terhadap kondisi tanaman pada kartu log lapangan.

- **Path Parameter:** `id` (ID log).
- **Request Body:**
```json
{
  "type": "subur",
  "client_fingerprint": "anon_session_88192a"
}
```
- **Status Response:** `200 OK`
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "log_id": "670c6a2b1d8f8a001a222221",
    "updated_confirmed_subur_count": 43,
    "user_has_verified": true,
    "message": "Terima kasih atas konfirmasi Anda!"
  }
}
```

---

### 2.3 `POST /api/v1/timeline/:id/comments`
Pengunjung memberikan catatan dukungan atau pertanyaan pada catatan memo lapangan.

- **Request Body:**
```json
{
  "author_name": "Rina Wijaya",
  "author_badge": "donatur",
  "content": "Senang sekali melihat bibit jelutungnya bertahan. Semangat terus kelompok tani!"
}
```
- **Status Response:** `201 Created`
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "comment_id": "670c7b3c1d8f8a001a333331",
    "log_id": "670c6a2b1d8f8a001a222221",
    "author_name": "Rina Wijaya",
    "author_badge": "donatur",
    "content": "Senang sekali melihat bibit jelutungnya bertahan. Semangat terus kelompok tani!",
    "created_at": "2026-10-13T23:20:00.000Z"
  }
}
```

---

## 4. Modul 3: Formulir Pelaporan Lapangan (Kader Wizard)

### 3.1 `POST /api/v1/reports`
Menerima laporan monitoring tumbuh kembang bibit dari kader di lapangan.

- **Headers:** `Content-Type: multipart/form-data`
- **Authentication:** Memerlukan sesi kader login (`COMMUNITY_VOLUNTEER`).
- **Form Fields:**
  - `plot_id` (string, required): ObjectId petak terkait.
  - `tree_condition` (string, required): `subur` | `perlu_rawat` | `mati`.
  - `height_cm` (number, required): Tinggi bibit dalam cm (1 s/d 1000).
  - `latitude` (number, required): Koordinat lintang (-90 s/d 90).
  - `longitude` (number, required): Koordinat bujur (-180 s/d 180).
  - `accuracy_meters` (number, optional): Akurasi GPS perangkat.
  - `quick_tags` (string JSON array, optional): `["Saluran Air Normal"]`.
  - `notes` (string, optional, maks 500 karakter).
  - `photo` (file, required): File citra WebP/JPEG/PNG maksimal 1.5MB.
- **Status Response:** `201 Created`
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "report_id": "670c8c4d1d8f8a001a444441",
    "plot_code": "PL-KALBAR-001",
    "tree_condition": "subur",
    "height_cm": 85,
    "photo_url": "https://storage.buktipulih.id/reports/PL-KALBAR-001-uuid.webp",
    "verification_status": "published",
    "message": "Laporan lapangan berhasil disimpan dan dipublikasikan."
  }
}
```

---

### 3.2 `POST /api/v1/reports/offline-batch`
Menerima kumpulan antrean laporan yang tersimpan di `IndexedDB` browser kader saat ponsel kembali memperoleh sinyal internet.

- **Request Body:**
```json
{
  "batch": [
    {
      "client_temp_id": "offline_draft_001",
      "plot_id": "670c5e1b1d8f8a001a111111",
      "tree_condition": "subur",
      "height_cm": 85,
      "latitude": -0.02241,
      "longitude": 109.33318,
      "notes": "Laporan offline petak utara",
      "photo_base64": "data:image/webp;base64,UklGR...",
      "client_recorded_at": "2026-10-13T10:00:00.000Z"
    }
  ]
}
```
- **Status Response:** `200 OK`
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "synced_count": 1,
    "failed_count": 0,
    "results": [
      {
        "client_temp_id": "offline_draft_001",
        "status": "synced",
        "report_id": "670c8c4d1d8f8a001a444442"
      }
    ]
  }
}
```

---

## 5. Modul 4: Autentikasi Ringan & Profil Kader

### 4.1 `POST /api/v1/auth/login`
Autentikasi kader lapangan menggunakan Nomor WhatsApp dan PIN 6 digit tanpa kata sandi rumit.

- **Request Body:**
```json
{
  "phone_number": "081234567890",
  "pin": "123456"
}
```
- **Status Response:** `200 OK`
- **Set-Cookie Header:**
  `bp_session=eyJhbGciOiJIUzI1Ni...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "670c50001d8f8a001a000001",
      "full_name": "Pak Suwardi",
      "phone_number": "081234567890",
      "role": "COMMUNITY_VOLUNTEER",
      "role_badge": "🌿 Kader Terdaftar ✓",
      "organization_name": "Kelompok Tani Peduli Gambut Kubu Raya",
      "assigned_plots": ["PL-KALBAR-001"]
    },
    "message": "Selamat datang kembali, Pak Suwardi!"
  }
}
```

---

### 4.2 `GET /api/v1/auth/me`
Mengambil profil sesi aktif dari cookie browser.

- **Status Response:** `200 OK` (atau `401 Unauthorized` jika belum login).
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "authenticated": true,
    "user": {
      "id": "670c50001d8f8a001a000001",
      "full_name": "Pak Suwardi",
      "role": "COMMUNITY_VOLUNTEER",
      "role_badge": "🌿 Kader Terdaftar ✓",
      "organization_name": "Kelompok Tani Peduli Gambut Kubu Raya"
    }
  }
}
```

---

### 4.3 `POST /api/v1/auth/logout`
Menghapus sesi login.

- **Status Response:** `200 OK`
- **Set-Cookie Header:** `bp_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
- **Payload Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Sesi telah ditutup."
  }
}
```
