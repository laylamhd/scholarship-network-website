import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminAccessForm from "./AdminAccessForm";

export const metadata = { title: "Admin access" };

export default async function AdminAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A signed-in, just-confirmed new admin returns here to redeem their code.
  // Existing admins have nothing to do here.
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.role === "admin") redirect("/");
    return <AdminAccessForm authed />;
  }

  return <AdminAccessForm authed={false} />;
}
