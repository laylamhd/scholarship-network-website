"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinGroup, leaveGroup } from "@/app/(app)/groups/actions";
import { colors, radius, shadow } from "@/lib/theme";

export default function GroupJoinButton({
  groupId,
  initialMember,
  size = "md",
  block = false,
}: {
  groupId: string;
  initialMember: boolean;
  size?: "sm" | "md";
  block?: boolean;
}) {
  const [member, setMember] = useState(initialMember);
  const [hover, setHover] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    const next = !member;
    setMember(next);
    start(async () => {
      const res = next ? await joinGroup(groupId) : await leaveGroup(groupId);
      if (res.error) setMember(!next);
      else router.refresh();
    });
  }

  const pad = size === "sm" ? "8px 16px" : "11px 22px";
  const font = size === "sm" ? 13 : 14.5;

  // Member: shows "Joined ✓", turns into a red "Leave" on hover.
  let style: React.CSSProperties;
  let label: string;
  if (!member) {
    style = { background: colors.brand, color: "#fff", border: `1.5px solid ${colors.brand}`, boxShadow: shadow.brand };
    label = "Join";
  } else if (hover) {
    style = { background: "#FDEDEC", color: "#C0392B", border: "1.5px solid #F5C6C0" };
    label = "Leave";
  } else {
    style = { background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}` };
    label = "Joined";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={pending}
      style={{ ...style, width: block ? "100%" : undefined, flex: block ? 1 : undefined, borderRadius: radius.pill, padding: pad, fontSize: font, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}
    >
      {label}
    </button>
  );
}
