// src/app/sitemap.ts
// -> generator sitemap.xml otomatis untuk mesin pencari google
//      -> menyusun url statis portal (beranda, karhutla, pemulihan, forum)
//      -> menyusun rute dinamis postingan forum (/forum/[id]) dari dataset riil

import { MetadataRoute } from "next";
import { initialForumPosts } from "@/data/forumPostsData";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://buktipulih.id";

  // rute statis utama portal
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/?tab=fire`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/?tab=recovery`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/?tab=forum`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  // rute dinamis postingan partisipasi forum pulih
  const postRoutes: MetadataRoute.Sitemap = initialForumPosts.map((post) => ({
    url: `${baseUrl}/forum/${post.id}`,
    lastModified: new Date(post.created_at),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...postRoutes];
}
