// Start and verify email sign-in, then finish a new account profile.
"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, LazyMotion, domMax } from "motion/react";
import { AuthDialogFrame } from "./account/AuthDialogFrame";
import { ApiError, updateProfileApi } from "@/services/account";
import { useAccount } from "@/components/account/AccountSession";
import { setApiSessionContext } from "@/services/http";
import { matchesPasswordFormat } from "@/utils/passwordPolicy";
import { USERNAME_HINT, USERNAME_PATTERN } from "@/utils/usernamePolicy";
import { PasswordFields } from "./account/PasswordFields";
import { emailAuthApi, type EmailAuthFlow, type EmailAuthPurpose } from "@/services/email-auth";
import { hasCompleteProfile, type AccountUser, type Participation } from "@/types/account";
import styles from "./account/AuthModal.module.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AccountUser, message: string) => void;
}

type Screen = "email" | "code" | "profile" | "password";
const STORAGE_KEY = "buktipulih_email_auth_flow_v1";
const roles: { value: Participation; label: string }[] = [
  { value: "volunteer", label: "Saya Relawan" },
  { value: "affected", label: "Saya Terdampak" },
  { value: "observer", label: "Saya Cuman mau Nimbrung" },
];

function readStoredFlow(): EmailAuthFlow | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const flow = JSON.parse(raw) as EmailAuthFlow;
    return flow.flow_id && flow.masked_email && flow.expires_at && flow.resend_at && flow.server_time && ["login", "register", "reset"].includes(flow.purpose) ? flow : null;
  } catch { return null; }
}

function storeFlow(flow: EmailAuthFlow) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(flow)); } catch {}
}

function clearStoredFlow() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [screen, setScreen] = useState<Screen>("email");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<EmailAuthPurpose>("login");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [flow, setFlow] = useState<EmailAuthFlow | null>(null);
  const [code, setCode] = useState("");
  const [pendingUser, setPendingUser] = useState<AccountUser | null>(null);
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [participation, setParticipation] = useState<Participation | "">("");
  const { refresh } = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef("");
  const operationRef = useRef(0);
  const operationKindRef = useRef<"email" | "resend" | "verify" | "profile" | "cancel" | "password" | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const closeRef = useRef<() => void>(() => {});
  const openedFromRef = useRef<HTMLElement | null>(null);
  const savedOverflowRef = useRef("");

  const setTimedFlow = useCallback((next: EmailAuthFlow | null) => {
    const at = Date.now();
    setFlow(next);
    setNow(at);
    setClockOffset(next ? Date.parse(next.server_time) - at : 0);
  }, [setFlow, setClockOffset]);
  const remaining = (deadline?: string) => Math.max(0, Math.ceil((Date.parse(deadline ?? "") - (now + clockOffset)) / 1000));
  const expiresIn = remaining(flow?.expires_at);
  const resendIn = remaining(flow?.resend_at);
  const isCurrent = useCallback((operation: number, signal: AbortSignal) => operationRef.current === operation && !signal.aborted, []);

  useEffect(() => {
    if (!isOpen) return;
    openedFromRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    savedOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const stored = readStoredFlow();
    if (stored) {
      const controller = new AbortController();
      const operation = ++operationRef.current;
      controllerRef.current = controller;
      requestAnimationFrame(() => {
        if (!isCurrent(operation, controller.signal)) return;
        setTimedFlow(stored);
        setMode(stored.purpose);
        setScreen(stored.status === "reset_verified" ? "password" : "code");
        setNow(Date.now());
        void emailAuthApi.getFlow(stored.flow_id, controller.signal).then((restored) => {
          if (!isCurrent(operation, controller.signal)) return;
          setTimedFlow(restored);
          storeFlow(restored);
        }).catch(() => {
          if (!isCurrent(operation, controller.signal)) return;
          clearStoredFlow();
          setTimedFlow(null);
          setScreen("email");
        }).finally(() => {
          if (operationRef.current === operation) controllerRef.current = null;
        });
      });
    } else {
      requestAnimationFrame(() => setNow(Date.now()));
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = savedOverflowRef.current;
      openedFromRef.current?.focus();
    };
    // The open boundary owns focus and scroll handling.
  }, [isOpen, isCurrent, setTimedFlow]);

  useEffect(() => {
    if (!isOpen) {
      operationRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
      operationKindRef.current = null;
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => (screen === "email" ? emailRef.current : screen === "code" ? codeRef.current : screen === "profile" ? usernameRef.current : dialogRef.current?.querySelector<HTMLInputElement>("#auth-password"))?.focus());
  }, [isOpen, screen]);

  const close = useCallback(() => {
    const refreshAccount = Boolean(pendingUser || operationKindRef.current === "verify");
    operationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    operationKindRef.current = null;
    setBusy(false);
    setCode("");
    setPassword(""); setConfirmation("");
    setError("");
    if (pendingUser) {
      setApiSessionContext(pendingUser.session_context ?? null);
      onLoginSuccess(pendingUser, "Sesi tersimpan. Profil dapat dilengkapi nanti.");
      setPendingUser(null);
      setScreen("email");
    }
    onClose();
    if (refreshAccount) window.setTimeout(() => void refresh(), 250);
  }, [pendingUser, onClose, onLoginSuccess, refresh]);
  useEffect(() => { closeRef.current = close; }, [close]);

  const beginRequest = (kind: "email" | "resend" | "verify" | "profile" | "cancel" | "password") => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const operation = ++operationRef.current;
    operationKindRef.current = kind;
    if ((kind === "email" || kind === "resend") && !requestIdRef.current) requestIdRef.current = crypto.randomUUID();
    setBusy(true);
    setError(""); setMessage("");
    return { controller, operation, requestId: requestIdRef.current };
  };

  const finishRequest = (operation: number) => {
    if (operationRef.current !== operation) return;
    controllerRef.current = null;
    operationKindRef.current = null;
    setBusy(false);
  };

  const newPasswordIsValid = () => {
    if (!matchesPasswordFormat(password)) { setError("Gunakan password 8-128 karakter tanpa spasi."); return false; }
    if (password.normalize("NFC") !== confirmation.normalize("NFC")) { setError("Konfirmasi password belum cocok."); return false; }
    return true;
  };
  const switchMode = (next: EmailAuthPurpose) => {
    if (busy) return;
    setMode(next); setPassword(""); setConfirmation(""); setError(""); setMessage("");
    requestIdRef.current = "";
  };
  const startEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "register" && !newPasswordIsValid()) return;
    if (mode === "login" && !matchesPasswordFormat(password)) { setError("Gunakan password 8-128 karakter tanpa spasi."); return; }
    const request = beginRequest("email");
    try {
      const result = await emailAuthApi.start({ email: email.trim(), request_id: request.requestId, purpose: mode, ...(mode !== "reset" ? { password } : {}) }, request.controller.signal);
      if (!isCurrent(request.operation, request.controller.signal)) return;
      requestIdRef.current = "";
      setTimedFlow(result); setCode(""); setPassword(""); setConfirmation(""); setScreen("code");
      storeFlow(result);
    } catch (cause) {
      if (isCurrent(request.operation, request.controller.signal)) {
        if (cause instanceof ApiError && ["EMAIL_AUTH_UNAVAILABLE", "FLOW_EXPIRED", "REQUEST_REPLACED"].includes(cause.code)) requestIdRef.current = "";
        setError(cause instanceof Error ? cause.message : "Kode belum dapat dikirim. Coba lagi.");
      }
    } finally { finishRequest(request.operation); }
  };

  const resendCode = async () => {
    if (!flow || resendIn > 0 || busy) return;
    const request = beginRequest("resend");
    try {
      const result = await emailAuthApi.resend(flow.flow_id, request.requestId, request.controller.signal);
      if (!isCurrent(request.operation, request.controller.signal)) return;
      requestIdRef.current = "";
      setTimedFlow(result); setCode(""); setError("");
      storeFlow(result);
    } catch (cause) {
      if (isCurrent(request.operation, request.controller.signal)) {
        if (cause instanceof ApiError && cause.code === "RESEND_COOLDOWN" && cause.retryAfter && flow) {
          const serverNow = Date.now() + clockOffset;
          setTimedFlow({ ...flow, server_time: new Date(serverNow).toISOString(), resend_at: new Date(serverNow + cause.retryAfter * 1000).toISOString() });
        }
        if (cause instanceof ApiError && ["EMAIL_AUTH_UNAVAILABLE", "FLOW_EXPIRED", "REQUEST_REPLACED"].includes(cause.code)) requestIdRef.current = "";
        setError(cause instanceof Error ? cause.message : "Kode belum dapat dikirim ulang. Coba lagi.");
      }
    } finally { finishRequest(request.operation); }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!flow || !/^\d{8}$/.test(code)) { setError("Masukkan kode 8 angka."); return; }
    const request = beginRequest("verify");
    try {
      const result = await emailAuthApi.verify(flow.flow_id, code, request.controller.signal);
      if (!isCurrent(request.operation, request.controller.signal)) return;
      requestIdRef.current = "";
      if (result.reset_required) {
        setTimedFlow(result.flow); storeFlow(result.flow); setCode("");
        setPassword(""); setConfirmation(""); setScreen("password"); return;
      }
      const user = result.user;
      setApiSessionContext(user.session_context ?? null);
      clearStoredFlow();
      setTimedFlow(null); setCode("");
      if (result.onboarding_required || !hasCompleteProfile(user)) {
        setPendingUser(user); setUsername(user.username ?? ""); setCity(user.city ?? ""); setParticipation(user.participation ?? ""); setScreen("profile");
      } else {
        setScreen("email");
        onLoginSuccess(user, "Berhasil masuk.");
        onClose();
      }
    } catch (cause) {
      if (isCurrent(request.operation, request.controller.signal)) {
        requestIdRef.current = "";
        setCode(cause instanceof ApiError && cause.code === "FLOW_EXPIRED" ? "" : code);
        setError(cause instanceof Error ? cause.message : "Kode belum dapat diverifikasi. Coba lagi.");
      }
    } finally { finishRequest(request.operation); }
  };

  const changeEmail = async () => {
    if (!flow || busy) return;
    const request = beginRequest("cancel");
    try {
      await emailAuthApi.cancel(flow.flow_id, request.controller.signal);
      if (!isCurrent(request.operation, request.controller.signal)) return;
      clearStoredFlow(); setTimedFlow(null); setCode(""); setScreen("email");
      if (mode === "reset") setMode("login");
      requestIdRef.current = "";
    } catch (cause) {
      if (isCurrent(request.operation, request.controller.signal)) setError(cause instanceof Error ? cause.message : "Permintaan belum berhasil. Coba lagi.");
    } finally { finishRequest(request.operation); }
  };

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!flow || !newPasswordIsValid()) return;
    const request = beginRequest("password");
    try {
      await emailAuthApi.resetPassword(flow.flow_id, password, request.controller.signal);
      if (!isCurrent(request.operation, request.controller.signal)) return;
      clearStoredFlow(); setTimedFlow(null); setPassword(""); setConfirmation("");
      setMode("login"); setScreen("email"); requestIdRef.current = "";
      setMessage("Password berhasil diubah. Masuk dengan password baru.");
      void refresh();
    } catch (cause) {
      if (isCurrent(request.operation, request.controller.signal)) setError(cause instanceof Error ? cause.message : "Password belum dapat diubah. Coba lagi.");
    } finally { finishRequest(request.operation); }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingUser || !participation) { setError("Pilih salah satu peran untuk melanjutkan."); return; }
    if (!USERNAME_PATTERN.test(username)) { setError(USERNAME_HINT.id); usernameRef.current?.focus(); return; }
    const request = beginRequest("profile");
    try {
      const user = await updateProfileApi({ username, participation, city: city.trim(), avatar_url: pendingUser.avatar_url }, request.controller.signal);
      if (!isCurrent(request.operation, request.controller.signal)) return;
      setApiSessionContext(user.session_context ?? pendingUser.session_context ?? null);
      setPendingUser(null);
      setScreen("email");
      onLoginSuccess(user, "Profil berhasil disimpan.");
      onClose();
    } catch (cause) {
      if (isCurrent(request.operation, request.controller.signal)) setError(cause instanceof Error ? cause.message : "Profil belum dapat disimpan. Coba lagi.");
    } finally { finishRequest(request.operation); }
  };

  const title = screen === "email" ? (mode === "register" ? "Buat akun" : mode === "reset" ? "Lupa password" : "Masuk") : screen === "code" ? "Periksa email" : screen === "password" ? "Password baru" : "Lengkapi profil";
  const intro = screen === "email" ? (mode === "register" ? "Buat password, lalu verifikasi email." : mode === "reset" ? "Verifikasi email untuk mengatur ulang password." : "Gunakan password, lalu verifikasi kode email.") : screen === "code" ? "Masukkan kode 8 angka yang dikirim ke email." : screen === "password" ? "Buat password baru untuk akun ini." : "Pilih username dan cara ingin berpartisipasi.";

  return <LazyMotion features={domMax} strict><AnimatePresence>
    {isOpen && <AuthDialogFrame key="account" dialogRef={dialogRef} onClose={close}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>BuktiPulih</span><h2 id="auth-title">{title}</h2></div>
        <button type="button" className={styles.close} onClick={close} aria-label="Tutup dialog">×</button>
      </header>
      <p id="auth-description" className={styles.intro}>{intro}</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.notice} role="status">{message}</p>}
      {screen === "email" && <>
        {mode !== "reset" && <div className={styles.modeSwitcher} role="group" aria-label="Pilihan akun">
          <button type="button" aria-pressed={mode === "login"} disabled={busy} onClick={() => switchMode("login")}>Masuk</button>
          <button type="button" aria-pressed={mode === "register"} disabled={busy} onClick={() => switchMode("register")}>Daftar</button>
        </div>}
        <form className={styles.form} onSubmit={startEmail} aria-busy={busy}>
          <label className={styles.label} htmlFor="auth-email">Email</label>
          <input ref={emailRef} id="auth-email" className={styles.input} type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} required maxLength={254} disabled={busy} value={email} onChange={event => { requestIdRef.current = ""; setEmail(event.target.value); }} />
          {mode !== "reset" && <PasswordFields key={mode} value={password} onChange={value => { requestIdRef.current = ""; setPassword(value); }} confirmation={confirmation} onConfirm={setConfirmation} create={mode === "register"} disabled={busy} />}
          <button className={styles.primary} type="submit" disabled={busy}>{busy ? "Memproses…" : mode === "register" ? "Daftar dan kirim kode" : mode === "reset" ? "Kirim kode pemulihan" : "Masuk dan kirim kode"}</button>
          <button type="button" className={styles.textButton} disabled={busy} onClick={() => switchMode(mode === "reset" ? "login" : "reset")}>{mode === "reset" ? "Kembali ke Masuk" : "Lupa password?"}</button>
        </form>
      </>}
      {screen === "password" && <form className={styles.form} onSubmit={resetPassword} aria-busy={busy}>
        <PasswordFields value={password} onChange={setPassword} confirmation={confirmation} onConfirm={setConfirmation} create disabled={busy} />
        <small className={styles.hint}>{expiresIn ? `Verifikasi berlaku ${formatTime(expiresIn)} lagi.` : "Verifikasi kedaluwarsa. Minta kode baru untuk melanjutkan."}</small>
        <button className={styles.primary} type="submit" disabled={busy || expiresIn === 0}>{busy ? "Menyimpan…" : "Simpan password"}</button>
        <button type="button" className={styles.textButton} disabled={busy} onClick={() => void changeEmail()}>Kembali ke Masuk</button>
      </form>}

      {screen === "code" && flow && <form className={styles.form} onSubmit={verifyCode} aria-busy={busy}>
        <p className={styles.destination}>Kode dikirim ke <strong>{flow.masked_email}</strong></p>
        <label className={styles.label} htmlFor="auth-code">Kode email</label>
        <input ref={codeRef} id="auth-code" className={`${styles.input} ${styles.codeInput}`} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} aria-describedby="auth-code-help" required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} />
        <small id="auth-code-help" className={styles.hint}>{expiresIn ? `Kode berlaku ${formatTime(expiresIn)} lagi.` : "Kode kedaluwarsa. Kirim kode baru untuk melanjutkan."}</small>
        <button className={styles.primary} type="submit" disabled={busy || code.length !== 8 || expiresIn === 0}>{busy ? "Memproses…" : "Verifikasi"}</button>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} disabled={busy || resendIn > 0} onClick={() => void resendCode()}>{busy ? "Memproses…" : resendIn ? `Kirim ulang dalam ${formatTime(resendIn)}` : "Kirim ulang kode"}</button>
          <button type="button" className={styles.textButton} disabled={busy} onClick={() => void changeEmail()}>Ubah data</button>
        </div>
      </form>}

      {screen === "profile" && <form className={styles.form} onSubmit={saveProfile} aria-busy={busy}>
        <label className={styles.label} htmlFor="auth-username">Username</label>
        <input ref={usernameRef} id="auth-username" aria-describedby="auth-username-hint" className={styles.input} autoComplete="username" autoCapitalize="none" spellCheck={false} pattern={USERNAME_PATTERN.source} required readOnly={Boolean(pendingUser?.username)} value={username} onChange={event => setUsername(event.target.value)} />
        <small id="auth-username-hint" className={styles.hint}>{pendingUser?.username
          ? (pendingUser.username_saves_remaining === 0 ? "Username tidak dapat diubah lagi." : "Username yang tersimpan dapat diubah melalui Profil.")
          : `${USERNAME_HINT.id} Username dapat disimpan 2 kali, termasuk penetapan pertama.`}</small>
        <label className={styles.label} htmlFor="auth-city">Kamu dari mana? <span>(opsional)</span></label>
        <input id="auth-city" className={styles.input} placeholder="Kabupaten/kota" autoComplete="address-level2" maxLength={80} value={city} onChange={event => setCity(event.target.value)} />
        <label className={styles.label} htmlFor="auth-participation">Sebagai siapa?</label>
        <select id="auth-participation" className={styles.input} value={participation} onChange={event => setParticipation(event.target.value as Participation | "")} required>
          <option value="" disabled>Pilih salah satu</option>
          {roles.map(role => <option value={role.value} key={role.value}>{role.label}</option>)}
        </select>
        <button className={styles.primary} type="submit" disabled={busy || !participation}>{busy ? "Menyimpan…" : "Simpan dan lanjutkan"}</button>
      </form>}
    </AuthDialogFrame>}
  </AnimatePresence></LazyMotion>;
}
