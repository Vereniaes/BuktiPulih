// src/app/layout.tsx
// -> tata letak root aplikasi buktipulih
//      -> import globals.css dengan design tokens
//      -> integrasi font sans Manrope dan aksen tulisan tangan Mansalva
//      -> metadata seo, opengraph whatsapp/twitter, dan structured data schema.org

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://buktipulih.id"),
  title: {
    default: "BuktiPulih — Akuntabilitas Pemulihan Pasca-Karhutla & WebGIS Satelit BNPB",
    template: "%s | BuktiPulih",
  },
  description:
    "Platform pemantauan karhutla berbasis satelit BNPB ArcGIS dan audit foto perkembangan pohon di lahan gambut bekas terbakar oleh kader lapangan.",
  keywords: [
    "buktipulih",
    "restorasi gambut",
    "karhutla bnpb",
    "sekat kanal",
    "pemulihan lahan",
    "catatan relawan",
    "nasa modis",
    "noaa viirs",
  ],
  alternates: {
    canonical: "https://buktipulih.id",
  },
  openGraph: {
    title: "BuktiPulih — Akuntabilitas Pemulihan Pasca-Karhutla & WebGIS Satelit BNPB",
    description:
      "Platform pemantauan karhutla berbasis satelit BNPB ArcGIS dan audit foto perkembangan pohon di lahan gambut bekas terbakar oleh kader lapangan.",
    type: "website",
    url: "https://buktipulih.id",
    siteName: "BuktiPulih",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "BuktiPulih — Akuntabilitas Pemulihan Pasca-Karhutla & WebGIS Satelit BNPB",
    description:
      "Platform pemantauan karhutla berbasis satelit BNPB ArcGIS dan audit foto perkembangan pohon di lahan gambut bekas terbakar.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const rootStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "BuktiPulih",
  url: "https://buktipulih.id",
  applicationCategory: "EnvironmentalApplication",
  operatingSystem: "All",
  description:
    "Platform Akuntabilitas Pemulihan Lahan Gambut & Pemantauan Karhutla Berbasis Satelit BNPB ArcGIS",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "IDR",
  },
  creator: {
    "@type": "Organization",
    name: "BuktiPulih Initiative",
    url: "https://buktipulih.id",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Mansalva&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootStructuredData) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
