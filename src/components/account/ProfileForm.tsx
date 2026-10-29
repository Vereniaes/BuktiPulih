// Edit the public account identity without requesting a real name.
"use client";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ProfileAvatar } from "./ProfileAvatar";
import { useAccount } from "./AccountSession";
import { updateProfileApi, uploadAvatarApi } from "@/services/account";
import { UsernameSettings } from "./UsernameSettings";
import type { AccountUser, Participation } from "@/types/account";
import styles from "./profile.module.css";
const copy = {
  id: { title: "Biodata", intro: "Informasi yang tampil pada posting dan komentar.", photo: "Foto profil", change: "Ganti foto", remove: "Hapus foto", email: "Email", emailLocked: "Email tidak dapat diubah.", emailMissing: "Belum tersedia", as: "Sebagai siapa?", select: "Pilih salah satu", affected: "Saya Terdampak", volunteer: "Saya Relawan", observer: "Saya Cuman mau Nimbrung", city: "Kamu dari mana?", optional: "opsional", save: "Simpan", saving: "Menyimpan…", saved: "Profil berhasil disimpan.", invalid: "Pilih foto JPG, PNG atau WebP, maksimal 2 MB.", conflict: "Username ini sudah digunakan.", choose: "Pilih salah satu pilihan.", error: "Profil belum dapat disimpan. Coba lagi." },
  en: { title: "Personal details", intro: "Information shown on posts and comments.", photo: "Profile photo", change: "Change photo", remove: "Remove photo", email: "Email", emailLocked: "Email cannot be changed.", emailMissing: "Not available", as: "I am here as", select: "Select one", affected: "I am affected", volunteer: "I am a volunteer", observer: "I am here to join the conversation", city: "Where are you from?", optional: "optional", save: "Save", saving: "Saving…", saved: "Profile saved.", invalid: "Choose a JPG, PNG or WebP photo, up to 2 MB.", conflict: "That username is already taken.", choose: "Select one option.", error: "Could not save. Please try again." },
};
export function ProfileForm({ user, language }: { user: AccountUser; language: "id" | "en" }) {
  const t = copy[language];
  const { setUser } = useAccount();
  const username = user.username ?? "";
  const [participation, setParticipation] = useState<Participation | null>(user.participation);
  const [city, setCity] = useState(user.city);
  const [avatar, setAvatar] = useState(user.avatar_url);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (avatar?.startsWith("blob:")) URL.revokeObjectURL(avatar); }, [avatar]);
  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setFeedback({ kind: "error", text: t.invalid }); return;
    }
    setPhoto(file); setAvatar(URL.createObjectURL(file)); setFeedback(null);
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!participation) { setFeedback({ kind: "error", text: t.choose }); return; }
    setBusy(true); setFeedback(null);
    try {
      const avatar_url = photo ? await uploadAvatarApi(photo) : avatar;
      if (photo) { setPhoto(null); setAvatar(avatar_url); }
      const next = await updateProfileApi({ participation, city: city.trim(), avatar_url });
      setUser(next); setCity(next.city); setAvatar(next.avatar_url);
      setFeedback({ kind: "success", text: t.saved });
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : t.error });
    } finally { setBusy(false); }
  };
  return <section className={styles.formSection} aria-labelledby="profile-title">
    <header className={styles.sectionHeader}><h2 id="profile-title">{t.title}</h2><p>{t.intro}</p></header>
    <form className={styles.profileForm} onSubmit={save} aria-busy={busy}>
      <div className={styles.photoRow}>
        <strong>{t.photo}</strong>
        <ProfileAvatar key={avatar ?? "empty"} username={username} src={avatar} className={styles.avatar} />
        <div className={styles.photoActions}><div className={styles.buttonRow}>
          <button type="button" className={styles.textButton} disabled={busy} onClick={() => fileRef.current?.click()}>{t.change}</button>
          {avatar && <button type="button" className={styles.textButton} disabled={busy} onClick={() => { setPhoto(null); setAvatar(null); setFeedback(null); }}>{t.remove}</button>}
        </div><small>JPG, PNG, WebP · 2 MB</small>
        <input ref={fileRef} className={styles.visuallyHidden} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} aria-label={t.change} disabled={busy} /></div>
      </div>
      <div className={styles.fields}>
        <UsernameSettings user={user} language={language} disabled={busy} />
        <div className={styles.field}><label htmlFor="profile-email">{t.email}</label>
          <input id="profile-email" type="email" value={user.email ?? ""} placeholder={t.emailMissing} readOnly aria-describedby="profile-email-hint" />
          <small id="profile-email-hint">{t.emailLocked}</small>
        </div>
        <div className={styles.field}><label htmlFor="profile-participation">{t.as}</label>
          <select id="profile-participation" name="participation" value={participation ?? ""} required disabled={busy}
            onChange={event => { setParticipation(event.target.value as Participation); setFeedback(null); }}>
            <option value="" disabled>{t.select}</option>
            {(["affected", "volunteer", "observer"] as const).map(value => <option key={value} value={value}>{t[value]}</option>)}
          </select>
        </div>
        <div className={styles.field}><label htmlFor="profile-city">{t.city} <span className={styles.optional}>({t.optional})</span></label>
          <input id="profile-city" autoComplete="address-level2" value={city} onChange={event => { setCity(event.target.value); setFeedback(null); }} maxLength={80} disabled={busy} />
        </div>
      </div>
      <footer className={styles.formFooter}><p className={styles.formMessage} role={feedback?.kind === "error" ? "alert" : "status"}>{feedback?.text}</p>
        <button className={styles.saveButton} type="submit" disabled={busy}>{busy ? t.saving : t.save}</button>
      </footer>
    </form>
  </section>;
}
