"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | null;

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // SECURITY (BUG-011): don't leak whether the email exists, is unconfirmed,
    // or is rate-limited — all of which aid account enumeration. Log the detail
    // server-side and show the user a single generic message.
    console.error("login failed:", error.message);
    return { error: "Invalid email or password." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const country = String(formData.get("portal") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "scholar");
  // Public signup can only ever be a scholar or alumni. Admin accounts are
  // created through the separate, code-gated /admin-access page.
  const role = roleRaw === "alumni" ? "alumni" : "scholar";

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }
  // SECURITY (BUG-009): enforce a stronger minimum length.
  if (password.length < 12) {
    return { error: "Password must be at least 12 characters." };
  }
  if (!fullName) {
    return { error: "Please enter your full name." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // handle_new_user() reads full_name + country + role from this metadata.
      data: { full_name: fullName, country, role },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  // New members land on the welcome page first, which walks them through
  // setting up their profile before they enter the platform.
  redirect("/welcome");
}

/**
 * Code-gated admin registration (the /admin-access page). The access code is
 * verified server-side before any account is created; after sign-up the caller
 * redeems the same code to elevate their own profile to the admin role.
 */
export async function adminSignup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const code = String(formData.get("code") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!code) return { error: "Please enter your admin access code." };
  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }
  // SECURITY (BUG-009): enforce a stronger minimum length.
  if (password.length < 12) {
    return { error: "Password must be at least 12 characters." };
  }
  if (!fullName) return { error: "Please enter your full name." };

  const supabase = await createClient();

  // SECURITY (BUG-004): do NOT pre-verify the code here — that required exposing
  // verify_admin_code() to the anonymous role, giving the whole internet an
  // unthrottled true/false oracle to brute-force the code against. Instead we
  // create the account first, then redeem: redeem_admin_access() runs as an
  // authenticated caller and validates the code itself (SECURITY DEFINER). A
  // wrong code therefore just leaves an ordinary member account, never an admin.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role: "admin" } },
  });
  if (error) return { error: error.message };

  // Now that the session is active, redeem the code to grant the admin role.
  const { data: redeemed, error: redeemErr } = await supabase.rpc(
    "redeem_admin_access",
    { p_code: code },
  );
  if (redeemErr) return { error: redeemErr.message };
  if (!redeemed) {
    return {
      error:
        "That admin access code is not valid. Your account was created as a " +
        "regular member — sign in and contact the platform owner for admin access.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
