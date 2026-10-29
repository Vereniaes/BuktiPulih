// Account identity and the two private activity lists.
export type Participation = "affected" | "volunteer" | "observer";
export interface AccountUser {
  id: string;
  username: string | null;
  username_saves_remaining?: number;
  participation: Participation | null;
  avatar_url: string | null;
  city: string;
  phone_number: string | null;
  email: string | null;
  session_context?: string;
  role: string;
  role_badge: string;
  organization_name?: string | null;
  assigned_plots: string[];
  created_at: string;
}
export interface ProfileUpdate {
  username: string;
  participation: Participation;
  avatar_url: string | null;
  city: string;
}
export type ActivityKind = "posts" | "comments";
export interface ActivityPage {
  items: { id: string; post_id: string; title: string; content: string; created_at: string; is_anonymous?: boolean; verification_status?: "unverified" }[];
  pagination: { page: number; limit: number; total_items: number; total_pages: number };
}
export function hasCompleteProfile(user: AccountUser) {
  return Boolean(user.username && user.participation);
}
