---
name: anti-slop-ui-roaster
description: Framework audit kritis, roasting antarmuka (anti-AI slop), dan standardisasi desain produk web otentik berkarakter tinggi. Gunakan ketika merancang, mereview, atau memperbaiki UI agar tidak tampak seperti template AI murahan.
---

# Anti-Slop UI Roaster & Design Critique Framework

Keahlian (*skill*) ini memandu agen pengembang untuk mengidentifikasi, mengkritik tajam (*roast*), dan mengeliminasi pola-pola generik buatan AI (*AI slop*) pada antarmuka web, serta menggantinya dengan keputusan desain yang berkarakter, fungsional, dan berpusat pada konten nyata.

---

## 1. Daftar Pola "AI Slop" yang Wajib Dihindari

Setiap antarmuka yang dibuat atau diaudit harus diperiksa dari 6 dosa besar desain generik AI:

1. **The Purple/Blue Gradient Swamp**: Latar belakang kartu hitam pekat yang dipenuhi lingkaran pendar (*glowing orbs*) warna ungu-kebiruan tanpa fungsi hierarki visual yang jelas.
2. **"Inter Everywhere" Copycat**: Seluruh tipografi menggunakan font bawaan sistem yang dingin dan kaku tanpa paduan karakter display atau monospace yang mencerminkan jiwa produk.
3. **Cardocalypse (Banjir Kartu 3 Kolom Seragam)**: Deretan 3-4 kartu berukuran sama persis, masing-masing dengan ikon kotak kecil di pojok kiri atas, judul tebal 1 baris, dan deskripsi abu-abu 2 baris yang terasa seperti template Bootstrap 2018.
4. **Pill-Badge Overload**: Penaburan chip/badge pil membulat penuh (*pill tags*) secara acak di atas setiap judul ("✨ AI Powered", "Beta", "Baru").
5. **Mainan Simulasi Tiruan (Toy Gadgets)**: Penambahan tombol-tombol fiktif atau partikel kanvas yang tidak bersumber dari data nyata dan tidak memberikan nilai kegunaan langsung bagi pengguna lapangan.
6. **Pop-up Trap**: Mengurung konten cerita panjang atau dokumen penting ke dalam jendela modal pop-up sempit sehingga tidak memiliki URL unik, merusak pengalaman seluler, dan tidak terindeks oleh mesin pencari.

---

## 2. Prinsip Rekayasa Antarmuka Otentik (Anti-Slop Principles)

1. **Content-Driven Geometry (Geometri Berbasis Konten)**:
   - Desain tata letak mengikuti panjang dan karakteristik konten asli (misal: rasio foto portrait/landscape alami kader lapangan, bukan dipotong paksa menjadi persegi kaku).
2. **Hairline Precision over Heavy Shadows**:
   - Gunakan garis pembatas 1px yang tajam (`border: 1px solid var(--surface-border)`) dengan palet warna terkurasi daripada tumpukan bayangan buram berat (`box-shadow: 0 20px 40px`).
3. **Dedicated Full Pages for Core Content**:
   - Setiap entitas konten utama (postingan warga, profil petak, laporan audit) wajib memiliki halaman penuh (*full page*) dengan URL mandiri yang dapat di-bookmark dan dibagikan.
4. **Mobile-First Real-World Ergonomics**:
   - Target sentuh minimal 44-48px.
   - Tidak ada teks yang terpotong atau *overflow* horizontal pada layar ponsel (360-390px).
   - Aksi utama mudah dijangkau satu tangan (zona jempol bawah).

---

## 3. Checklist Roasting Sebelum Pengiriman UI

- [ ] Apakah halaman ini memiliki URL permanen yang bisa dibagikan langsung ke WhatsApp?
- [ ] Apakah halaman ini bebas dari ornamen bercahaya tanpa fungsi (*ambient glow*)?
- [ ] Apakah data yang ditampilkan berasal dari sumber nyata (bukan simulasi kosmetik)?
- [ ] Apakah pengalaman pada layar ponsel terasa leluasa dan alami, bukan terjebak di dalam modal pop-up?
