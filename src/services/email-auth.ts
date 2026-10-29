// Call the email OTP endpoints used by the sign-in dialog.
import type { AccountUser } from "@/types/account";
import { requestApi } from "./http";

export type EmailAuthPurpose = "login" | "register" | "reset";
export interface EmailAuthFlow {
  purpose: EmailAuthPurpose;
  status: string;
  flow_id: string;
  masked_email: string;
  expires_at: string;
  resend_at: string;
  server_time: string;
}

export async function startEmailAuth(input: { email: string; request_id: string; purpose: EmailAuthPurpose; password?: string }, signal?: AbortSignal) {
  const prepareAndStart = async () => {
    await requestApi<{ ready: boolean }>("/auth/email/prepare", { signal });
    return requestApi<EmailAuthFlow>("/auth/email/start", { method: "POST", body: JSON.stringify(input), signal });
  };
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("buktipulih-auth-start", prepareAndStart);
  }
  return prepareAndStart();
}
export async function resendEmailAuth(flow_id: string, request_id: string, signal?: AbortSignal) {
  return requestApi<EmailAuthFlow>("/auth/email/resend", { method: "POST", body: JSON.stringify({ flow_id, request_id }), signal });
}
export function getEmailAuthFlow(flow_id: string, signal?: AbortSignal) {
  return requestApi<EmailAuthFlow>(`/auth/email/flow?flow_id=${encodeURIComponent(flow_id)}`, { signal });
}
export async function verifyEmailAuth(flow_id: string, code: string, signal?: AbortSignal) {
  return requestApi<{ reset_required: false; user: AccountUser; onboarding_required: boolean } | { reset_required: true; flow: EmailAuthFlow }>("/auth/email/verify", { method: "POST", body: JSON.stringify({ flow_id, code }), signal });
}

export const emailAuthApi = {
  start: startEmailAuth,
  resend: resendEmailAuth,
  getFlow: getEmailAuthFlow,
  verify: verifyEmailAuth,
  resetPassword: (flow_id: string, password: string, signal?: AbortSignal) => requestApi<{ password_reset: boolean }>("/auth/email/reset-password", { method: "POST", body: JSON.stringify({ flow_id, password }), signal }),
  cancel: (flow_id: string, signal?: AbortSignal) => requestApi<{ cancelled: boolean }>("/auth/email/cancel", { method: "POST", body: JSON.stringify({ flow_id }), signal }),
};

