// Todo:
// -> List portal routes and sample post URLs.

// --- Sitemap ---
import { MetadataRoute } from "next";
import { initialForumPosts } from "@/data/forumPostsData";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://buktipulih.id";

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

  const postRoutes: MetadataRoute.Sitemap = initialForumPosts.map((post) => ({
    url: `${baseUrl}/forum/${post.id}`,
    lastModified: new Date(post.created_at),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...postRoutes];
}
// --- end of Sitemap ---
