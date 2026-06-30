"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRsvp } from "@/app/(app)/events/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default function EventRsvpButton({
  eventId,
  initialStatus,
  block = false,
}: {
  eventId: string;
  initialStatus: string | null;
  block?: boolean;
}) {
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [pending, start] = useTransition();
  const router = useRouter();

  const going = status === "going";

  function toggle() {
    const next = going ? null : "going";
    setStatus(next);
    start(async () => {
      const res = await setRsvp(eventId, next);
      if (res.error) setStatus(going ? "going" : null);
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
        width: block ? "100%" : undefined,
        background: going ? colors.tintBlue : colors.brand,
        color: going ? colors.brandDeep : "#fff",
        border: going ? `1.5px solid ${colors.borderBlue}` : 0,
        borderRadius: radius.pill, padding: "10px 20px", fontSize: 14, fontWeight: 700,
        cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1,
        boxShadow: going ? "none" : shadow.brand,
      }}
    >
      <Icon name={going ? "check" : "calendar"} size={16} />
      {going ? "You're going" : "RSVP — I'll attend"}
    </button>
  );
}
