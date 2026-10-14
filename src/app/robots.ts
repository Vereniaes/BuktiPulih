// src/app/robots.ts
// -> instruksi perayap mesin pencari (robots.txt) untuk portal buktipulih
//      -> mengizinkan pengindeksan seluruh rute publik
//      -> membatasi akses ke endpoint api internal (/api/)
//      -> mendeklarasikan lokasi sitemap.xml resmi

import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: "https://buktipulih.id/sitemap.xml",
  };
}
