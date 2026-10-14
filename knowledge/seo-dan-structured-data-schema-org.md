# Standarisasi SEO Teknis, Dynamic Sitemap, Robots.txt & JSON-LD Schema.org

Dokumen ini mendokumentasikan implementasi arsitektur SEO kelas enterprise pada Next.js App Router portal BuktiPulih.

---

## 1. Arsitektur File Khusus Next.js App Router

Next.js App Router menyediakan konvensi berkas khusus (*special files*) untuk SEO tanpa memerlukan pustaka eksternal:

1. **`src/app/sitemap.ts`**:
   - Menghasilkan berkas `/sitemap.xml` dinamis seketika.
   - Mengompilasi seluruh URL statis portal (Portal Beranda, Pantau Karhutla, Peta Bukti Pulih, Forum Pulih) serta rute dinamis postingan warga (`/forum/[id]`) beserta stempel `lastModified` aktual, `changeFrequency`, dan `priority`.

2. **`src/app/robots.ts`**:
   - Menghasilkan berkas `/robots.txt` standar RFC 9309.
   - Mengizinkan perayapan umum (*Allow: /*) pada seluruh halaman publik sembari membatasi akses ke endpoint internal (*Disallow: /api/*) dan mendeklarasikan lokasi `/sitemap.xml`.

---

## 2. Struktur Data Terstruktur JSON-LD (Schema.org)

Penggunaan JSON-LD memungkinkan Google Search menampilkan *Rich Snippets* (kartu artikel, lokasi geospasial, dan lencana organisasi terverifikasi) pada hasil pencarian:

### A. Root Portal (`WebApplication` & `NGO` di `layout.tsx`)
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "BuktiPulih",
  "url": "https://buktipulih.id",
  "applicationCategory": "EnvironmentalApplication",
  "operatingSystem": "All",
  "description": "Platform Akuntabilitas Pemulihan Lahan Gambut & Pemantauan Karhutla Berbasis Satelit BNPB",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "IDR"
  }
}
```

### B. Artikel Laporan Warga (`SocialMediaPosting` / `Article` di `/forum/[id]`)
```json
{
  "@context": "https://schema.org",
  "@type": "SocialMediaPosting",
  "headline": "Laporan Pemulihan Gambut oleh Pak Suwardi di Kubu Raya",
  "articleBody": "Teks caption dan narasi kesaksian...",
  "image": ["https://buktipulih.id/journal/pl-kalbar-001/m6.jpg"],
  "datePublished": "2026-10-14T03:30:00.000Z",
  "author": {
    "@type": "Person",
    "name": "Pak Suwardi",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Kubu Raya",
      "addressRegion": "Kalimantan Barat"
    }
  },
  "contentLocation": {
    "@type": "Place",
    "name": "Parit Tokaya, Rasau Jaya, Kubu Raya"
  },
  "publisher": {
    "@type": "Organization",
    "name": "BuktiPulih",
    "url": "https://buktipulih.id"
  }
}
```

---

## 3. Manfaat untuk Akuntabilitas Sipil & Visibilitas Publik

- Setiap pemantauan yang dilakukan oleh warga di pelosok Kalimantan dan Sumatera memiliki URL kanonikal tetap yang diindeks mesin pencari.
- Ketika tautan dibagikan ke WhatsApp dan Twitter/X, sistem otomatis menampilkan judul lokasi, cuplikan isi laporan, dan foto perbandingan resolusi tinggi $1200 \times 630\text{ px}$.
