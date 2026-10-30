// Todo:
// -> filter and sort forum posts
// -> suggest regions from post locations

// --- Forum filters ---
import type { ForumPost } from "@/types";
import { REGION_TABS } from "./plotDisplay";

export const FORUM_PAGE_SIZE = 25;

export type SortCriteria = "latest" | "likes" | "comments" | "views";

const normalize = (value: string) => value.trim().toLocaleLowerCase("id-ID").replace(/\s+/g, " ");
function locationNames(post: ForumPost) {
  const legacy = REGION_TABS.find(tab => tab.key === post.region_key && tab.key !== "lainnya");
  return [post.province || legacy?.province, post.city, post.location_name, ...post.location_name.split(",")]
    .filter((value): value is string => Boolean(value?.trim()));
}

/** Input: posts. Output: distinct location names for region suggestions. */
export function getForumRegions(posts: ForumPost[]): string[] {
  const names = new Map<string, string>();
  for (const post of posts) for (const value of locationNames(post)) names.set(normalize(value), value.trim());
  return [...names.values()].sort((a, b) => a.localeCompare(b, "id-ID"));
}

/** Input: posts and filters. Output: matching posts in the requested order. */
export function getSortedPosts(
  posts: ForumPost[],
  regionFilter: string,
  sortKey: SortCriteria,
  query = ""
): ForumPost[] {
  let result = [...posts];

  const region = normalize(regionFilter);
  if (region && region !== "all") {
    const tab = REGION_TABS.find(t => t.key === region || normalize(t.province) === region);
    // Bekasi is a city; the other legacy shortcuts name provinces.
    const terms = normalize(tab && tab.key !== "bekasi" ? tab.province : region).split(" ");
    result = result.filter(post => {
      const text = normalize([...locationNames(post), post.region_key].join(" "));
      return post.region_key === (tab?.key ?? region) || terms.every(term => text.includes(term));
    });
  }

  const terms = query.trim().toLocaleLowerCase("id-ID").split(/\s+/).filter(Boolean);
  if (terms.length) {
    result = result.filter(post => {
      const text = [post.author.username, post.author.city, ...locationNames(post), post.caption].join(" ").toLocaleLowerCase("id-ID");
      return terms.every(term => text.includes(term));
    });
  }

  if (sortKey === "latest") {
    result.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } else if (sortKey === "likes") {
    result.sort((a, b) => b.metrics.likes - a.metrics.likes);
  } else if (sortKey === "comments") {
    result.sort((a, b) => b.metrics.comments_count - a.metrics.comments_count);
  } else if (sortKey === "views") {
    result.sort((a, b) => b.metrics.views - a.metrics.views);
  }

  return result;
}
// --- end of Forum filters ---

