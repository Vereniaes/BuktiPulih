// Shared region filtering and ordering for the forum and homepage.
import type { ForumPost } from "@/types";
import { REGION_TABS } from "./plotDisplay";

export const FORUM_PAGE_SIZE = 25;

export type SortCriteria = "latest" | "likes" | "comments" | "views";

// helper --------------------------------------------------------------------------
// function buat menyaring dan mengurutkan postingan forum
// input param : posts, regionFilter, sortKey, query
// output : ForumPost[] yang sudah diurutkan
export function getSortedPosts(
  posts: ForumPost[],
  regionFilter: string,
  sortKey: SortCriteria,
  query = ""
): ForumPost[] {
  let result = [...posts];

  if (regionFilter !== "all") {
    const tab = REGION_TABS.find((t) => t.key === regionFilter);
    const targetProvince = tab ? tab.province.toLowerCase() : regionFilter.toLowerCase();
    result = result.filter(
      (p) =>
        p.region_key === regionFilter ||
        (targetProvince && p.location_name.toLowerCase().includes(targetProvince)) ||
        p.location_name.toLowerCase().includes(regionFilter.toLowerCase())
    );
  }

  const terms = query.trim().toLocaleLowerCase("id-ID").split(/\s+/).filter(Boolean);
  if (terms.length) {
    result = result.filter(post => {
      const text = [post.author.username, post.author.city, post.location_name, post.caption].join(" ").toLocaleLowerCase("id-ID");
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
// end of helper ------------------------------------------------------------------

