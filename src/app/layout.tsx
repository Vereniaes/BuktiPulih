// src/app/layout.tsx
// -> tata letak root aplikasi buktipulih
//      -> import globals.css dengan design tokens
//      -> integrasi font Plus Jakarta Sans
//      -> metadata seo, opengraph whatsapp/twitter, dan structured data schema.org

import type { Metadata } from "next";
import "./globals.css";
import { AccountProvider } from "@/components/account/AccountSession";

export const metadata: Metadata = {
  metadataBase: new URL("https://buktipulih.id"),
  title: {
    default: "BuktiPulih — Pantau Jejak, Kawal Pemulihan",
    template: "%s | BuktiPulih",
  },
  description:
    "Platform pemantauan karhutla dan akuntabilitas pemulihan lahan gambut pasca-bencana bersama warga. Pantau Jejak, Kawal Pemulihan.",
  keywords: [
    "buktipulih",
    "pantau jejak kawal pemulihan",
    "restorasi gambut",
    "karhutla bnpb",
    "sekat kanal",
    "pemulihan lahan",
    "bukti warga",
    "bupi rimbawan",
  ],
  alternates: {
    canonical: "https://buktipulih.id",
  },
  openGraph: {
    title: "BuktiPulih — Pantau Jejak, Kawal Pemulihan",
    description:
      "Platform pemantauan karhutla dan akuntabilitas pemulihan lahan gambut pasca-bencana bersama warga. Pantau Jejak, Kawal Pemulihan.",
    type: "website",
    url: "https://buktipulih.id",
    siteName: "BuktiPulih",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "BuktiPulih — Pantau Jejak, Kawal Pemulihan",
    description:
      "Platform pemantauan karhutla dan akuntabilitas pemulihan lahan gambut pasca-bencana bersama warga.",
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
    "Platform Akuntabilitas Pemulihan Lahan Gambut & Pemantauan Karhutla Berbasis Satelit BNPB ArcGIS. Pantau Jejak, Kawal Pemulihan.",
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
    <html lang="id" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootStructuredData) }}
        />
      </head>
      <body suppressHydrationWarning><AccountProvider>{children}</AccountProvider></body>
    </html>
  );
}
