"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleVolunteer } from "@/app/(app)/volunteer/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default function VolunteerButton({
  projectId,
  initialJoined,
  count,
  block = false,
}: {
  projectId: string;
  initialJoined: boolean;
  count: number;
  block?: boolean;
}) {
  const [joined, setJoined] = useState(initialJoined);
  const [n, setN] = useState(count);
  const [hover, setHover] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    const prev = joined;
    setJoined(!prev);
    setN((c) => c + (prev ? -1 : 1));
    start(async () => {
      const res = await toggleVolunteer(projectId, prev);
      if (res.error) { setJoined(prev); setN((c) => c + (prev ? 1 : -1)); }
      else router.refresh();
    });
  }

  let style: React.CSSProperties;
  let label: string;
  if (!joined) {
    style = { background: colors.brand, color: "#fff", border: 0, boxShadow: shadow.brand };
    label = "Volunteer";
  } else if (hover) {
    style = { background: "#FDEDEC", color: "#C0392B", border: "1.5px solid #F5C6C0" };
    label = "Withdraw";
  } else {
    style = { background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}` };
    label = "You're in";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={pending}
      style={{ ...style, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, width: block ? "100%" : undefined, borderRadius: radius.pill, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}
    >
      <Icon name={joined && !hover ? "check" : "handshake"} size={16} />
      {label}{n > 0 && !hover ? <span style={{ opacity: 0.75, fontWeight: 600 }}> · {n}</span> : null}
    </button>
  );
}
