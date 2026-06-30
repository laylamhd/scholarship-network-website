"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addCommunityComment, toggleCommunityLike, deleteCommunityPost } from "@/app/(app)/community/actions";
import { Icon } from "@/components/Icon";
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

export default function CommunityPostCard({ post, communityId, canManage = false }: { post: FeedPost; communityId?: string; canManage?: boolean }) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [removed, setRemoved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  function onDelete() {
    if (!communityId) return;
    start(async () => {
      const res = await deleteCommunityPost(communityId, post.id);
      if (!res.error) { setRemoved(true); router.refresh(); }
    });
  }

  if (removed) return null;

  function onLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    start(async () => {
      const res = await toggleCommunityLike(post.id);
      if (res.error) { setLiked(!next); setLikeCount((c) => c + (next ? -1 : 1)); }
      else router.refresh();
    });
  }

  function submitComment() {
    const text = comment.trim();
    if (!text || pending) return;
    start(async () => {
      const res = await addCommunityComment(post.id, text);
      if (!res.error) { setComment(""); router.refresh(); }
    });
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href={`/scholars/${post.author.id}`}><Avatar name={post.author.full_name} url={post.author.avatar_url} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/scholars/${post.author.id}`} style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink }}>{post.author.full_name}</Link>
          <div style={{ fontSize: 12, color: colors.inkFaint }}>{timeAgo(post.created_at)}</div>
        </div>
        {canManage && communityId && (
          confirmDelete ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <button type="button" disabled={pending} onClick={onDelete} style={{ background: "#C0392B", color: "#fff", border: 0, borderRadius: radius.pill, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", opacity: pending ? 0.6 : 1 }}>
                {pending ? "Deleting…" : "Delete post"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} style={{ background: "#fff", color: colors.inkMuted, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" title="Delete post" onClick={() => setConfirmDelete(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", color: "#C0392B", border: 0, cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}>
              <Icon name="x" size={14} /> Remove
            </button>
          )
        )}
      </div>

      <div style={{ fontSize: 14.5, color: colors.ink, lineHeight: 1.6, marginTop: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{post.content}</div>

      <div style={{ display: "flex", gap: 18, marginTop: 14, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
        <button type="button" onClick={onLike} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: 0, cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: liked ? colors.brand : colors.inkMuted }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? colors.brand : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
          {likeCount > 0 ? likeCount : ""} Like{likeCount === 1 ? "" : "s"}
        </button>
        <button type="button" onClick={() => setShowComments((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: 0, cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: colors.inkMuted }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          {post.comments.length} Comment{post.comments.length === 1 ? "" : "s"}
        </button>
      </div>

      {showComments && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {post.comments.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 10 }}>
              <Link href={`/scholars/${c.author.id}`}><Avatar name={c.author.full_name} url={c.author.avatar_url} size={32} /></Link>
              <div style={{ background: colors.bg, borderRadius: radius.md, padding: "8px 12px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <Link href={`/scholars/${c.author.id}`} style={{ fontSize: 13, fontWeight: 700, color: colors.ink }}>{c.author.full_name}</Link>
                  <span style={{ fontSize: 11, color: colors.inkFaint }}>{timeAgo(c.created_at)}</span>
                </div>
                <div style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{c.content}</div>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitComment(); } }}
              placeholder="Write a comment…"
              style={{ flex: 1, padding: "9px 13px", fontSize: 13.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }}
            />
            <button type="button" onClick={submitComment} disabled={pending || !comment.trim()} style={{ background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: pending || !comment.trim() ? "default" : "pointer", opacity: pending || !comment.trim() ? 0.6 : 1 }}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
