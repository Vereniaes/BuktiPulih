// Server-owned comments, replies and one vote per account.
import type { ForumComment } from "@/types";
export type CommentSort = "top" | "new";
export type CommentVote = "up" | "down" | null;
export interface DiscussionComment extends ForumComment {
  parent_id: string | null;
  reply_count: number;
  score: number;
  viewer_vote: CommentVote;
}
export interface CommentPage {
  items: DiscussionComment[];
  pagination: { page: number; limit: number; total_items: number; total_pages: number };
  total_comments: number;
}
