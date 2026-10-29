// Read API pages and keep local likes when public post data refreshes.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initialForumPosts } from "@/data/forumPostsData";
import { getForumPostsApi } from "@/services/account";
import { readCachedPosts } from "@/utils/forumStorage";
import type { ForumPost } from "@/types";

export function useForumPosts(minimumPages = 1) {
  const [page, setPage] = useState(0);
  const [posts, setPosts] = useState<ForumPost[]>(initialForumPosts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [boundary, setBoundary] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const nextPage = useRef(1);
  const more = useRef(true);

  const loadMore = useCallback(async (all = false) => {
    const request = controller.current;
    if (!request || request.signal.aborted || pending.current || !more.current) return;
    pending.current = true; setLoading(true); setError(false);
    try {
      do {
        const result = await getForumPostsApi(request.signal, nextPage.current);
        if (request.signal.aborted) return;
        nextPage.current = result.pagination.page + 1;
        setPage(result.pagination.page);
        more.current = result.pagination.page < result.pagination.total_pages;
        setHasMore(more.current);
        const last = result.items.at(-1);
        if (last) setBoundary(last.created_at);
        setPosts(previous => {
          const merged = new Map(previous.map(post => [post.id, post]));
          for (const post of result.items) {
            const cached = merged.get(post.id);
            merged.set(post.id, cached ? { ...post, metrics: { ...post.metrics, likes: cached.metrics.likes, user_has_liked: cached.metrics.user_has_liked } } : post);
          }
          return [...merged.values()].map(post => result.legacy_comment_counts && Object.hasOwn(result.legacy_comment_counts, post.id)
            ? { ...post, metrics: { ...post.metrics, comments_count: result.legacy_comment_counts[post.id] } } : post);
        });
      } while (all && more.current && !request.signal.aborted);
    } catch {
      if (!request.signal.aborted) setError(true);
    } finally {
      if (controller.current === request && !request.signal.aborted) { pending.current = false; setLoading(false); }
    }
  }, []);

  useEffect(() => {
    const request = new AbortController(); controller.current = request; pending.current = false;
    const frame = requestAnimationFrame(() => {
      const cached = readCachedPosts();
      if (cached.length) setPosts([...cached, ...initialForumPosts.filter(post => !cached.some(item => item.id === post.id))]);
      void loadMore();
    });
    return () => { cancelAnimationFrame(frame); request.abort(); };
  }, [loadMore]);

  useEffect(() => {
    if (page > 0 && page < minimumPages && !loading && !error && hasMore) void loadMore();
  }, [page, minimumPages, loading, error, hasMore, loadMore]);

  return { posts, setPosts, loading, error, hasMore, boundary, loadMore };
}
