"use server";

import { redirect } from "next/navigation";
import { resetPassword } from "@/lib/aws/password-reset";

export type ResetState = { error?: string } | null;

export async function setNewPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  if (password !== confirm) return { error: "The two passwords do not match." };
  const result = await resetPassword(token, password);
  if (!result.ok) return { error: result.error };
  redirect("/login?reset=1");
}
