"use client";

import { useEffect } from "react";
import { markConversationRead } from "@/app/(app)/messages/actions";

/** Marks a conversation read on mount (so the unread badge clears). */
export default function MarkRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId]);
  return null;
}
