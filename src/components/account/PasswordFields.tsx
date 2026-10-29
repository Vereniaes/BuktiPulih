// Let password managers fill credentials and allow an explicit visibility toggle.
"use client";
import { useState } from "react";
import styles from "./AuthModal.module.css";
export function PasswordFields({ value, onChange, confirmation, onConfirm, create, disabled }: {
  value: string; onChange: (value: string) => void; confirmation?: string;
  onConfirm?: (value: string) => void; create: boolean; disabled: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return <>
    <label className={styles.label} htmlFor="auth-password">{create ? "Buat password" : "Password"}</label>
    <div className={styles.passwordField}>
      <input id="auth-password" className={styles.input} type={visible ? "text" : "password"} autoComplete={create ? "new-password" : "current-password"} required pattern={String.raw`\S+`} title="Password tidak boleh mengandung spasi." maxLength={256} disabled={disabled} value={value} onChange={event => onChange(event.target.value)} aria-describedby={create ? "auth-password-help" : undefined} />
      <button type="button" className={styles.passwordToggle} aria-label={visible ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Sembunyikan" : "Tampilkan"}</button>
    </div>
    {create && <small id="auth-password-help" className={styles.hint}>8-128 karakter, tanpa spasi.</small>}
    {create && onConfirm && <>
      <label className={styles.label} htmlFor="auth-password-confirm">Konfirmasi password</label>
      <input id="auth-password-confirm" className={styles.input} type={visible ? "text" : "password"} autoComplete="new-password" required pattern={String.raw`\S+`} title="Password tidak boleh mengandung spasi." maxLength={256} disabled={disabled} value={confirmation ?? ""} onChange={event => onConfirm(event.target.value)} />
    </>}
  </>;
}
