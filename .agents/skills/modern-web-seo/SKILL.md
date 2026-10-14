---
name: modern-web-seo
description: Standarisasi implementasi SEO mutakhir untuk Next.js App Router, metadata dinamis, OpenGraph WhatsApp/Twitter card, dan markup semantik ramah mesin pencari.
---

# Modern Web SEO & Social Sharing Guidelines (Next.js App Router)

Keahlian ini memastikan setiap halaman dinamis memiliki optimasi mesin pencari (SEO) kelas satu dan tampilan pratinjau kartu sosial (*rich media preview*) yang tajam saat dibagikan ke WhatsApp, Telegram, Facebook, dan X/Twitter.

---

## 1. Aturan Metadata Dinamis (`generateMetadata`)

Setiap rute dinamis (seperti `/forum/[id]` atau `/petak/[id]`) wajib mengekspor fungsi `generateMetadata`:

```typescript
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id);

  if (!post) {
    return {
      title: "Kiriman Tidak Ditemukan — BuktiPulih",
    };
  }

  const title = `${post.title} — BuktiPulih Forum`;
  const description = post.content.slice(0, 155) + "...";
  const imageUrl = post.media_url || "/og-cover.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://buktipulih.id/forum/${post.id}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      siteName: "BuktiPulih",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
```

---

## 2. Struktur Semantik & Aksesibilitas Mesin Pencari

1. **Satu H1 per Halaman**: Judul artikel/postingan adalah elemen `<h1>` tunggal.
2. **Artikel Berstruktur (`<article>`)**: Menggunakan elemen semantik `<article>`, `<header>`, `<main>`, `<time datetime="...">`, dan `<section>`.
3. **Canonical URL**: Selalu definisikan URL kanonikal agar mesin pencari tidak menduplikasi indeks antara parameter kueri.
4. **Rich Social Preview**: Gambar OpenGraph wajib berukuran minimal $1200 \times 630\text{ px}$ rasio 1.91:1 agar tidak terpotong saat dibagikan di percakapan WhatsApp.
