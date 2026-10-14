# Panduan Konfigurasi Google Cloud Platform (GCP) & Firebase Console — BuktiPulih

Dokumen ini merupakan panduan operasional langkah demi langkah untuk melakukan konfigurasi infrastruktur cloud BuktiPulih pada Google Cloud Console dan Firebase Console, dengan fokus pada:
- Pemanfaatan GCP Free Tier & proteksi kuota biaya (Zero-Cost Target).
- Penempatan region Jakarta (`asia-southeast2`) demi latensi rendah (<50ms).
- Konfigurasi penyimpanan foto restorasi (Firebase Storage & Cloud Storage CORS).
- Deployment kontainer backend Express dan frontend Next.js pada Cloud Run.

---

## 1. Persiapan Proyek & Proteksi Anggaran Biaya (Billing Alert)

### 1.1 Pembuatan Proyek GCP
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Klik dropdown pemilih proyek di bilah atas, lalu pilih **New Project**.
3. Isi parameter proyek:
   - **Project name**: `buktipulih-uinic`
   - **Organization**: No organization (atau biarkan default akun pribadi).
4. Klik **Create** dan tunggu proses provisi proyek selesai (kurang lebih 10 detik).
5. Pastikan proyek yang aktif pada dropdown atas adalah `buktipulih-uinic`.

### 1.2 Penautan Akun Billing & Pengaturan Budget Alert Rp 0 / Free Tier
Agar tidak terjadi pembengkakan biaya tak terduga (overbilling), wajib memasang alert anggaran:
1. Buka menu navigasi kiri (`☰`) -> **Billing** -> **Budgets & alerts**.
2. Klik tombol **Create Budget**.
3. **Langkah 1 (Scope)**:
   - **Name**: `Alert-Free-Tier-BuktiPulih`
   - **Projects**: Pilih `buktipulih-uinic`.
4. **Langkah 2 (Amount)**:
   - **Budget type**: Specified amount
   - **Target amount**: Masukkan `Rp 10.000` (atau `$1.00` jika akun USD).
5. **Langkah 3 (Actions & Thresholds)**:
   - Pasang pemicu peringatan pada persentase: `50%`, `90%`, dan `100%`.
   - Centang **Email alerts to billing admins and users**.
6. Klik **Finish**. Peringatan otomatis akan dikirim ke email jika penggunaan mendekati ambang batas gratis.

---

## 2. Pengaktifan API Layanan GCP (Enabled APIs)

Buka menu **APIs & Services** -> **Library** pada GCP Console, lalu cari dan klik tombol **ENABLE** untuk 4 API berikut:

| Nama Layanan API | Identifier API | Fungsi untuk BuktiPulih |
| :--- | :--- | :--- |
| **Cloud Run Admin API** | `run.googleapis.com` | Menjalankan kontainer backend dan frontend secara serverless |
| **Artifact Registry API** | `artifactregistry.googleapis.com` | Registri penyimpanan image Docker aplikasi |
| **Cloud Storage API** | `storage.googleapis.com` | Penyimpanan berkas foto pemantauan lapangan kader |
| **Secret Manager API** | `secretmanager.googleapis.com` | Menyimpan variabel rahasia (`MONGODB_URI`, `JWT_SECRET`) |

> Alternatif melalui Google Cloud Shell:
> ```bash
> gcloud services enable run.googleapis.com artifactregistry.googleapis.com storage.googleapis.com secretmanager.googleapis.com
> ```

---

## 3. Konfigurasi Artifact Registry (Docker Repository)

Artifact Registry digunakan untuk menampung Docker image sebelum dideploy ke Cloud Run.

1. Buka menu navigasi kiri -> **Artifact Registry** -> **Repositories**.
2. Klik **+ Create Repository**.
3. Masukkan parameter konfigurasi:
   - **Name**: `buktipulih-repo`
   - **Format**: `Docker`
   - **Mode**: `Standard`
   - **Location type**: `Region`
   - **Region**: `asia-southeast2 (Jakarta)`
   - **Encryption**: `Google-managed encryption key`
4. Klik **Create**.
5. Alamat registri yang terbentuk:  
   `asia-southeast2-docker.pkg.dev/<PROJECT_ID>/buktipulih-repo`

---

## 4. Konfigurasi Variabel Rahasia (Secret Manager)

Gunakan Secret Manager untuk mencegah kebocoran kredensial pada repository git:

1. Buka menu navigasi kiri -> **Security** -> **Secret Manager**.
2. Klik **+ Create Secret**:
   - Secret 1:
     - **Name**: `BP_MONGODB_URI`
     - **Secret value**: Masukkan connection string MongoDB Atlas (contoh: `mongodb+srv://user:pass@cluster.mongodb.net/buktipulih_db?retryWrites=true&w=majority`)
   - Secret 2:
     - **Name**: `BP_JWT_SECRET`
     - **Secret value**: Masukkan string kunci acak minimal 32 karakter (contoh: `buktipulih_uinic_production_jwt_secret_key_2026_xyz`)
   - Secret 3:
     - **Name**: `BP_COOKIE_SECRET`
     - **Secret value**: Masukkan string kunci acak pengacak cookie sesi
3. Klik **Create Secret** untuk setiap entri.

---

## 5. Konfigurasi Firebase Console (Firebase Storage & CORS)

### 5.1 Integrasi GCP Project ke Firebase Console
1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Klik **Add project** (Tambahkan proyek).
3. Pada pilihan proyek, jangan buat baru, melainkan pilih proyek GCP yang sudah dibuat: `buktipulih-uinic`.
4. Klik **Continue**.
5. Pada pilihan Google Analytics, pilih opsi opsional (bisa diaktifkan atau dinonaktifkan sesuai preferensi), lalu klik **Add Firebase**.

### 5.2 Pengaktifan Firebase Storage (Penyimpanan Foto Lapangan)
1. Pada menu navigasi Firebase sebelah kiri, buka **Build** -> **Storage**.
2. Klik tombol **Get started**.
3. **Pilihan mode keamanan**: Pilih **Start in production mode**.
4. **Cloud Storage location**: Wajib pilih `asia-southeast2` (Jakarta) agar sejalan dengan Cloud Run dan meminimalisir biaya transfer antar wilayah.
5. Klik **Done**.

### 5.3 Konfigurasi Aturan Akses (Storage Security Rules)
Buka tab **Rules** pada Firebase Storage, masukkan aturan berikut:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Foto laporan restorasi dapat dilihat oleh publik
    match /monitoring_reports/{allPaths=**} {
      allow read: if true;
      // Unggah foto hanya jika format berkas berupa gambar dan ukuran maksimal 2MB
      allow write: if request.resource.size < 2 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Foto avatar kader
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 1 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```
Klik tombol **Publish**.

### 5.4 Konfigurasi CORS Storage (Agar Web Browser Bebas Error CORS saat Upload)
Secara bawaan Google Cloud Storage memblokir permintaan direct browser upload dari domain eksternal. Untuk mengatasinya:
1. Buka Google Cloud Shell di sudut kanan atas GCP Console.
2. Buat berkas `cors.json`:
   ```bash
   cat <<EOF > cors.json
   [
     {
       "origin": ["*"],
       "method": ["GET", "POST", "PUT", "HEAD"],
       "responseHeader": ["Content-Type", "Access-Control-Allow-Origin", "x-goog-resumable"],
       "maxAgeSeconds": 3600
     }
   ]
   EOF
   ```
3. Terapkan konfigurasi CORS ke bucket Firebase:
   ```bash
   gsutil cors set cors.json gs://<PROJECT_ID>.firebasestorage.app
   ```
   *(Ganti `<PROJECT_ID>` dengan ID proyek Anda, misalnya `buktipulih-uinic`)*.

---

## 6. Spesifikasi & Konfigurasi Cloud Run

BuktiPulih menggunakan dua layanan Cloud Run yang terpisah demi prinsip arsitektur modular:

### 6.1 Layanan 1: Backend API (`bukti-pulih-be`)
1. Buka **Cloud Run** -> **Create Service**.
2. **Container image URL**:  
   `asia-southeast2-docker.pkg.dev/<PROJECT_ID>/buktipulih-repo/bukti-pulih-be:latest`
3. **Service name**: `bukti-pulih-be`
4. **Region**: `asia-southeast2 (Jakarta)`
5. **CPU allocation and pricing**: Pilih `CPU is only allocated during request processing` (Serverless Free Tier).
6. **Autoscaling**:
   - **Minimum number of instances**: `0` (skala ke nol saat tidak ada traffic agar gratis).
   - **Maximum number of instances**: `2` (membatasi lonjakan biaya tak terduga).
7. **Ingress**: `All` (Allow traffic from the internet).
8. **Authentication**: `Allow unauthenticated invocations` (karena API publik dikonsumsi web frontend).
9. **Container Settings (Tab Container, Networking, Security)**:
   - **Container port**: `8080`
   - **Memory**: `512 MiB`
   - **CPU**: `1 vCPU`
   - **Execution environment**: `Default`
10. **Environment Variables**:
    - `NODE_ENV`: `production`
    - `CORS_ORIGIN`: `https://buktipulih-web-<hash>-as.a.run.app,https://buktipulih.web.id`
    - `BNPB_ARCGIS_ENDPOINT`: `https://gis.bnpb.go.id/server/rest/services/2026_karhutla/mv_prov_karhutla_2026/MapServer/3/query`
11. **Reference Secrets (dari Secret Manager)**:
    - Sambungkan secret `BP_MONGODB_URI` ke variabel `MONGODB_URI`.
    - Sambungkan secret `BP_JWT_SECRET` ke variabel `JWT_SECRET`.
    - Sambungkan secret `BP_COOKIE_SECRET` ke variabel `COOKIE_SECRET`.
12. Klik **Create**. Catat URL backend yang dihasilkan (contoh: `https://bukti-pulih-be-xxxx-as.a.run.app`).

---

### 6.2 Layanan 2: Frontend Web (`bukti-pulih-fe`)
1. Buka **Cloud Run** -> **Create Service**.
2. **Container image URL**:  
   `asia-southeast2-docker.pkg.dev/<PROJECT_ID>/buktipulih-repo/bukti-pulih-fe:latest`
3. **Service name**: `bukti-pulih-fe`
4. **Region**: `asia-southeast2 (Jakarta)`
5. **Autoscaling**:
   - **Minimum number of instances**: `0`
   - **Maximum number of instances**: `2`
6. **Ingress**: `All`
7. **Authentication**: `Allow unauthenticated invocations`
8. **Container Settings**:
   - **Container port**: `3000` (sesuai port Next.js standalone runner)
   - **Memory**: `512 MiB`
   - **CPU**: `1 vCPU`
9. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `NEXT_PUBLIC_API_URL`: URL layanan backend Cloud Run yang telah dibuat di langkah 6.1 (contoh: `https://bukti-pulih-be-xxxx-as.a.run.app/api/v1`)
10. Klik **Create**. URL web yang dihasilkan dapat langsung diakses oleh publik dan dewan juri.

---

## 7. Perintah Build & Push Docker (Referensi Terminal Pengembang)

Jalankan perintah ini di workstation lokal saat hendak melakukan rilis produksi:

```bash
# Otentikasi gcloud CLI ke Artifact Registry
gcloud auth configure-docker asia-southeast2-docker.pkg.dev

# 1. Build & Push Backend
docker build -t asia-southeast2-docker.pkg.dev/<PROJECT_ID>/buktipulih-repo/bukti-pulih-be:latest ./bukti-pulih-be
docker push asia-southeast2-docker.pkg.dev/<PROJECT_ID>/buktipulih-repo/bukti-pulih-be:latest

# 2. Build & Push Frontend
docker build -t asia-southeast2-docker.pkg.dev/<PROJECT_ID>/buktipulih-repo/bukti-pulih-fe:latest ./BuktiPulih
docker push asia-southeast2-docker.pkg.dev/<PROJECT_ID>/buktipulih-repo/bukti-pulih-fe:latest

# 3. Deploy langsung ke Cloud Run
gcloud run deploy bukti-pulih-be \
  --image asia-southeast2-docker.pkg.dev/<PROJECT_ID>/buktipulih-repo/bukti-pulih-be:latest \
  --region asia-southeast2

gcloud run deploy bukti-pulih-fe \
  --image asia-southeast2-docker.pkg.dev/<PROJECT_ID>/buktipulih-repo/bukti-pulih-fe:latest \
  --region asia-southeast2
```

---

## 8. Ringkasan Evaluasi Kepatuhan Kuota GCP Free Tier

| Komponen Arsitektur | Batas Kuota Gratis Bulanan GCP | Alokasi BuktiPulih | Status Evaluasi |
| :--- | :--- | :--- | :--- |
| **Cloud Run Requests** | 2.000.000 permintaan / bulan | Estimasi pengujian juri: ~50.000 | **100% Gratis** |
| **Cloud Run Compute** | 360.000 vCPU-detik & 180.000 GiB-detik | Instans 512MB RAM skala ke nol | **100% Gratis** |
| **Artifact Registry** | 500 MB penyimpanan gratis / bulan | Docker Alpine kompilasi multi-stage (~180MB) | **100% Gratis** |
| **Firebase Storage** | 5 GB kuota simpan & 1 GB unduh / hari | WebP terkompresi (~150KB per foto) | **100% Gratis** |
| **Peta Spasial (Leaflet)** | Tak Terbatas (OpenStreetMap Tile CDN) | Menggantikan Google Maps API ($200 quota) | **Bebas Risiko Biaya** |
| **Network Egress** | 1 GB transfer keluar gratis ke internet | Response API terkompresi JSON | **100% Gratis** |

Infrastruktur ini menjamin platform BuktiPulih dapat berjalan 24/7 selama masa penilaian lomba UINIC 8.0 tanpa risiko pemotongan saldo kartu kredit.
