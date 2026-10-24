"use server";

import { requestPasswordReset } from "@/lib/aws/password-reset";

export type ForgotState = { notice?: string; error?: string } | null;

export async function forgotPassword(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter the e-mail address you sign in with." };
  try {
    await requestPasswordReset(email);
  } catch (e) {
    console.error("[reset] request failed:", e instanceof Error ? e.message : e);
  }
  // Same answer whether or not the address has an account (no account enumeration).
  return { notice: "If that e-mail address has an account, a reset link is on its way. It works once, for 60 minutes. Check your spam folder too." };
}
