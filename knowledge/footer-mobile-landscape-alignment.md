# Analisis & Spesifikasi Teknis: Keterlihatan Burung & Keselarasan Lanskap Footer Seluler

## 1. Analisis Kebutuhan Desain
Berdasarkan evaluasi visual pada peramban desktop dan ponsel pintar:
1. **Keterlihatan Kawanan Burung**: Lapisan gradasi kabur buatan di bagian atas (.footer-top-blend) sebelumnya menutupi kawanan burung yang terbang di area langit. Warna langit teratas ilustrasi naturally berpadu dengan `--surface-bg` halaman (`#F6F1E7`), sehingga penutup gradasi tersebut dinonaktifkan sepenuhnya.
2. **Keselarasan Lanskap pada Layar Seluler**: Pada layar ponsel, susunan kolom teks navigasi bertumpuk vertikal memanjang hingga sekitar 600 piksel. Apabila kanvas lanskap dipaksa membentang penuh di seluruh kontainer kaki halaman setinggi 750 piksel, gambar dengan orientasi lanskap terdorong ke bawah dan tertutup oleh panel navigasi hijau. Hal tersebut menyebabkan teks kampanye *"Pulihkan Lahan, Rawat Masa Depan"* berada di area langit kosong tanpa latar pegunungan.
3. **Penyelarasan Proporsi Mobile**: Panggung lanskap pada layar ponsel (lebar <= 768px) dikunci setinggi 260px. Teks judul kampanye dan kawanan burung duduk tepat di atas pemandangan alam secara proporsional seperti versi desktop, kemudian panel navigasi hijau menyambung di bawahnya dengan transisi kabur lembut.

## 2. Implementasi Teknis CSS
1. **Posisi Kanvas Desktop**: `object-position: center 20%` memastikan kawanan burung dan puncak pegunungan tampak tajam tanpa terpotong di batas atas.
2. **Panggung Seluler**:
   - `.footer-backdrop-canvas`: `bottom: auto; height: 260px;`
   - `.footer-backdrop-img`: `object-position: center 25%;`
   - `.footer-hero-wrapper`: `min-height: 230px; display: flex; align-items: center;`
   - `.footer-base-panel`: `background: linear-gradient(180deg, rgba(31, 73, 59, 0.7) 0%, #1F493B 40px, #1F493B 100%); backdrop-filter: blur(6px);`

## 3. Hasil Pengujian
Pengujian visual Playwright pada desktop 1440px dan ponsel 390px mengonfirmasi:
- Kawanan burung di langit terlihat jelas dan tajam.
- Teks kampanye melayang tepat di atas lanskap alam baik pada desktop maupun ponsel.
- Panel navigasi hijau mempertahankan keterbacaan tinggi dengan transisi halus.
