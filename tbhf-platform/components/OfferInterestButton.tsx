"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleOfferInterest } from "@/app/(app)/alumni/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default function OfferInterestButton({
  offerId,
  interested,
  count,
  disabled = false,
}: {
  offerId: string;
  interested: boolean;
  count: number;
  disabled?: boolean;
}) {
  const [on, setOn] = useState(interested);
  const [n, setN] = useState(count);
  const [pending, start] = useTransition();
  const [hover, setHover] = useState(false);
  const router = useRouter();

  function toggle() {
    if (disabled) return;
    const next = !on;
    setOn(next);
    setN((c) => c + (next ? 1 : -1));
    start(async () => {
      const res = await toggleOfferInterest(offerId, on);
      if (res.error) { setOn(on); setN(count); }
      else router.refresh();
    });
  }

  if (disabled) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: colors.inkFaint }}>
        <Icon name="check" size={15} /> {n} interested
      </span>
    );
  }

  const active = on;
  const label = active ? (hover ? "Withdraw" : "Interested") : "I'm interested";

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={pending}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        border: active ? `1.5px solid ${colors.borderBlue}` : 0,
        background: active ? "#fff" : colors.brand,
        color: active ? colors.brandDeep : "#fff",
        borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700,
        cursor: pending ? "default" : "pointer", opacity: pending ? 0.75 : 1,
        boxShadow: active ? "none" : shadow.brand,
      }}
    >
      <Icon name={active ? "check" : "handshake"} size={15} />
      {label}
      {n > 0 && <span style={{ opacity: 0.8 }}>· {n}</span>}
    </button>
  );
}
