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
export function mergeForumComments(previous: ForumComment[], incoming: ForumComment[]) {
  return [...new Map([...previous, ...incoming].map(comment => [comment.id, comment])).values()];
}
