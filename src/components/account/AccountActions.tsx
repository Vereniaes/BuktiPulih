// Place account actions last and confirm permanent deletion with the current password.
"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "./AccountSession";
import { PasswordFields } from "./PasswordFields";
import auth from "./AuthModal.module.css";
import styles from "./account-actions.module.css";
export function AccountActions({ language }: { language: "id" | "en" }) {
  const { logout, deleteAccount } = useAccount();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState<"logout" | "delete" | null>(null);
  const [opened, setOpened] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const isEn = language === "en";
  const leave = async () => {
    if (busy.current) return;
    busy.current = true; setPending("logout"); setError("");
    try { await logout(); router.replace("/?tab=forum"); }
    catch { setError(isEn ? "Could not sign out. Try again." : "Belum berhasil keluar. Coba lagi."); }
    finally { busy.current = false; setPending(null); }
  };
  const remove = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true; setPending("delete"); setError("");
    try {
      await deleteAccount(password);
      // Discard cached pages as well as stored author data after permanent deletion.
      window.location.replace("/?tab=forum");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (isEn ? "Could not delete the account. Try again." : "Akun belum berhasil dihapus. Coba lagi."));
    } finally { busy.current = false; setPending(null); }
  };
  const open = () => {
    setError(""); setPassword(""); setOpened(true); dialog.current?.showModal();
    dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
  };
  const close = () => { if (!busy.current) dialog.current?.close(); };
  return <section className={styles.section} aria-label={isEn ? "Account actions" : "Tindakan akun"}>
    <div className={styles.actions}>
      <button ref={trigger} type="button" className={styles.deleteButton} onClick={open} disabled={!!pending}>{isEn ? "Delete account" : "Hapus akun"}</button>
      <button type="button" className={styles.dangerButton} onClick={() => void leave()} disabled={!!pending}>{pending === "logout" ? (isEn ? "Signing out…" : "Keluar…") : (isEn ? "Sign out" : "Keluar")}</button>
    </div>
    {error && !opened && <p className={auth.error} role="alert">{error}</p>}
    <dialog ref={dialog} className={`${auth.dialog} ${styles.dialog}`} aria-labelledby="delete-account-title" aria-describedby="delete-account-description"
      onCancel={event => { if (busy.current) event.preventDefault(); }}
      onClose={() => { setOpened(false); setPassword(""); setError(""); trigger.current?.focus(); }}>
      <div className={auth.header}>
        <div><span className={auth.eyebrow}>BuktiPulih</span><h2 id="delete-account-title">{isEn ? "Delete account?" : "Hapus akun?"}</h2></div>
        <button type="button" className={auth.close} aria-label={isEn ? "Close dialog" : "Tutup dialog"} onClick={close} disabled={!!pending}>×</button>
      </div>
      <p id="delete-account-description" className={auth.intro}>{isEn ? "Your account and access will be permanently deleted. Posts, comments and replies will remain as " : "Akun dan akses akan dihapus permanen. Posting, komentar, dan balasan tetap ada sebagai "}<strong>Deleted Account</strong>.</p>
      <form className={auth.form} onSubmit={event => void remove(event)} aria-busy={pending === "delete"}>
        <PasswordFields value={password} onChange={value => { setPassword(value); setError(""); }} create={false} disabled={!!pending} />
        {error && <p className={auth.error} role="alert">{error}</p>}
        <div className={styles.confirmActions}>
          <button type="button" className={styles.cancelButton} onClick={close} disabled={!!pending}>{isEn ? "Cancel" : "Batal"}</button>
          <button type="submit" className={styles.dangerButton} disabled={!!pending || !password}>{pending === "delete" ? (isEn ? "Deleting…" : "Menghapus…") : (isEn ? "Delete account" : "Hapus akun")}</button>
        </div>
      </form>
    </dialog>
  </section>;
}
