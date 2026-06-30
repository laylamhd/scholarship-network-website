import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getMyFullProfile } from "@/lib/profiles";
import { Icon } from "@/components/Icon";
import { colors, gradients, radius, shadow } from "@/lib/theme";

export default async function WelcomePage() {
  const data = await getMyFullProfile();
  // Middleware already guards this, but be defensive.
  if (!data) redirect("/login");

  const firstName = data.profile.full_name?.trim().split(/\s+/)[0] || "there";

  const steps: { icon: Parameters<typeof Icon>[0]["name"]; text: string }[] = [
    { icon: "user", text: "Add your photo, bio and where you're based" },
    { icon: "cap", text: "Share your studies, skills and interests" },
    { icon: "compass", text: "Tell the network what you're looking for" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#fff",
          borderRadius: radius.lg,
          boxShadow: shadow.card,
          overflow: "hidden",
        }}
      >
        {/* Brand header */}
        <div
          style={{
            background: gradients.hero,
            color: "#fff",
            padding: "40px 36px 34px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <svg
            viewBox="0 0 520 220"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.16 }}
          >
            <path d="M0 90 C90 50 170 150 280 90 C380 35 450 150 520 90" fill="none" stroke="#fff" strokeWidth="2.5" />
            <path d="M0 150 C90 110 170 210 280 150 C380 95 450 210 520 150" fill="none" stroke="#fff" strokeWidth="2.5" />
          </svg>

          <div
            style={{
              position: "relative",
              width: 60,
              height: 60,
              borderRadius: 18,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: shadow.avatar,
              marginBottom: 20,
            }}
          >
            <Image src="/tbhf-mark.png" alt="TBHF" width={44} height={44} style={{ objectFit: "contain" }} />
          </div>
          <div style={{ position: "relative", fontSize: 26, fontWeight: 700, lineHeight: 1.25 }}>
            Welcome, {firstName}
          </div>
          <div style={{ position: "relative", fontSize: 15, opacity: 0.94, marginTop: 10, lineHeight: 1.6, maxWidth: 380 }}>
            Your account is ready. Let's set up your profile so the community can
            get to know you — it only takes a couple of minutes.
          </div>
        </div>

        {/* Steps + CTA */}
        <div style={{ padding: "28px 36px 34px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    background: colors.tintBlue,
                    color: colors.brandDeep,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={s.icon} size={20} />
                </div>
                <div style={{ fontSize: 14.5, color: colors.ink, lineHeight: 1.5 }}>{s.text}</div>
              </div>
            ))}
          </div>

          <Link
            href="/profile/edit"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              marginTop: 28,
              padding: "14px",
              fontSize: 15.5,
              fontWeight: 700,
              color: "#fff",
              background: colors.brand,
              borderRadius: radius.pill,
              boxShadow: shadow.brand,
              textDecoration: "none",
            }}
          >
            Set up my profile
            <Icon name="sparkle" size={17} />
          </Link>

          <div style={{ marginTop: 16, textAlign: "center" }}>
            <Link href="/" style={{ fontSize: 13.5, color: colors.inkFaint, textDecoration: "none" }}>
              I'll do this later
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
