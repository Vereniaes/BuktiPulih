// Load bounded thread pages and keep votes tied to the current server session.
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getForumCommentsApi } from "@/services/account";
import type { CommentSort, DiscussionComment } from "@/types/discussion";
export const ROOT_THREAD = "root";
interface Branch { ids: string[]; page: number; total: number; more: boolean; loading: boolean; error: boolean }
interface Discussion { comments: Record<string, DiscussionComment>; branches: Record<string, Branch>; total: number | null }
const emptyBranch = (): Branch => ({ ids: [], page: 0, total: 0, more: false, loading: false, error: false });
function orderIds(ids: string[], comments: Record<string, DiscussionComment>, sort: CommentSort) {
  return ids.sort((a, b) => (sort === "top" ? comments[b].score - comments[a].score : 0) || comments[b].created_at.localeCompare(comments[a].created_at) || b.localeCompare(a));
}
export function useForumDiscussion(postId: string, sort: CommentSort) {
  const [data, setData] = useState<Discussion>({ comments: {}, branches: {}, total: null });
  const requests = useRef(new Map<string, AbortController>());
  const alive = useRef(true), created = useRef(new Set<string>());
  const load = useCallback(async (parentId: string | null, page = 1) => {
    const key = parentId ?? ROOT_THREAD;
    if (requests.current.has(key)) return;
    const controller = new AbortController(); requests.current.set(key, controller);
    setData(previous => ({ ...previous, branches: { ...previous.branches, [key]: { ...(previous.branches[key] ?? emptyBranch()), loading: true, error: false } } }));
    try {
      const result = await getForumCommentsApi(postId, { page, sort, parentId }, controller.signal);
      if (controller.signal.aborted) return;
      setData(previous => {
        const comments = { ...previous.comments };
        result.items.forEach(item => { comments[item.id] = item; });
        const previousIds = previous.branches[key]?.ids ?? [];
        const ids = orderIds([...new Set([...(page === 1 ? previousIds.filter(id => created.current.has(id)) : previousIds), ...result.items.map(item => item.id)])], comments, sort);
        return { comments, total: result.total_comments, branches: { ...previous.branches, [key]: {
          ids, page, total: result.pagination.total_items, more: page < result.pagination.total_pages, loading: false, error: false,
        } } };
      });
    } catch {
      if (!controller.signal.aborted) setData(previous => ({ ...previous, branches: { ...previous.branches, [key]: { ...(previous.branches[key] ?? emptyBranch()), loading: false, error: true } } }));
    } finally { if (requests.current.get(key) === controller) requests.current.delete(key); }
  }, [postId, sort]);
  useEffect(() => {
    alive.current = true;
    const frame = requestAnimationFrame(() => { void load(null); });
    const active = requests.current;
    return () => { cancelAnimationFrame(frame); alive.current = false; active.forEach(controller => controller.abort()); active.clear(); };
  }, [load]);
  const updateVote = (id: string, score: number, viewer_vote: DiscussionComment["viewer_vote"]) => {
    if (!alive.current) return;
    setData(previous => previous.comments[id] ? { ...previous, comments: { ...previous.comments, [id]: { ...previous.comments[id], score, viewer_vote } } } : previous);
  };
  const add = (comment: DiscussionComment) => {
    if (!alive.current || created.current.has(comment.id)) return;
    created.current.add(comment.id);
    const key = comment.parent_id ?? ROOT_THREAD;
    requests.current.get(key)?.abort(); requests.current.delete(key);
    setData(previous => {
      const old = previous.branches[key] ?? { ...emptyBranch(), total: comment.parent_id ? previous.comments[comment.parent_id]?.reply_count ?? 0 : previous.total ?? 0 };
      const ids = [...new Set([comment.id, ...old.ids])];
      const comments = { ...previous.comments, [comment.id]: comment };
      orderIds(ids, comments, sort);
      if (comment.parent_id && comments[comment.parent_id]) comments[comment.parent_id] = { ...comments[comment.parent_id], reply_count: comments[comment.parent_id].reply_count + 1 };
      return { comments, total: (previous.total ?? 0) + 1, branches: { ...previous.branches, [key]: { ...old, ids, total: old.total + 1, more: old.more || old.page === 0, loading: false, error: false } } };
    });
  };
  return { ...data, load, add, updateVote, alive };
}
