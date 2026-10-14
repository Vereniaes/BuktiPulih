# Anti-Slop UI/UX Audit & Synthesis Framework

Dokumen ini mengintegrasikan prinsip-prinsip deslop dari 4 referensi industri (*stephenturner/skill-deslop*, *petergyang/no-ai-slop*, *miqdadbadjuber/anti-slop*, dan *nextlevelbuilder/ui-ux-pro-max*) yang diselaraskan dengan kebutuhan kompetisi UINIC 8.0 untuk BuktiPulih.

---

## 1. Inti Ajaran 4 Referensi Anti-Slop

### A. Stephen Turner (`stephenturner/skill-deslop`)
- **Fokus Utama**: Menghilangkan residu mesin (*machine residue*) pada teks, dokumentasi, dan bahasa antarmuka.
- **Pola Slop yang Dieliminasi**:
  - Frasa klise dan basa-basi pembuka robotik (*"Here's the thing"*, *"Menarik untuk dicatat"*).
  - Kontras biner fiktif (*"Bukan sekadar X, melainkan Y"*).
  - Personifikasi palsu pada mesin/sistem (*"Sistem kami dengan bangga mempersembahkan..."*).
  - Transisi teks yang kaku dan repetitif.

### B. Peter Yang (`petergyang/no-ai-slop`)
- **Fokus Utama**: Menghilangkan kecenderungan AI menulis copy yang dramatis berlebihan, penuh jargon buzzword, dan metafora dangkal.
- **Prinsip**: Bicara langsung pada fakta. Jika ada 7 hotspot, sebutkan 7 hotspot tanpa retorika berlebihan. Jika bibit mati, laporkan persentase kematian secara netral dan transparan.

### C. Miqdad Badjuber (`miqdadbadjuber/anti-slop`)
- **Fokus Utama**: Tata kelola AI coding agent agar tidak membuat "slop UI" (kode template murahan, komponen kosmetik, dan tombol fiktif tanpa fungsi nyata).
- **Hard Gates**:
  - Dilarang membuat widget simulasi/kosmetik (*toy gadgets*) yang tidak terhubung ke data nyata.
  - Dilarang membombardir antarmuka dengan kartu 3-kolom seragam (*Cardocalypse*).
  - Dilarang menaburkan pil/chip membulat penuh (*pill-badge overload*) di mana-mana.
  - Dilarang menyembunyikan konten penting ke dalam pop-up trap tanpa tautan mandiri.

### D. UI/UX Pro Max (`nextlevelbuilder/ui-ux-pro-max-skill`)
- **Fokus Utama**: Kecerdasan hierarki visual, tipografi bermakna, kurasi palet warna fungsional, dan tata letak berbasis konteks industri nyata.
- **Prinsip**:
  - Desain harus berakar pada karakteristik domain produk (bukan template SaaS AI generik).
  - Kontras visual yang tegas namun tenang (*hairline border 1px* alih-alih bayangan buram berat).
  - Pengurangan beban kognitif (*cognitive load*) bagi pengguna lapangan dan masyarakat awam.

---

## 2. Bedah Tujuan Eksistensial BuktiPulih (The Purpose)

### Apa Sebenarnya BuktiPulih?
BuktiPulih **bukan sekadar dashboard bencana**, dan **bukan pula media sosial biasa**.
BuktiPulih adalah **Platform Akuntabilitas Lingkungan Partisipatif (Civic Proof of Restoration Ledger)**.

### Mengapa Platform Ini Ada?
1. **Masalah Skeptisisme & Greenwashing**: Setiap musim kemarau, jutaan hektare gambut Indonesia terbakar. Berita dan data satelit (BNPB/KLHK) marak saat api menyala. Namun pasca-padam, publik tidak pernah tahu: *Apakah kawasan tersebut benar-benar dipulihkan? Ke mana dana rehabilitasi mengalir? Mengapa tahun berikutnya terbakar lagi di petak yang sama?*
2. **Kebutuhan Bukti Nyata (Ground-Truth)**: Citra satelit hanya melihat permukaan dari ketinggian ribuan kilometer. Yang menentukan gambut pulih adalah kader desa dan relawan: *Apakah sekat kanal basah? Berapa sentimeter tinggi muka air gambut (TMAT)? Apakah bibit jelutung rawa hidup atau kering?*
3. **Penyambung Warga & Pembuat Kebijakan**: Menghubungkan data resmi pemerintah (WebGIS BNPB) dengan catatan fisik terverifikasi warga lapangan (*ground-level audit*).

---

## 3. Diagnosis Kritis "AI Slop" pada UI/UX BuktiPulih Saat Ini

Berdasarkan audit visual langsung pada antarmuka saat ini:

| Lokasi / Elemen | Gejala AI Slop yang Terjadi | Dampak UX Negatif | Solusi Deslop |
| :--- | :--- | :--- | :--- |
| **Header Tab 1 (`?tab=fire`)** | Deretan 5 kartu KPI berukuran besar (*Cardocalypse*) dengan label bertumpuk. | Pengguna kewalahan menerima angka tanpa hierarki mana yang paling gawat. | Ringkas menjadi 1 strip indikator terpadu: Status Siaga + Jumlah Hotspot Aktif + ISPU Terburuk. |
| **Filter Bar Tab 3 (`?tab=forum`)** | Banjir 17 tombol pil (*Pill Overload*): 4 urutan + 8 wilayah + 5 kondisi, semuanya berbentuk kapsul identik. | Memakan ruang vertikal layar, membingungkan pengguna HP, dan tampak seperti template form AI generik. | Konsolidasikan filter wilayah dan kondisi ke dalam kontrol tersegmentasi yang ringkas dan fungsional. |
| **Pertumbuhan Bibit Tab 2 (`GrowthCalendar`)** | 36 kartu kotak abu-abu kosong bertuliskan "menunggu foto" berulang-ulang tanpa data. | Membuang ruang vertikal secara masif, menimbulkan kesan produk belum selesai (*incomplete placeholder*). | Hanya tampilkan petak yang memiliki log aktif. Untuk petak baru, gunakan indikator ringkas 1 baris jadwal monitoring. |
| **Teks & Tipografi** | Teks menabrak tanpa spasi (`Semua Wilayah9Kalteng...2Kalbar...`) pada ringkasan petak Tab 2. | Rusak secara visual (*layout break*), menurunkan kredibilitas profesional di hadapan juri. | Terapkan flex layout dengan gap terstandar dan pemisahan angka lencana yang proporsional. |
| **Karakter Copywriting** | Pengulangan slogan kaku (*"bukti pulih datang dari mereka yang merawat di lapangan"*) di header, banner, dan footer. | Terasa seperti klise AI yang mengulang prompt berulang kali. | Gunakan bahasa jurnal lapangan yang sederhana, lugas, dan bersuara manusia nyata. |
