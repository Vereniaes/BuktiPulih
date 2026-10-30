// Todo:
// -> read account activity and save authenticated contributions
// -> upload avatars and evidence through their own storage paths

// --- Account API ---
import type { CommentPage, CommentSort, CommentVote, DiscussionComment } from "@/types/discussion";
import type { AccountUser, ActivityKind, ActivityPage, ProfileUpdate } from "@/types/account";
import type { ForumPost, EvidenceSubmission, RecoveryReport } from "@/types";
import { FORUM_PAGE_SIZE } from "@/utils/forumDisplay";
import { compressImageClient, resizeImageBlob } from "@/utils/imageCompression";
import { EVIDENCE_TYPES, inspectEvidenceFile } from "@/utils/evidenceMedia";
import { ApiError, getApiSessionContext, requestApi } from "./http";
export { ApiError } from "./http";
export async function getCurrentUserApi(): Promise<AccountUser> {
  const result = await requestApi<{ user: AccountUser }>("/auth/me");
  if (!result.user?.id) throw new ApiError(502, "INVALID_RESPONSE", "Sesi belum dapat dimuat.");
  return result.user;
}
export function deleteAccountApi(password: string) {
  return requestApi<{ deleted: true }>("/auth/me", { method: "DELETE", body: JSON.stringify({ password }) });
}
export function updateProfileApi(payload: Partial<ProfileUpdate>, signal?: AbortSignal) {
  return requestApi<AccountUser>("/auth/me", { method: "PATCH", body: JSON.stringify(payload), signal });
}
export function getAccountActivityApi(type: ActivityKind, page: number, signal: AbortSignal) {
  return requestApi<ActivityPage>(`/auth/me/activity?${new URLSearchParams({ type, page: String(page), limit: "10" })}`, { signal });
}
export function createForumPostApi(payload: EvidenceSubmission, signal?: AbortSignal) {
  return requestApi<RecoveryReport>("/forum/posts", { method: "POST", body: JSON.stringify(payload), signal });
}
export function getForumPostsApi(signal: AbortSignal, page = 1) {
  return requestApi<{
    items: ForumPost[];
    pagination: { page: number; total_pages: number };
    legacy_comment_counts?: Record<string, number>;
  }>(`/forum/posts?page=${page}&limit=${FORUM_PAGE_SIZE}`, { signal });
}
export function getForumPostApi(id: string, signal?: AbortSignal) {
  return requestApi<ForumPost>(`/forum/posts/${encodeURIComponent(id)}`, { signal });
}
export function getForumCommentsApi(id: string, options: { page: number; sort: CommentSort; parentId?: string | null }, signal: AbortSignal) {
  const params = new URLSearchParams({ page: String(options.page), sort: options.sort, limit: "10" });
  if (options.parentId) params.set("parent_id", options.parentId);
  return requestApi<CommentPage>(`/forum/posts/${encodeURIComponent(id)}/comments?${params}`, { signal });
}
export function createForumCommentApi(postId: string, content: string, title: string, parentId?: string | null) {
  return requestApi<DiscussionComment>(`/forum/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST", body: JSON.stringify({ content, post_title: title, ...(parentId ? { parent_id: parentId } : {}) }),
  });
}
export function voteForumCommentApi(postId: string, commentId: string, vote: CommentVote) {
  return requestApi<{ comment_id: string; score: number; viewer_vote: CommentVote }>(`/forum/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/vote`, {
    method: "POST", body: JSON.stringify({ vote: vote ?? "clear" }),
  });
}
export async function uploadAvatarApi(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
    throw new Error("Pilih foto JPG, PNG atau WebP, maksimal 2 MB.");
  }
  const compressed = await compressImageClient(file, 512, 0.82, 512);
  const blob = await (await fetch(compressed.dataUrl)).blob();
  return uploadFileApi(new File([blob], "profile.webp", { type: "image/webp" }), "avatar");
}
async function uploadFileApi(file: File, purpose: "avatar" | "evidence", signal?: AbortSignal): Promise<string> {
  const form = new FormData(); form.set("file", file); form.set("purpose", purpose);
  const context = getApiSessionContext();
  const response = await fetch("/api/upload", { method: "POST", body: form, signal, headers: context ? { "X-Session-Context": context } : {} });
  const result = await response.json().catch(() => null);
  if (response.status === 401) window.dispatchEvent(new Event("buktipulih-session-expired"));
  if (response.status === 409) window.dispatchEvent(new Event("buktipulih-session-changed"));
  if (!response.ok || !result?.url) throw new Error(result?.error || "Berkas belum dapat diunggah. Coba lagi.");
  return result.url;
}
export async function uploadEvidenceApi(file: File, signal?: AbortSignal, onProgress?: (percentage: number) => void) {
  const contentType = await inspectEvidenceFile(file);
  if (file.type !== contentType) file = new File([file],file.name,{type:contentType,lastModified:file.lastModified});
  if (contentType.startsWith("image/")) {
    try {
      const { blob } = await resizeImageBlob(file);
      file = new File([blob], "evidence.webp", { type: "image/webp" });
    } catch (error) {
      if (!["image/heic","image/heif"].includes(contentType)) throw error;
    }
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const { upload } = await import("@vercel/blob/client");
  const session = getApiSessionContext();
  if (!session) throw new Error("Silakan masuk kembali.");
  const blob = await upload(`bukti-lapangan/${crypto.randomUUID()}.${EVIDENCE_TYPES[file.type]}`,file,{
    access:"public",handleUploadUrl:"/api/evidence/upload",contentType:file.type,multipart:file.size>=5*1024*1024,abortSignal:signal,
    headers:{"X-Session-Context":session},clientPayload:JSON.stringify({size:file.size,contentType:file.type}),
    onUploadProgress: progress => onProgress?.(progress.percentage),
  });
  return blob.url;
}
// --- end of Account API ---
