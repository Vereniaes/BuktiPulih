// Account comments with paged replies and server-owned votes.
"use client";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { AuthModal } from "../AuthModal";
import { useAccount } from "../account/AccountSession";
import { ProfileAvatar } from "../account/ProfileAvatar";
import { hasCompleteProfile } from "@/types/account";
import { createForumCommentApi, voteForumCommentApi } from "@/services/account";
import type { CommentSort, CommentVote, DiscussionComment } from "@/types/discussion";
import { ROOT_THREAD, useForumDiscussion } from "./useForumDiscussion";
import styles from "./comments.module.css";

const copy = {
  id: { title: "Diskusi", top: "Teratas", newest: "Terbaru", sort: "Urutan komentar", placeholder: "Tambahkan tanggapan...", replyPlaceholder: "Tulis balasan...", send: "Kirim komentar", sendReply: "Kirim balasan", sending: "Mengirim...", cancel: "Batal membalas", cancelShort: "Batal", as: "Komentar sebagai", replying: "Balasan untuk", login: "Masuk untuk berkomentar", loginHint: "Login/Register dulu baru bisa komentar", retry: "Coba lagi", loadError: "Komentar belum dapat dimuat.", empty: "Belum ada komentar. Mulai diskusi.", loading: "Memuat komentar...", more: "Muat komentar lainnya", moreReplies: "Muat balasan lainnya", reply: "Balas", showReplies: "Lihat balasan", hideReplies: "Sembunyikan balasan", collapse: "Lipat utas", expand: "Buka utas", saved: "Komentar terkirim.", replySaved: "Balasan terkirim.", voteError: "Suara belum tersimpan. Coba lagi.", sendError: "Komentar belum terkirim. Coba lagi.", complete: "Lengkapi profil untuk berkomentar", loginSuccess: "Sudah masuk. Silakan lanjutkan tindakan.", up: "Upvote komentar", down: "Downvote komentar", score: "Skor komentar", shorten: "Tampilkan lebih sedikit", full: "Baca selengkapnya" },
  en: { title: "Discussion", top: "Top", newest: "New", sort: "Comment order", placeholder: "Add a comment...", replyPlaceholder: "Write a reply...", send: "Post comment", sendReply: "Post reply", sending: "Posting...", cancel: "Cancel reply", cancelShort: "Cancel", as: "Commenting as", replying: "Replying to", login: "Sign in to comment", loginHint: "Login/Register before commenting", retry: "Try again", loadError: "Comments could not be loaded.", empty: "No comments yet. Start the discussion.", loading: "Loading comments...", more: "Load more comments", moreReplies: "Load more replies", reply: "Reply", showReplies: "Show replies", hideReplies: "Hide replies", collapse: "Collapse thread", expand: "Expand thread", saved: "Comment posted.", replySaved: "Reply posted.", voteError: "Vote was not saved. Try again.", sendError: "Comment was not posted. Try again.", complete: "Complete your profile to comment", loginSuccess: "Signed in. Continue your action.", up: "Upvote comment", down: "Downvote comment", score: "Comment score", shorten: "Show less", full: "Read more" },
};
type ReplyTarget = { id: string; username: string; ancestors: string[]; pages: Record<string, number> };
interface Props { postId: string; title: string; language?: "id" | "en" }
export function ForumComments({ postId, title, language = "id" }: Props) {
  const { user, status, setUser } = useAccount();
  const [authOpen, setAuthOpen] = useState(false), [sort, setSort] = useState<CommentSort>("top");
  const [draft, setDraft] = useState(""), [replyDraft, setReplyDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null), [notice, setNotice] = useState("");
  const composer = useRef<HTMLTextAreaElement>(null), replyComposer = useRef<HTMLTextAreaElement>(null);
  const t = copy[language];
  return <section id="comments-section" className={styles.section} aria-labelledby="discussion-title">
    <div className={styles.heading}>
      <h2 id="discussion-title">{t.title}</h2>
      <label className={styles.sort}>{t.sort}<select aria-label={t.sort} value={sort} onChange={event => setSort(event.target.value as CommentSort)}>
        <option value="top">{t.top}</option><option value="new">{t.newest}</option>
      </select></label>
    </div>
    <Discussion key={`${postId}:${user?.id ?? "guest"}:${user?.session_context ?? ""}:${sort}`} postId={postId} title={title} language={language} sort={sort}
      draft={draft} setDraft={setDraft} replyDraft={replyDraft} setReplyDraft={setReplyDraft} replyTo={replyTo} setReplyTo={setReplyTo}
      composer={composer} replyComposer={replyComposer} openAuth={() => setAuthOpen(true)} notice={notice} setNotice={setNotice} />
    <AuthModal isOpen={authOpen && status !== "loading"} onClose={() => setAuthOpen(false)} onLoginSuccess={next => {
      setUser(next); setAuthOpen(false); setNotice(t.loginSuccess);
      requestAnimationFrame(() => (replyTo ? replyComposer : composer).current?.focus());
    }} />
  </section>;
}
interface DiscussionProps extends Required<Props> {
  sort: CommentSort; draft: string; setDraft: (value: string) => void; replyDraft: string; setReplyDraft: (value: string) => void;
  replyTo: ReplyTarget | null; setReplyTo: (target: ReplyTarget | null) => void;
  composer: RefObject<HTMLTextAreaElement | null>; replyComposer: RefObject<HTMLTextAreaElement | null>;
  openAuth: () => void; notice: string; setNotice: (message: string) => void;
}
function Discussion({ postId, title, language, sort, draft, setDraft, replyDraft, setReplyDraft, replyTo, setReplyTo, composer, replyComposer, openAuth, notice, setNotice }: DiscussionProps) {
  const { user } = useAccount(), discussion = useForumDiscussion(postId, sort);
  const [sending, setSending] = useState<string | null>(null), [sendError, setSendError] = useState<{ target: string; message: string } | null>(null);
  const locked = useRef(false), t = copy[language], root = discussion.branches[ROOT_THREAD];
  const load = discussion.load;
  useEffect(() => {
    if (root?.more && !root.loading && !root.error && root.page < (replyTo?.pages[ROOT_THREAD] ?? 1)) void load(null, root.page + 1);
  }, [root, replyTo?.pages, load]);
  const startReply = (comment: DiscussionComment, ancestors: string[]) => {
    if (locked.current) return;
    if (replyTo?.id !== comment.id) setReplyDraft("");
    setSendError(null);
    setReplyTo({ id: comment.id, username: comment.author.username, ancestors,
      pages: Object.fromEntries([ROOT_THREAD, ...ancestors, comment.id].map(key => [key, Math.max(1, discussion.branches[key]?.page ?? 1)])),
    });
  };
  const submit = async (event: FormEvent, parentId?: string) => {
    event.preventDefault();
    if (!user) { openAuth(); return; }
    if (!hasCompleteProfile(user) || locked.current) return;
    locked.current = true; setSending(parentId ?? ROOT_THREAD); setSendError(null); setNotice("");
    try {
      const comment = await createForumCommentApi(postId, (parentId ? replyDraft : draft).trim(), title, parentId);
      if (!discussion.alive.current) return;
      discussion.add(comment);
      if (parentId) {
        setReplyDraft(""); setReplyTo(null);
        requestAnimationFrame(() => { const node = document.getElementById(`comment-${comment.id}`); node?.focus({ preventScroll: true }); node?.scrollIntoView({ block: "nearest" }); });
      } else setDraft("");
      setNotice(comment.parent_id ? t.replySaved : t.saved);
    } catch (error) {
      if (discussion.alive.current) setSendError({ target: parentId ?? ROOT_THREAD, message: error instanceof Error ? error.message : t.sendError });
    } finally { locked.current = false; if (discussion.alive.current) setSending(null); }
  };
  const renderReply = (id: string) => replyTo?.id === id ? <CommentComposer key={id} language={language} draft={replyDraft} setDraft={setReplyDraft} replyTo={replyTo}
    composer={replyComposer} blocked={sending !== null} sending={sending === id} error={sendError?.target === id ? sendError.message : ""}
    onSubmit={event => void submit(event, id)} cancelReply={() => { setReplyTo(null); document.getElementById(`comment-${id}`)?.focus({ preventScroll: true }); }} openAuth={openAuth} /> : null;
  return <>
    <CommentComposer language={language} draft={draft} setDraft={setDraft} composer={composer} blocked={sending !== null} sending={sending === ROOT_THREAD}
      error={sendError?.target === ROOT_THREAD ? sendError.message : ""} onSubmit={event => void submit(event)} openAuth={openAuth} />
    <p className={styles.notice} role="status">{notice}</p>
    <div className={styles.threadList} aria-busy={!root || root.loading}>
      {root?.ids.map(id => <CommentThread key={id} id={id} depth={0} ancestors={[]} replyTo={replyTo} blocked={sending !== null} renderReply={renderReply}
        language={language} postId={postId} discussion={discussion} startReply={startReply} openAuth={openAuth} />)}
      {(!root || root.loading) && <p className={styles.state} role="status">{t.loading}</p>}
      {root?.error && <div className={styles.state} role="alert"><p>{t.loadError}</p><button type="button" className={styles.textButton} onClick={() => void load(null, root.page + 1)}>{t.retry}</button></div>}
      {root && !root.loading && !root.error && root.ids.length === 0 && <p className={styles.state}>{t.empty}</p>}
      {root?.more && !root.loading && !root.error && <button type="button" className={styles.more} onClick={() => void load(null, root.page + 1)}>{t.more}</button>}
    </div>
  </>;
}
interface ComposerProps {
  language: "id" | "en"; draft: string; setDraft: (value: string) => void; composer: RefObject<HTMLTextAreaElement | null>; replyTo?: ReplyTarget;
  blocked: boolean; sending: boolean; error: string; onSubmit: (event: FormEvent) => void; cancelReply?: () => void; openAuth: () => void;
}
function CommentComposer({ language, draft, setDraft, composer, replyTo, blocked, sending, error, onSubmit, cancelReply, openAuth }: ComposerProps) {
  const { user, status } = useAccount(), id = useId(), t = copy[language];
  useEffect(() => {
    if (!replyTo) return;
    composer.current?.focus({ preventScroll: true }); composer.current?.scrollIntoView({ behavior: "auto", block: "center" });
  }, [replyTo, composer]);
  const label = !user ? t.loginHint : replyTo ? t.replyPlaceholder : t.placeholder;
  return <form id={replyTo ? `reply-composer-${replyTo.id}` : undefined} className={`${styles.composer} ${replyTo ? styles.inlineComposer : ""}`} onSubmit={onSubmit}>
    {user && <div className={styles.composerHeader}><span className={styles.identity}><ProfileAvatar username={user.username} src={user.avatar_url} className={styles.avatar} /><span>{!replyTo && <>{t.as} </>}<strong>@{user.username}</strong></span></span></div>}
    {replyTo && <div className={styles.replyTarget}><span>{t.replying} <strong>{replyTo.username === "Deleted Account" ? replyTo.username : `@${replyTo.username}`}</strong></span><button type="button" disabled={blocked} aria-label={t.cancel} onClick={cancelReply}>{t.cancelShort}</button></div>}
    <label className="visually-hidden" htmlFor={id}>{label}</label>
    <textarea id={id} ref={composer} value={draft} onChange={event => setDraft(event.target.value)} placeholder={label} minLength={3} maxLength={3000} required rows={3} readOnly={blocked} />
    <div className={styles.composerFooter}><span className={styles.hint}>{draft.length.toLocaleString(language === "id" ? "id-ID" : "en-GB")} / 3.000</span>
      {user && !hasCompleteProfile(user) ? <Link className={styles.primary} href="/profile">{t.complete}</Link> : <button className={styles.primary} type={user ? "submit" : "button"} onClick={!user ? openAuth : undefined}
        disabled={blocked || status === "loading" || Boolean(user && draft.trim().length < 3)}>{sending ? t.sending : !user ? t.login : replyTo ? t.sendReply : t.send}</button>}
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </form>;
}

type DiscussionData = ReturnType<typeof useForumDiscussion>;
interface ThreadProps {
  id: string; depth: number; language: "id" | "en"; postId: string; discussion: DiscussionData;
  ancestors: string[]; replyTo: ReplyTarget | null; blocked: boolean; renderReply: (id: string) => ReactNode;
  startReply: (comment: DiscussionComment, ancestors: string[]) => void; openAuth: () => void;
}
function CommentThread({ id, depth, language, postId, discussion, ancestors, replyTo, blocked, renderReply, startReply, openAuth }: ThreadProps) {
  const { user, status } = useAccount();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(() => replyTo?.id === id || Boolean(replyTo?.ancestors.includes(id)));
  const [full, setFull] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const comment = discussion.comments[id];
  const replies = discussion.branches[id];
  const load = discussion.load;
  const t = copy[language];
  useEffect(() => {
    if (!expanded || !comment) return;
    if (!replies && comment.reply_count > 0) void load(id);
    const goal = replyTo?.pages[id] ?? 1;
    if (replies?.more && !replies.loading && !replies.error && replies.page < goal) void load(id, replies.page + 1);
  }, [expanded, id, comment, replies, replyTo?.pages, load]);
  if (!comment) return null;
  const vote = async (direction: Exclude<CommentVote, null>) => {
    if (!user) { openAuth(); return; }
    if (pending) return;
    if (!hasCompleteProfile(user)) { setError(t.complete); return; }
    setPending(true); setError("");
    try {
      const result = await voteForumCommentApi(postId, id, comment.viewer_vote === direction ? null : direction);
      if (discussion.alive.current) discussion.updateVote(id, result.score, result.viewer_vote);
    } catch (cause) { if (discussion.alive.current) setError(cause instanceof Error ? cause.message : t.voteError); }
    finally { if (discussion.alive.current) setPending(false); }
  };
  const toggleReplies = () => {
    setExpanded(!expanded);
    if (!expanded && !replies) void load(id);
  };
  const at = new Date(comment.created_at);
  const date = new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(at);
  const long = comment.content.length > 650;
  const showReplies = expanded;
  return <article tabIndex={-1} id={`comment-${id}`} className={styles.comment} data-depth={Math.min(depth, 3)} aria-label={`@${comment.author.username}`}>
    <div className={styles.commentHeader}>
      <ProfileAvatar username={comment.author.username} src={comment.author.avatar_url} className={styles.avatar} />
      <span className={styles.commentMeta}><strong>{comment.author.username === "Deleted Account" ? comment.author.username : `@${comment.author.username}`}</strong><time dateTime={comment.created_at}>{date}</time></span>
      <button type="button" className={styles.collapse} aria-label={`${collapsed ? t.expand : t.collapse} @${comment.author.username}`} aria-expanded={!collapsed} aria-controls={`comment-body-${id}`} onClick={() => setCollapsed(!collapsed)}><span aria-hidden="true">{collapsed ? "+" : "−"}</span></button>
    </div>
    <div id={`comment-body-${id}`} className={styles.commentBody} hidden={collapsed}>
      <p className={styles.content}>{long && !full ? `${comment.content.slice(0, 650)}…` : comment.content}</p>
      {long && <button type="button" className={styles.textButton} onClick={() => setFull(!full)}>{full ? t.shorten : t.full}</button>}
      <div className={styles.commentActions}>
        <div className={styles.votes} aria-busy={pending}>
          <button type="button" aria-label={`${t.up} @${comment.author.username}`} aria-pressed={comment.viewer_vote === "up"} data-direction="up" disabled={pending || status === "loading"} onClick={() => void vote("up")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 7-8 7 8h-4v8H9v-8Z" /></svg></button>
          <span aria-label={t.score}>{comment.score}</span>
          <button type="button" aria-label={`${t.down} @${comment.author.username}`} aria-pressed={comment.viewer_vote === "down"} data-direction="down" disabled={pending || status === "loading"} onClick={() => void vote("down")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 7 8 7-8h-4V4H9v8Z" /></svg></button>
        </div>
        <button type="button" className={styles.textButton} disabled={blocked} aria-expanded={replyTo?.id === id} aria-controls={replyTo?.id === id ? `reply-composer-${id}` : undefined} onClick={() => { setExpanded(true); startReply(comment, ancestors); }}>{t.reply}</button>
        {comment.reply_count > 0 && <button type="button" className={styles.textButton} aria-expanded={showReplies && !collapsed} aria-controls={`replies-${id}`} onClick={toggleReplies}>
          {showReplies ? t.hideReplies : `${t.showReplies} (${comment.reply_count})`}
        </button>}
      </div>
      {error && <p className={styles.error} role="alert">{error}{user && !hasCompleteProfile(user) && <> <Link href="/profile">{t.complete}</Link></>}</p>}
      {showReplies && <div id={`replies-${id}`} className={styles.replies}>
        {replies?.ids.map(child => <CommentThread key={child} id={child} depth={depth + 1} language={language} postId={postId} discussion={discussion} ancestors={[...ancestors, id]} replyTo={replyTo} blocked={blocked} renderReply={renderReply} startReply={startReply} openAuth={openAuth} />)}
        {replies?.loading && <p className={styles.state} role="status">{t.loading}</p>}
        {replies?.error && <div role="alert"><p className={styles.error}>{t.loadError}</p><button type="button" className={styles.textButton} onClick={() => void load(id, replies.page + 1)}>{t.retry}</button></div>}
        {replies?.more && !replies.loading && !replies.error && <button type="button" className={styles.textButton} onClick={() => void load(id, replies.page + 1)}>{t.moreReplies}</button>}
      </div>}
      {renderReply(id)}
    </div>
  </article>;
}
