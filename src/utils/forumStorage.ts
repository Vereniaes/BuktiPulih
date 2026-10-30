// Cache public Forum content without making storage a requirement for submission.
import type { ForumPost, ForumComment } from "@/types";
export const FORUM_STORAGE_KEY = "buktipulih_forum_posts_v1";
export function clearForumCache() {
  try { localStorage.removeItem(FORUM_STORAGE_KEY); } catch {}
}
export function readCachedPosts(): ForumPost[] {
  try { const value = JSON.parse(localStorage.getItem(FORUM_STORAGE_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
export function cacheForumPosts(posts: ForumPost[]) {
  try { localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(posts)); } catch {}
}
export function cacheForumPost(post: ForumPost) {
  const posts = readCachedPosts();
  const index = posts.findIndex(item => item.id === post.id);
  if (index === -1) posts.unshift(post); else posts[index] = post;
  cacheForumPosts(posts);
}
export const FORUM_VIEWED_KEY = "buktipulih_viewed_posts";

// helper --------------------------------------------------------------------------
// function buat membaca riwayat postingan yang sudah dilihat
// input param : void
// output : string[] daftar id postingan yang sudah dilihat
export function readViewedPostIds(): string[] {
  try {
    const raw = localStorage.getItem(FORUM_VIEWED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// function buat menandai postingan telah dilihat agar tidak terduplikasi
// input param : postId (string)
// output : boolean (true jika baru dilihat, false jika sudah pernah dilihat)
export function markPostAsViewed(postId: string): boolean {
  try {
    const viewed = readViewedPostIds();
    if (viewed.includes(postId)) return false;
    viewed.push(postId);
    localStorage.setItem(FORUM_VIEWED_KEY, JSON.stringify(viewed));
    return true;
  } catch {
    return false;
  }
}

// function buat menambah hitungan tayangan postingan jika belum pernah dilihat
// input param : post (ForumPost)
// output : ForumPost dengan metrics views ter-update
export function recordPostView(post: ForumPost): ForumPost {
  if (!markPostAsViewed(post.id)) {
    return post;
  }
  const updated: ForumPost = {
    ...post,
    metrics: {
      ...post.metrics,
      views: (post.metrics.views || 0) + 1,
    },
  };
  cacheForumPost(updated);
  return updated;
}
// end of helper ------------------------------------------------------------------

export function mergeForumComments(previous: ForumComment[], incoming: ForumComment[]) {
  return [...new Map([...previous, ...incoming].map(comment => [comment.id, comment])).values()];
}

