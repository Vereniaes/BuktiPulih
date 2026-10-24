# Konsep Desain & Spesifikasi Ilustrasi Pemulihan / Reboisasi Gambut pada Footer

Dokumen ini mendokumentasikan analisis kritis, spesifikasi visual artistik, dan integrasi teknis ilustrasi pemulihan lahan (*reforestation landscape*) pada footer platform BuktiPulih.

---

## 1. Analisis Kritis & Anti-Slop Framework

Berdasarkan referensi visual yang diajukan (gaya situs Hollara) dan aturan anti-slop:

### A. Mengapa Menolak Ilustrasi 3D / Kartun AI Generik?
- Platform BuktiPulih berfokus pada akuntabilitas kebakaran hutan dan lahan (karhutla) nyata serta data satelit WebGIS BNPB.
- Ilustrasi 3D glossy (gaya Pixar/Disney) atau gambar generik subtropis (pohon pinus, rumah pedesaan Eropa) akan terasa asing (*out-of-place*) dan menurunkan bobot integritas platform.
- **Arah Visual yang Tepat:** Seni editorial bernuansa cat gouache / risograph / cetak kayu (*woodblock/linocut*) bernada hangat (*warm paper tone* `#F6F1E7`). Menggambarkan lanskap terestrial Indonesia: lahan basah gambut yang pulih, air rawa jernih kecokelatan yang tertahan oleh sekat kanal (*canal block*), vegetasi endemik (Jelutung rawa, Belangeran, Meranti rawa), serta siluet kader komunitas warga lokal yang menatap masa depan pemulihan lingkungan.

### B. Keterbacaan Teks (*Accessibility & Contrast*)
- Meletakkan teks navigasi di atas gambar bertekstur rumit melanggar standar WCAG 2.1 AA.
- Oleh karena itu, arsitektur tata letak terbaik adalah memisahkan teks footer (3 kolom navigasi dan copyright) dengan pita panorama ilustrasi di bagian dasar (*bottom grounding banner*), persis seperti struktur referensi Hollara.

---

## 2. Parameter Pembuatan Aset Gambar (Image Generation Prompting)

- **Aspek Rasio:** 16:9 atau 21:9 (Panorama mendatar lebar).
- **Palet Warna:** Warm parchment cream (`#F6F1E7`), deep forest green (`#0E753B`, `#15803D`), earthy peat brown (`#78350F`, `#451A03`), soft morning haze.
- **Subjek:** Dua kader pemulihan lingkungan (pria dan perempuan berpenampilan masyarakat Indonesia) dari samping/belakang, memandang lanskap hijau reboisasi lahan gambut yang subur dengan sekat kanal kayu tradisional dan kanopi pohon tropis yang tumbuh kembali pasca-kebakaran.
- **Gaya Seni:** Warm storybook gouache painting, editorial atmospheric illustration, clean silhouetted foreground, soft hand-painted brush textures, no 3D render, no glossy futuristic effects.

---

## 3. Matriks Komparasi 3 Pendekatan Implementasi

| Parameter | Opsi 1: Bottom Grounding Landscape Banner | Opsi 2: Split 2-Kolom (Ilustrasi Kartu Samping) | Opsi 3: Atmospheric Watermark Backdrop |
| :--- | :--- | :--- | :--- |
| **Kesesuaian Referensi Hollara** | 100% Cocok (Identik dengan tata letak referensi) | Berbeda (Model kartu samping) | Berbeda (Model latar belakang samar) |
| **Keterbacaan Teks Footer** | Sempurna (Teks terpisah dari gambar) | Sempurna (Teks di kolom kanan mandiri) | Rentan bertabrakan kontras |
| **Respon Mode Gelap** | Mudah diintegrasikan dengan filter blend halus | Memerlukan border kartu gelap | Rentan tidak terlihat di latar `#080C0E` |
| **Kekuatan Emosional Seni** | Sangat Kuat (Penutup visual yang megah) | Cukup Kuat (Terkotak dalam kartu) | Lemah (Tersamar oleh teks) |
