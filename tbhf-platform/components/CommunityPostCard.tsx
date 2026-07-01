"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addCommunityComment,
  toggleCommunityLike,
  deleteCommunityPost,
  editCommunityPost,
  togglePinCommunityPost,
  toggleLockCommunityPost,
  toggleBookmarkCommunityPost,
} from "@/app/(app)/community/actions";
import { Icon } from "@/components/Icon";
import CommunityComment, { StaffBadge } from "@/components/CommunityComment";
import CommunityCommentBox from "@/components/CommunityCommentBox";
import { RichText, deserializeMentions, type MentionMember } from "@/lib/mentions";
import type { FeedPost } from "@/lib/feed";
import { colors, radius } from "@/lib/theme";

function initials(name: string): string {
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

function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  return url ? (
    <Image src={url} alt={name} width={size} height={size} style={{ width: size, height: size, borderRadius: 999, objectFit: "cover" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, textTransform: "uppercase" }}>
      {initials(name)}
    </div>
  );
}

function iconBtn(active = false): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: 0, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: active ? colors.brandDeep : colors.inkMuted, padding: "4px 8px", borderRadius: radius.pill };
}

export default function CommunityPostCard({
  post,
  communityId,
  members,
  canModerate = false,
  currentUserId,
}: {
  post: FeedPost;
  communityId: string;
  members: MentionMember[];
  canModerate?: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showComments, setShowComments] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pinned, setPinned] = useState(!!post.pinned);
  const [locked, setLocked] = useState(!!post.is_locked);
  const [bookmarked, setBookmarked] = useState(!!post.bookmarked);
  const [pending, start] = useTransition();

  const isMine = post.author.id === currentUserId;
  const staff = post.author.staff;
  const announcement = !!post.is_announcement;
  const accent = announcement ? colors.brand : staff === "admin" ? colors.brand : staff === "moderator" ? "#0F8F6B" : null;

  const { topLevel, repliesOf } = useMemo(() => {
    const top = post.comments.filter((c) => !c.parent_id);
    top.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    const byParent = new Map<string, typeof post.comments>();
    for (const c of post.comments) {
      if (c.parent_id) {
        const arr = byParent.get(c.parent_id) ?? [];
        arr.push(c);
        byParent.set(c.parent_id, arr);
      }
    }
    return { topLevel: top, repliesOf: byParent };
  }, [post.comments]);

  function refresh() { router.refresh(); }
  function run(fn: () => Promise<{ error?: string }>) {
    start(async () => { const res = await fn(); if (!res.error) refresh(); });
  }

  function onLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    start(async () => {
      const res = await toggleCommunityLike(post.id);
      if (res.error) { setLiked(!next); setLikeCount((c) => c + (next ? -1 : 1)); }
      else refresh();
    });
  }
  function onBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    start(async () => {
      const res = await toggleBookmarkCommunityPost(post.id);
      if (res.error) setBookmarked(!next); else refresh();
    });
  }
  function onDelete() {
    start(async () => {
      const res = await deleteCommunityPost(communityId, post.id);
      if (!res.error) { setRemoved(true); refresh(); }
    });
  }

  if (removed) return null;

  const editInit = deserializeMentions(post.content);

  return (
    <div style={{ background: "#fff", border: `1px solid ${accent ?? colors.border}`, borderRadius: radius.lg, overflow: "hidden", borderInlineStart: accent ? `4px solid ${accent}` : `1px solid ${colors.border}` }}>
      {announcement && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: colors.tintBlue, color: colors.brandDeep, padding: "8px 20px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4 }}>
          <Icon name="bell" size={14} /> Announcement
        </div>
      )}

      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/scholars/${post.author.id}`}><Avatar name={post.author.full_name} url={post.author.avatar_url} /></Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Link href={`/scholars/${post.author.id}`} style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink }}>{post.author.full_name}</Link>
              <StaffBadge staff={staff} />
              {pinned && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: colors.inkFaint }}><Icon name="pin" size={12} /> Pinned</span>}
              {locked && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: colors.inkFaint }}><Icon name="lock" size={12} /> Locked</span>}
            </span>
            <div style={{ fontSize: 12, color: colors.inkFaint }}>{timeAgo(post.created_at)}{post.edited_at ? " · edited" : ""}</div>
          </div>

          {/* moderator / author controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            {canModerate && (
              <>
                <button type="button" title={pinned ? "Unpin" : "Pin"} onClick={() => { setPinned(!pinned); run(() => togglePinCommunityPost(post.id)); }} style={{ ...iconBtn(pinned), padding: 6 }}><Icon name="pin" size={16} /></button>
                <button type="button" title={locked ? "Unlock" : "Lock"} onClick={() => { setLocked(!locked); run(() => toggleLockCommunityPost(post.id)); }} style={{ ...iconBtn(locked), padding: 6 }}><Icon name="lock" size={16} /></button>
              </>
            )}
            {isMine && (
              <button type="button" title="Edit" onClick={() => setEditing(true)} style={{ ...iconBtn(), padding: 6 }}><Icon name="sliders" size={16} /></button>
            )}
            {(isMine || canModerate) && (
              confirmDelete ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <button type="button" disabled={pending} onClick={onDelete} style={{ background: "#C0392B", color: "#fff", border: 0, borderRadius: radius.pill, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", opacity: pending ? 0.6 : 1 }}>{pending ? "Deleting…" : "Delete"}</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} style={{ background: "#fff", color: colors.inkMuted, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                </span>
              ) : (
                <button type="button" title="Remove" onClick={() => setConfirmDelete(true)} style={{ ...iconBtn(), color: "#C0392B", padding: 6 }}><Icon name="x" size={16} /></button>
              )
            )}
          </div>
        </div>

        {editing ? (
          <div style={{ marginTop: 12 }}>
            <CommunityCommentBox
              members={members}
              allowAll={canModerate}
              initialText={editInit.text}
              initialPicks={editInit.picks}
              submitLabel="Save"
              autoFocus
              pending={pending}
              onCancel={() => setEditing(false)}
              onSubmit={(text) => { run(() => editCommunityPost(post.id, text)); setEditing(false); }}
            />
          </div>
        ) : (
          <div style={{ fontSize: 14.5, color: colors.ink, lineHeight: 1.6, marginTop: 12 }}>
            <RichText text={post.content} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14, borderTop: `1px solid ${colors.border}`, paddingTop: 10, alignItems: "center" }}>
          <button type="button" onClick={onLike} style={iconBtn(liked)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? colors.brand : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
            {likeCount > 0 ? likeCount : ""} Like{likeCount === 1 ? "" : "s"}
          </button>
          <button type="button" onClick={() => setShowComments((s) => !s)} style={iconBtn(showComments)}>
            <Icon name="chat" size={16} /> {post.comments.length} Comment{post.comments.length === 1 ? "" : "s"}
          </button>
          <button type="button" onClick={onBookmark} style={{ ...iconBtn(bookmarked), marginInlineStart: "auto" }} title={bookmarked ? "Saved" : "Save"}>
            <Icon name="bookmark" size={16} /> {bookmarked ? "Saved" : "Save"}
          </button>
        </div>

        {showComments && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            {topLevel.map((c) => (
              <CommunityComment
                key={c.id}
                comment={c}
                replies={repliesOf.get(c.id) ?? []}
                postId={post.id}
                members={members}
                canModerate={canModerate}
                currentUserId={currentUserId}
                postLocked={locked}
              />
            ))}

            {locked && !canModerate ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.inkFaint, background: colors.bg, borderRadius: radius.md, padding: "10px 14px" }}>
                <Icon name="lock" size={15} /> This post is locked. New comments are turned off.
              </div>
            ) : (
              <CommunityCommentBox
                members={members}
                allowAll={canModerate}
                pending={pending}
                onSubmit={(text) => run(() => addCommunityComment(post.id, text))}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
