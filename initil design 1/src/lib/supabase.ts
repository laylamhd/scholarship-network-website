import { createClient } from "@supabase/supabase-js";

// These come from your Supabase project's API settings.
// Vite only exposes env vars that start with VITE_ to the browser.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Lets the UI show a helpful message instead of silently failing
// when the keys haven't been added to .env.local yet.
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env.local and fill in your project keys.",
  );
}

// Fallback values keep createClient from throwing before keys are set;
// any real network call will fail clearly until the env vars exist.
export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "placeholder-anon-key",
);
