// Todo:
// -> share evidence limits and ordered media

// --- Evidence media ---
import type { ForumPost, PostMedia } from "@/types";

export const EVIDENCE_FILE_LIMIT = 5;
export const EVIDENCE_MAX_BYTES = 50 * 1024 * 1024;
export const EVIDENCE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};
export const EVIDENCE_ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.m4v,.webm,.mov";

/** Input: file header. Output: its supported media type, independent of its filename. */
export function evidenceContentType(bytes: Uint8Array): string | null {
  const word = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if ([137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)) return "image/png";
  if (word(0,4) === "RIFF" && word(8,12) === "WEBP") return "image/webp";
  if ([26,69,223,163].every((value, index) => bytes[index] === value)) return "video/webm";
  if (word(4,8) === "ftyp") {
    const brands = [word(8,12), ...Array.from({length:Math.max(0,Math.floor((bytes.length-16)/4))},(_,index) => word(16+index*4,20+index*4))];
    if (brands.some(brand => ["heic","heix","hevc","hevx"].includes(brand))) return "image/heic";
    if (brands.some(brand => ["mif1","msf1"].includes(brand))) return "image/heif";
    if (brands.includes("qt  ")) return "video/quicktime";
    return brands.some(brand=>["isom","iso2","mp41","mp42","avc1","M4V ","MSNV"].includes(brand)) ? "video/mp4" : null;
  }
  if (["moov","mdat","wide"].includes(word(4,8))) return "video/quicktime";
  return null;
}

/** Input: one selected file. Output: checked content type, or a short validation code. */
export async function inspectEvidenceFile(file: File): Promise<string> {
  if (!file.size) throw new Error("EMPTY_FILE");
  if (file.size > EVIDENCE_MAX_BYTES) throw new Error("FILE_TOO_LARGE");
  const contentType = evidenceContentType(new Uint8Array(await file.slice(0,64).arrayBuffer()));
  if (!contentType) throw new Error("UNSUPPORTED_FILE");
  return contentType;
}

export function getPostMedia(post: Pick<ForumPost, "media" | "media_items">): PostMedia[] {
  return post.media_items?.length ? post.media_items : [post.media];
}
// --- end of Evidence media ---
