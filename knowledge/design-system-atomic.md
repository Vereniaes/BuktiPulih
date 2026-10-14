# Knowledge: UI Design System (Atomic Architecture)
Sumber Referensi: bijakmemantau.id (Pantau Tuntutan Masyarakat & Tuntutan 17+8)

Dokumen ini memetakan sistem desain antarmuka secara modular berbasis Atomic Design methodology (Tokens -> Atoms -> Molecules -> Organisms -> Templates -> Pages) untuk standarisasi implementasi antarmuka pemantauan publik / civic-tech.

---

## 1. Sub-Atomic: Design Tokens

### A. Palet Warna (Color Tokens)
Tokens warna dipisahkan antara tema institusional (Brand Utama) dan tema kampanye publik (Activism Duotone):

```json
{
  "color": {
    "brand": {
      "navy-900": "#070A1E",
      "navy-800": "#0B0D3B",
      "navy-700": "#11164D",
      "navy-600": "#1E2772",
      "blue-accent": "#2B4CDE"
    },
    "campaign": {
      "forest-green-800": "#0D6B35",
      "forest-green-700": "#0E753B",
      "forest-green-600": "#167A3F",
      "pink-bubble": "#FF3385",
      "pink-dark": "#D81B60"
    },
    "surface": {
      "background-light": "#F8F9FD",
      "surface-card": "#FFFFFF",
      "surface-subtle": "#F1F3F9",
      "border-light": "#E5E7EB",
      "border-card": "rgba(0, 0, 0, 0.08)"
    },
    "status": {
      "failed": {
        "text": "#DC2626",
        "bg": "#FEF2F2",
        "border": "#FCA5A5"
      },
      "in-progress": {
        "text": "#4F46E5",
        "bg": "#EEF2FF",
        "border": "#C7D2FE"
      },
      "pending-update": {
        "text": "#D97706",
        "bg": "#FFFBEB",
        "border": "#FDE68A"
      },
      "no-update": {
        "text": "#6B7280",
        "bg": "#F3F4F6",
        "border": "#E5E7EB"
      }
    },
    "text": {
      "primary": "#111827",
      "secondary": "#4B5563",
      "muted": "#9CA3AF",
      "inverse": "#FFFFFF"
    }
  }
}
```

### B. Tipografi (Typography Tokens)
Font primer: `Manrope` / `Geist` (Modern Geometric Sans)
Font aksen display: `Mansalva` / `Rubik` (Headline aktivisme)

```json
{
  "typography": {
    "family": {
      "sans": "'Manrope', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
      "display": "'Rubik', 'Manrope', sans-serif",
      "mono": "'Fragment Mono', monospace"
    },
    "size": {
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "lg": "18px",
      "xl": "20px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "36px",
      "5xl": "48px"
    },
    "weight": {
      "regular": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700",
      "extrabold": "800"
    },
    "lineHeight": {
      "tight": "1.2",
      "snug": "1.35",
      "normal": "1.5",
      "relaxed": "1.65"
    }
  }
}
```

### C. Spacing, Radii, & Elevation Tokens
```json
{
  "spacing": {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px"
  },
  "radii": {
    "sm": "6px",
    "md": "10px",
    "lg": "16px",
    "xl": "24px",
    "full": "9999px"
  },
  "shadows": {
    "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
    "card": "0 2px 8px 0 rgba(0, 0, 0, 0.04)"
  }
}
```

---

## 2. Atoms (Komponen Dasar)

1. **Button**
   - Variant:
     - `primary`: Background brand navy (`#0B0D3B`), text putih, pill shape (`rounded-full`), padding `10px 20px`.
     - `pill-light`: Background putih, text dark, border `1px solid rgba(0,0,0,0.1)`. Digunakan untuk aksi kartu seperti "Baca sekarang".
     - `secondary-green`: Background hijau kampanye (`#0E753B`), text putih.
2. **Badge & Status Pill**
   - Variant:
     - `Status: Pemerintah Gagal ❌` (Red subtle background + border + teks merah).
     - `Status: Kawal Terus 🔎` (Indigo subtle background + border + teks indigo).
     - `Status: Belum ada update 💬` (Grey subtle background + teks abu-abu).
     - `Status: Lihat update !` (Amber/Pink background).
   - Bentuk: `rounded-full`, padding `4px 12px`, font-size `12px`, font-weight `600`.
3. **Category Label Pill**
   - Label nomor tuntutan: `Jangka Panjang #1` (Background hijau tua pekat, teks putih).
   - Label sekunder: `Jangka Pendek #1` (Background abu-abu netral, teks gelap).
4. **Input Field (Search)**
   - Input teks dengan border halus (`#E5E7EB`), background putih, radius `9999px` (pill), placeholder teks muted `rgba(0,0,0,0.4)`.
5. **Select / Dropdown Trigger**
   - Pill button putih dengan chevron down icon, label ringkas (`Untuk ˅`, `Status ˅`, `Deadline ˅`).
6. **Icon Element**
   - Visual indikator: kalender (`📅`), target instansi (`🏛️` / `✈️` / `👮`), status emoji (`❌`, `🔎`, `💬`, `!`).
7. **Entity / Party Icon**
   - Avatar bundar ukuran kecil (`20px x 20px`) untuk mewakili simbol parpol/institusi yang diawasi.

---

## 3. Molecules (Gabungan Atom Fungsional)

1. **Search & Filter Bar**
   - Menggabungkan Atom `Input Field` (Search), ikon loop, dan 3 Atom `Dropdown Trigger` secara horizontal.
2. **Metadata Row (Footer Kartu Data)**
   - Menggabungkan Atom Tanggal (`📅 31 Agu 2026`), Atom Target Sasaran (`• Pemerintah`), dan Atom `Status Pill` dalam satu baris fleksibel.
3. **Card Call-to-Action Link**
   - Teks instruksi: "Ikut pantau tuntutannya lebih lanjut di" + link semantik bergaris bawah ("sini" -> direkomendasikan diganti menjadi tombol/anchor berlabel eksplisit).
4. **Party Commitment Counter**
   - Teks: "Partai yang sudah berkomitmen (6)" + deretan avatar logo partai berjejer horizontal.
5. **Metric Counter Item**
   - Box angka metrik ringkas: Angka besar status + badge status + label jumlah (contoh: "14 Lewat deadline ❌", "3 Belum ada update").

---

## 4. Organisms (Modul UI Lengkap)

1. **Global Header Navbar**
   - Komponen tetap di bagian atas viewport (*sticky*).
   - Berisi Logo Brand (Teleskop + Bijak Memantau), menu navigasi tautan teks, dan tombol utama `Join Discord Bijak`.
2. **Metrics Overview Panel**
   - Kontainer putih di atas daftar tuntutan.
   - Terbagi menjadi dua kompartemen:
     - 8 Tuntutan Jangka Panjang (status breakdown).
     - 17 Tuntutan Jangka Pendek (status breakdown).
     - Timestamp pembaruan data ("Latest Update: Cek update terbaru di sini").
3. **Editorial Demand Card (Katalog Hub)**
   - Layout 2 kolom.
   - Komposisi: Latar kartu solid berwarna tematik (merah, cokelat, toska, dll.), judul tuntutan bold warna kontras, ilustrasi grafis tematik, dan tombol aksi `Baca sekarang`.
4. **Data-Dense Tracker Card (Akuntabilitas 17+8)**
   - Kontainer kartu putih dengan border tipis.
   - Komposisi:
     - Header: Category Label Pill (`Jangka Panjang #X`).
     - Body: Judul tuntutan bold, uraian komprehensif latar belakang & regulasi.
     - Action link: Tautan eksplorasi kronologi.
     - Footer: Metadata Row lengkap (Tanggal, Target Institusi, Status Pill).
5. **Campaign Modal / Popup Card**
   - Modal mengambang dengan gambar mockup smartphone, pesan persuasif, tombol CTA, dan tombol dismiss (X).

---

## 5. Templates (Tata Letak Kerangka)

### A. Template Katalog Hub (`Pantau Tuntutan`)
- **Header Slot:** Global Navbar.
- **Hero Slot:** Dark blue hero section + ilustrasi editorial sentral + judul headline badge.
- **Content Layout:** Split layout (Sidebar kiri untuk filter tab topik 25%, Area kanan untuk 2-kolom grid kartu editorial 75%).
- **Footer Slot:** Global Dark Blue Footer (Disclaimer, Menu Explore, Kontak, Hak Cipta).

### B. Template Tracker Dashboard (`Tuntutan 17+8`)
- **Header Slot:** Global Navbar.
- **Banner Slot:** Green campaign banner + display typography display + subteks.
- **Overview Slot:** Container kartu metrik kuantitatif.
- **Control Bar Slot:** Sticky filter & search bar (pencarian + dropdown filter).
- **Listing Slot:** Stack vertikal 1-kolom kartu data-dense.
- **Footer Slot:** Grid kartu tautan jaringan solidaritas / inisiatif terkait + Global Footer.

---

## 6. Pages (Implementasi Nyata)

1. `https://bijakmemantau.id/pantau-tuntutan-masyarakat`:
   - Menggunakan Template Katalog Hub. Fokus pada literasi publik, pengenalan isu, dan keterbacaan artikel editorial.
2. `https://bijakmemantau.id/tuntutan-178`:
   - Menggunakan Template Tracker Dashboard. Fokus pada pengawasan berkala, tenggat waktu (*deadline enforcement*), dan bukti respon pemerintah.
