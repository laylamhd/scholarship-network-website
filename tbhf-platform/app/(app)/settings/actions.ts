"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NOTIF_GROUPS, type NotifPrefs } from "./prefs";

export type FormState = { error?: string; ok?: string } | null;

/**
 * Change the signed-in member's email address. Supabase sends a confirmation
 * link to the new address; the change only takes effect once it is clicked.
 */
export async function updateEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Please enter a new email address." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "That doesn't look like a valid email address." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You are not signed in." };
  if (user.email === email) return { error: "That's already your email address." };

  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: `We've sent a confirmation link to ${email}. Click it to finish the change.` };
}

/**
 * Change the signed-in member's password. The current password is verified
 * first by re-authenticating, so a stolen, unlocked session can't silently
 * lock the real owner out.
 */
export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!current || !next) return { error: "Please fill in every field." };
  if (next.length < 6) return { error: "New password must be at least 6 characters." };
  if (next !== confirm) return { error: "The new passwords don't match." };
  if (next === current) return { error: "Your new password matches the current one." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You are not signed in." };

  // Verify the current password.
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (signInErr) return { error: "Your current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message };

  return { ok: "Your password has been updated." };
}

/**
 * Persist the member's notification category preferences onto their profile
 * row (the notification_prefs JSONB column — see phase23_settings.sql).
 */
export async function updateNotificationPrefs(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You are not signed in." };

  const prefs: NotifPrefs = {};
  for (const g of NOTIF_GROUPS) {
    prefs[g.key] = formData.get(`notif_${g.key}`) === "on";
  }

  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: prefs })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: "Notification preferences saved." };
}

/**
 * Permanently delete the signed-in member's account and all their data via the
 * delete_my_account() RPC. Guarded by a typed "DELETE" confirmation and a
 * password re-check so an unlocked, unattended session can't be wiped by
 * someone else. On success the user is signed out and sent to the login page.
 */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (confirm !== "DELETE") return { error: 'Type DELETE (in capitals) to confirm.' };
  if (!password) return { error: "Enter your password to confirm deletion." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You are not signed in." };

  // Re-verify the password before doing anything irreversible.
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (signInErr) return { error: "Your password is incorrect." };

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: error.message };

  // The account is gone; clear the session cookies and leave the app.
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
