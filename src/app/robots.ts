// Todo:
// -> Define crawler access and the sitemap URL.

// --- Crawler rules ---
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
// --- end of Crawler rules ---
