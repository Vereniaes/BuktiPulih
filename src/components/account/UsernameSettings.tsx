// Save a username separately and show the remaining opportunities.
"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useAccount } from "./AccountSession";
import { ApiError, updateProfileApi } from "@/services/account";
import { USERNAME_HINT, USERNAME_PATTERN } from "@/utils/usernamePolicy";
import type { AccountUser } from "@/types/account";
import auth from "./AuthModal.module.css";
import styles from "./profile.module.css";
export function UsernameSettings({ user, language, disabled }: { user: AccountUser; language: "id" | "en"; disabled: boolean }) {
  const { setUser, refresh } = useAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const display = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const [opened, setOpened] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isEn = language === "en";
  const remaining = user.username_saves_remaining ?? (user.username ? 1 : 2);
  const heading = user.username ? (isEn ? "Change username" : "Ubah username") : (isEn ? "Set username" : "Atur username");
  const hint = remaining === 0 ? (isEn ? "Username cannot be changed again." : "Username tidak dapat diubah lagi.")
    : user.username ? (isEn ? `Changes remaining: ${remaining}.` : `Sisa perubahan: ${remaining} kali.`)
    : (isEn ? "Username can be saved twice in total." : "Username dapat disimpan 2 kali secara total.");
  useEffect(() => {
    if (!opened) return;
    dialog.current?.showModal();
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [opened]);
  const open = () => {
    setDraft(user.username ?? ""); setError(""); setNotice(""); setOpened(true);
  };
  const close = () => { if (!busy.current) dialog.current?.close(); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); event.stopPropagation();
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      const next = await updateProfileApi({ username: draft });
      setUser(next); setNotice(isEn ? "Username saved." : "Username berhasil disimpan.");
      dialog.current?.close();
    } catch (cause) {
      if (cause instanceof ApiError && ["USERNAME_LIMIT", "PROFILE_CHANGED"].includes(cause.code)) await refresh();
      setError(cause instanceof Error ? cause.message : (isEn ? "Could not save username. Try again." : "Username belum dapat disimpan. Coba lagi."));
    } finally { busy.current = false; setPending(false); }
  };
  return <div className={styles.field}>
    <label htmlFor="profile-username">Username</label>
    <div className={styles.usernameRow}>
      <input ref={display} id="profile-username" value={user.username ?? ""} placeholder={isEn ? "Not set" : "Belum diatur"} readOnly aria-describedby="profile-username-hint" />
      {remaining > 0 && <button ref={trigger} type="button" className={styles.secondaryButton} onClick={open} disabled={disabled} aria-label={heading}>{user.username ? (isEn ? "Change" : "Ubah") : (isEn ? "Set" : "Atur")}</button>}
    </div>
    <small id="profile-username-hint">{hint}</small>
    {notice && <small className={styles.usernameNotice} role="status">{notice}</small>}
    {opened && createPortal(<dialog ref={dialog} className={`${auth.dialog} ${styles.usernameDialog}`} aria-labelledby="username-dialog-title" aria-describedby="username-dialog-description"
      onCancel={event => { if (busy.current) event.preventDefault(); }}
      onClose={() => { setOpened(false); setDraft(""); setError(""); requestAnimationFrame(() => (trigger.current ?? display.current)?.focus()); }}>
      <div className={auth.header}>
        <div><span className={auth.eyebrow}>BuktiPulih</span><h2 id="username-dialog-title">{heading}</h2></div>
        <button type="button" className={auth.close} aria-label={isEn ? "Close dialog" : "Tutup dialog"} onClick={close} disabled={pending}>×</button>
      </div>
      <p id="username-dialog-description" className={auth.intro}>{remaining === 0 ? (isEn ? "Username cannot be changed again." : "Username tidak dapat diubah lagi.")
        : user.username && remaining === 1 ? (isEn ? "This is your last username change." : "Ini adalah kesempatan terakhir untuk mengubah username.")
        : (isEn ? "Username can be saved twice, including the first time." : "Username dapat disimpan 2 kali, termasuk penetapan pertama.")}</p>
      <form className={auth.form} onSubmit={event => void save(event)} aria-busy={pending}>
        <label className={auth.label} htmlFor="username-dialog-input">Username</label>
        <input ref={input} id="username-dialog-input" className={auth.input} value={draft} onChange={event => { setDraft(event.target.value); setError(""); }}
          autoComplete="username" autoCapitalize="none" spellCheck={false} pattern={USERNAME_PATTERN.source} required disabled={pending || remaining === 0} aria-describedby="username-dialog-hint" />
        <small id="username-dialog-hint" className={auth.hint}>{USERNAME_HINT[language]}</small>
        {error && <p className={auth.error} role="alert">{error}</p>}
        <div className={styles.usernameDialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={close} disabled={pending}>{isEn ? "Cancel" : "Batal"}</button>
          <button type="submit" className={styles.primaryButton} disabled={pending || remaining === 0 || !draft || draft === (user.username ?? "")}>{pending ? (isEn ? "Saving…" : "Menyimpan…") : (isEn ? "Save username" : "Simpan username")}</button>
        </div>
      </form>
    </dialog>, document.body)}
  </div>;
}
