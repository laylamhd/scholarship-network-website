"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// `notice` carries a non-error success message (e.g. "check your email to
// confirm") so the form can show a confirmation state instead of redirecting.
export type AuthState = { error?: string; notice?: string } | null;

// Absolute origin of the current request, used to build the email confirmation
// link's redirect target (emailRedirectTo).
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  // Public signup can only ever be a scholar or alumni. Admin accounts are
  // created through the separate, code-gated /admin-access page.
  const role = roleRaw === "alumni" ? "alumni" : "scholar";

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Those passwords don't match." };
  }
  if (!fullName) {
    return { error: "Please enter your full name." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // handle_new_user() reads full_name + country + role from this metadata.
      data: { full_name: fullName, country, role },
      // Where the confirmation link lands (see app/auth/confirm/route.ts).
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/welcome`,
    },
  });

  if (error) {
    // SECURITY (R3-05): don't return the provider's raw error to the client — it
    // can reveal whether an email is already registered (account enumeration) or
    // leak rate-limit/internal detail. Log it server-side; show one safe message.
    // The duplicate-email case is already handled without leaking by the
    // !data.session notice below (with email confirmation on, Supabase returns a
    // fake success for an address that already exists).
    console.error("signup failed:", error.message);
    return {
      error:
        "We couldn't create your account. Double-check your email address and try again.",
    };
  }

  // With email confirmation enabled, signUp returns no session — the account is
  // inactive until the emailed 6-digit code is verified (OTP). Send the user to a
  // dedicated page to enter that code, carrying the email along.
  if (!data.session) {
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  revalidatePath("/", "layout");
  // (Only reached if email confirmation is disabled.) New members land on the
  // welcome page first, which walks them through setting up their profile.
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
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (!fullName) return { error: "Please enter your full name." };

  const supabase = await createClient();

  // SECURITY (BUG-004): do NOT pre-verify the code here — that required exposing
  // verify_admin_code() to the anonymous role, giving the whole internet an
  // unthrottled true/false oracle to brute-force the code against. The account is
  // created as an ordinary member; the admin role is only granted by redeeming
  // the code (redeem_admin_access, SECURITY DEFINER) once the caller has a
  // session. A wrong code therefore never yields an admin account.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      // After confirming, land back here (now signed in) to enter the code.
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/admin-access`,
    },
  });
  // SECURITY (R3-05): generic message + server-side log (see signup() above).
  if (error) {
    console.error("admin signup failed:", error.message);
    return {
      error:
        "We couldn't create your account. Double-check your email address and try again.",
    };
  }

  // SECURITY (pentest PT3-02): with email confirmation enabled there is no
  // session yet, so we cannot redeem the code now (redeem_admin_access requires
  // auth.uid()). Tell the admin to confirm + sign in, then redeem here.
  if (!data.session) {
    return {
      notice:
        `Admin account created. We've emailed a confirmation link to ${email}. ` +
        `Open it, then return to this page — signed in — to enter your access ` +
        `code and activate admin access.`,
    };
  }

  // (Only reached if email confirmation is disabled.) Redeem immediately.
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

/**
 * Redeem an admin access code as an already-signed-in user. Used on the
 * /admin-access page after a new admin has confirmed their email and signed in
 * (email confirmation means the code can't be redeemed during signup). The
 * redeem_admin_access RPC (SECURITY DEFINER) validates the code as the caller.
 */
export async function redeemAdminCode(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Please enter your admin access code." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in first, then enter your access code." };
  }

  const { data: redeemed, error } = await supabase.rpc("redeem_admin_access", {
    p_code: code,
  });
  if (error) return { error: error.message };
  if (!redeemed) return { error: "That admin access code is not valid." };

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Resend the signup confirmation email (the activation link) to the pending
 * address. Used by the /verify-email page's "resend link" button.
 */
export async function resendConfirmationEmail(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Something went wrong — please sign up again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/welcome`,
    },
  });
  if (error) {
    console.error("resendConfirmationEmail:", error.message);
    return { error: "Couldn't resend the link just yet — wait a moment and try again." };
  }
  return { notice: "We've sent a fresh confirmation link to your email." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
