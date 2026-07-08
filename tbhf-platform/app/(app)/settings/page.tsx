import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { Icon, type IconName } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";
import { resolveNotifPrefs, type NotifPrefs } from "./prefs";
import SettingsEmail from "@/components/SettingsEmail";
import SettingsPassword from "@/components/SettingsPassword";
import SettingsNotifications from "@/components/SettingsNotifications";
import SettingsDeleteAccount from "@/components/SettingsDeleteAccount";

export const metadata = { title: "Settings" };

function Section({ icon, title, subtitle, danger = false, children }: { icon: IconName; title: string; subtitle: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section style={{ background: "#fff", border: `1px solid ${danger ? "#E8B4B0" : colors.border}`, borderRadius: radius.lg, padding: "22px 24px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: danger ? "#FDEDEC" : colors.tintBlue, color: danger ? "#C0392B" : colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={icon} size={20} />
        </span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink }}>{title}</div>
          <div style={{ fontSize: 13, color: colors.inkFaint, marginTop: 1 }}>{subtitle}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, notification_prefs")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "scholar";
  const roleLabel = role === "alumni" ? "Alumni" : role === "admin" ? "Admin" : "Scholar";
  const email = user.email ?? "—";
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null;
  const prefs: NotifPrefs = resolveNotifPrefs(profile?.notification_prefs as NotifPrefs | null);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 32px 90px", width: "100%" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "0 0 4px" }}>Settings</h1>
      <p style={{ fontSize: 14, color: colors.inkFaint, margin: "0 0 26px" }}>
        Manage your account, security, and notification preferences.
      </p>

      {/* Account overview */}
      <Section icon="user" title="Account" subtitle="Your account at a glance.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <Stat label="Signed in as" value={profile?.full_name || "—"} />
          <Stat label="Role" value={roleLabel} />
          <Stat label="Member since" value={memberSince ?? "—"} />
        </div>
        <div style={{ marginTop: 16 }}>
          <Link href="/profile/edit" className="navitem" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 16px", textDecoration: "none" }}>
            <Icon name="user" size={16} /> Edit your profile
          </Link>
        </div>
      </Section>

      {/* Change email */}
      <Section icon="mail" title="Email address" subtitle="Change the email you sign in with.">
        <SettingsEmail currentEmail={email} />
      </Section>

      {/* Change password */}
      <Section icon="lock" title="Password" subtitle="Choose a strong password you don't use elsewhere.">
        <SettingsPassword />
      </Section>

      {/* Notifications */}
      <Section icon="bell" title="Notifications" subtitle="Pick which updates you'd like to receive.">
        <SettingsNotifications initial={prefs} />
      </Section>

      {/* Sign out */}
      <Section icon="logout" title="Sign out" subtitle="End your session on this device.">
        <form action={logout}>
          <button
            type="submit"
            className="navitem"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: 700, color: "#C0392B", background: "#FDEDEC", border: "1.5px solid #F5C6C0", borderRadius: radius.pill, padding: "11px 22px", cursor: "pointer" }}
          >
            <Icon name="logout" size={18} /> Sign out
          </button>
        </form>
      </Section>

      {/* Danger zone */}
      <Section icon="x" title="Delete account" subtitle="Permanently remove your account and data." danger>
        <SettingsDeleteAccount />
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: "12px 14px" }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: colors.inkFaint, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}
