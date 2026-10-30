// Todo:
// -> share the real session and clear private drafts when access ends
"use client";
// --- Account session ---
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AccountUser } from "@/types/account";
import { deleteAccountApi, getCurrentUserApi, ApiError } from "@/services/account";
import { clearForumCache } from "@/utils/forumStorage";
import { clearEvidenceDrafts } from "@/utils/evidenceDrafts";
import { requestApi, setApiSessionContext } from "@/services/http";
type Status = "loading" | "authenticated" | "guest" | "error";
interface AccountSession {
  user: AccountUser | null; status: Status; setUser: (user: AccountUser | null) => void;
  refresh: () => Promise<void>; logout: () => Promise<void>; deleteAccount: (password: string) => Promise<void>;
}
const AccountContext = createContext<AccountSession | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setAccount] = useState<AccountUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const revision = useRef(0);
  const owner = useRef<string|null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const setUser = useCallback((next: AccountUser | null) => {
    revision.current += 1;
    const cleanup = !next ? clearEvidenceDrafts() : owner.current && owner.current!==next.id ? clearEvidenceDrafts(owner.current) : undefined;
    owner.current = next?.id ?? null;
    setApiSessionContext(next?.session_context ?? null);
    setAccount(next); setStatus(next ? "authenticated" : "guest");
    channel.current?.postMessage("changed");
    return cleanup?.catch(()=>{});
  }, []);
  const refresh = useCallback(() => {
    const current = ++revision.current;
    return getCurrentUserApi().then(next => {
      if (current !== revision.current) return;
      if (owner.current && owner.current!==next.id) void clearEvidenceDrafts(owner.current).catch(()=>{});
      owner.current = next.id;
      setApiSessionContext(next.session_context ?? null);
      setAccount(next); setStatus("authenticated");
    }, error => {
      if (current !== revision.current) return;
      setApiSessionContext(null); setAccount(null);
      const guest = error instanceof ApiError && [401, 403].includes(error.status);
      if (guest) { owner.current = null; void clearEvidenceDrafts().catch(()=>{}); }
      setStatus(guest ? "guest" : "error");
    });
  }, []);
  const logout = useCallback(async () => { await requestApi("/auth/logout", { method: "POST" }); await setUser(null); channel.current?.postMessage("signedout"); }, [setUser]);
  const deleteAccount = useCallback(async (password: string) => {
    await deleteAccountApi(password);
    clearForumCache();
    try { sessionStorage.removeItem("buktipulih_email_auth_flow_v1"); } catch {}
    await setUser(null);
    channel.current?.postMessage("deleted");
  }, [setUser]);
  useEffect(() => {
    void refresh();
    const reset = () => { revision.current += 1; setApiSessionContext(null); setAccount(null); setStatus("guest"); };
    const expire = () => { void clearEvidenceDrafts().catch(()=>{}); owner.current = null; reset(); };
    const changed = () => { reset(); void refresh(); };
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    if (typeof BroadcastChannel !== "undefined") { channel.current = new BroadcastChannel("buktipulih-account"); channel.current.onmessage = event => {
      if (event.data === "deleted") { void clearEvidenceDrafts().catch(()=>{}).finally(()=>window.location.reload()); clearForumCache(); }
      else if (event.data === "signedout") expire();
      else changed();
    }; }
    window.addEventListener("buktipulih-session-expired", expire);
    window.addEventListener("buktipulih-session-changed", changed);
    document.addEventListener("visibilitychange", visible);
    return () => {
      revision.current += 1; channel.current?.close(); channel.current = null;
      window.removeEventListener("buktipulih-session-expired", expire);
      window.removeEventListener("buktipulih-session-changed", changed);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  const value = useMemo(() => ({ user, status, setUser, refresh, logout, deleteAccount }), [user, status, setUser, refresh, logout, deleteAccount]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
export function useAccount() {
  const session = useContext(AccountContext);
  if (!session) throw new Error("AccountProvider missing");
  return session;
}
// --- end of Account session ---
