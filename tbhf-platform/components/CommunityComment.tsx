"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addCommunityComment,
  editCommunityComment,
  deleteCommunityComment,
  togglePinCommunityComment,
} from "@/app/(app)/community/actions";
import CommunityCommentBox from "@/components/CommunityCommentBox";
import { Icon } from "@/components/Icon";
import { RichText, deserializeMentions, type MentionMember } from "@/lib/mentions";
import type { FeedComment } from "@/lib/feed";
import { colors, radius } from "@/lib/theme";

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}
function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function StaffBadge({ staff }: { staff?: "admin" | "moderator" | null }) {
  if (!staff) return null;
  const admin = staff === "admin";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3, padding: "1px 7px", borderRadius: 999, color: admin ? colors.brandDeep : "#0F8F6B", background: admin ? colors.tintBlue : "#E7F6F0" }}>
      <Icon name="shield" size={11} /> {admin ? "Admin" : "Moderator"}
    </span>
  );
}

function Avatar({ name, url, size = 32 }: { name: string; url: string | null; size?: number }) {
  return url ? (
    <Image src={url} alt={name} width={size} height={size} style={{ width: size, height: size, borderRadius: 999, objectFit: "cover" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, textTransform: "uppercase" }}>
      {initials(name)}
    </div>
  );
}

function actionBtn(color: string): React.CSSProperties {
  return { background: "none", border: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color, display: "inline-flex", alignItems: "center", gap: 4, padding: 0 };
}

export default function CommunityComment({
  comment,
  replies,
  postId,
  members,
  canModerate,
  currentUserId,
  postLocked = false,
  isReply = false,
}: {
  comment: FeedComment;
  replies: FeedComment[];
  postId: string;
  members: MentionMember[];
  canModerate: boolean;
  currentUserId: string;
  postLocked?: boolean;
  isReply?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const isMine = comment.author.id === currentUserId;
  const staff = comment.author.staff;
  const canReply = !postLocked || canModerate;

  function run(fn: () => Promise<{ error?: string }>) {
    start(async () => {
      const res = await fn();
      if (!res.error) router.refresh();
    });
  }

  const initial = deserializeMentions(comment.content);

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <Link href={`/scholars/${comment.author.id}`}><Avatar name={comment.author.full_name} url={comment.author.avatar_url} /></Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ background: staff ? (staff === "admin" ? colors.tintBlue : "#EAF7F1") : colors.bg, borderRadius: radius.md, padding: "8px 12px", borderInlineStart: staff ? `3px solid ${staff === "admin" ? colors.brand : "#0F8F6B"}` : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <Link href={`/scholars/${comment.author.id}`} style={{ fontSize: 13, fontWeight: 700, color: colors.ink }}>{comment.author.full_name}</Link>
              <StaffBadge staff={staff} />
              {comment.pinned && <Icon name="pin" size={12} />}
            </span>
            <span style={{ fontSize: 11, color: colors.inkFaint, flexShrink: 0 }}>
              {timeAgo(comment.created_at)}{comment.edited_at ? " · edited" : ""}
            </span>
          </div>

          {editing ? (
            <div style={{ marginTop: 6 }}>
              <CommunityCommentBox
                members={members}
                allowAll={canModerate}
                initialText={initial.text}
                initialPicks={initial.picks}
                submitLabel="Save"
                autoFocus
                pending={pending}
                onCancel={() => setEditing(false)}
                onSubmit={(text) => { run(() => editCommunityComment(comment.id, text)); setEditing(false); }}
              />
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 2 }}>
              <RichText text={comment.content} />
            </div>
          )}
        </div>

        {!editing && (
          <div style={{ display: "flex", gap: 14, marginTop: 5, paddingInlineStart: 4, alignItems: "center" }}>
            {!isReply && canReply && (
              <button type="button" onClick={() => setReplying((r) => !r)} style={actionBtn(colors.inkMuted)}>Reply</button>
            )}
            {isMine && (
              <button type="button" onClick={() => setEditing(true)} style={actionBtn(colors.inkMuted)}>Edit</button>
            )}
            {canModerate && (
              <button type="button" onClick={() => run(() => togglePinCommunityComment(comment.id))} style={actionBtn(comment.pinned ? colors.brandDeep : colors.inkMuted)}>
                <Icon name="pin" size={12} /> {comment.pinned ? "Unpin" : "Pin"}
              </button>
            )}
            {(isMine || canModerate) && (
              confirmDel ? (
                <span style={{ display: "inline-flex", gap: 8 }}>
                  <button type="button" disabled={pending} onClick={() => { run(() => deleteCommunityComment(comment.id)); }} style={actionBtn("#C0392B")}>Confirm</button>
                  <button type="button" onClick={() => setConfirmDel(false)} style={actionBtn(colors.inkFaint)}>Cancel</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDel(true)} style={actionBtn("#C0392B")}>Delete</button>
              )
            )}
          </div>
        )}

        {replying && (
          <div style={{ marginTop: 8 }}>
            <CommunityCommentBox
              members={members}
              allowAll={canModerate}
              placeholder={`Reply to ${comment.author.full_name}…`}
              submitLabel="Reply"
              autoFocus
              pending={pending}
              onCancel={() => setReplying(false)}
              onSubmit={(text) => { run(() => addCommunityComment(postId, text, comment.id)); setReplying(false); }}
            />
          </div>
        )}

        {replies.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10, paddingInlineStart: 6, borderInlineStart: `2px solid ${colors.border}` }}>
            {replies.map((r) => (
              <CommunityComment
                key={r.id}
                comment={r}
                replies={[]}
                postId={postId}
                members={members}
                canModerate={canModerate}
                currentUserId={currentUserId}
                postLocked={postLocked}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
