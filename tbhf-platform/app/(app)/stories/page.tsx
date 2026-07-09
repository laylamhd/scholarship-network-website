import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { getFollowingIds } from "@/lib/community";
import { listStories, getStoryCategoryCounts, getMostPopularThisWeek, type StoryCard } from "@/lib/stories";
import StoryCategoryFilter from "@/components/StoryCategoryFilter";
import { Icon } from "@/components/Icon";
import { colors, radius, gradients } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function AuthorChip({ name, avatar, size = 24 }: { name: string; avatar: string | null; size?: number }) {
  return avatar ? (
    <Image src={avatar} alt={name} width={size} height={size} style={{ width: size, height: size, borderRadius: 999, objectFit: "cover" }} />
  ) : (
    <span style={{ width: size, height: size, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, textTransform: "uppercase" }}>{initials(name)}</span>
  );
}

/** Author · date · read time · likes — the Substack-style meta line. */
function Byline({ s, avatarSize = 24 }: { s: StoryCard; avatarSize?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.inkFaint, flexWrap: "wrap" }}>
      <AuthorChip name={s.author_name} avatar={s.author_avatar} size={avatarSize} />
      <span style={{ fontWeight: 600, color: colors.inkMuted }}>{s.author_name}</span>
      {s.published_at && <span>· {fmtDate(s.published_at)}</span>}
      {s.read_minutes ? <span>· {s.read_minutes} min read</span> : null}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginInlineStart: 2 }}>
        · <Icon name="heart" size={13} fill={s.like_count > 0 ? colors.inkFaint : "none"} /> {s.like_count}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        · <Icon name="eye" size={13} /> {s.view_count}
      </span>
    </div>
  );
}

/** Large lead story (cover + content), shown atop the Discover feed. */
function FeaturedLead({ s }: { s: StoryCard }) {
  return (
    <Link href={`/stories/${s.id}`} className="card story-featured" style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: "hidden", marginBottom: 34 }}>
      <div className="story-featured-img" style={{ position: "relative", background: colors.tintBlue }}>
        {s.cover_image_url ? (
          <Image src={s.cover_image_url} alt={s.title} fill style={{ objectFit: "cover" }} priority />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: colors.brandDeep, opacity: 0.45 }}>
            <Icon name="book" size={54} />
          </div>
        )}
      </div>
      <div style={{ padding: "26px 30px 26px 4px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: colors.brand }}>
          <Icon name="sparkle" size={13} /> {s.is_featured ? "Featured" : "Latest"} · {s.category}
        </div>
        <h2 className="storyrow-title" style={{ fontSize: 28, fontWeight: 800, color: colors.ink, margin: "10px 0 10px", lineHeight: 1.2 }}>{s.title}</h2>
        {s.excerpt && <p style={{ fontSize: 15.5, color: colors.inkMuted, margin: "0 0 16px", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.excerpt}</p>}
        <Byline s={s} avatarSize={30} />
      </div>
    </Link>
  );
}

/** A single editorial feed row: text left, thumbnail right. */
function FeedRow({ s }: { s: StoryCard }) {
  return (
    <Link href={`/stories/${s.id}`} className="storyrow" style={{ display: "flex", gap: 22, padding: "22px 16px", borderBottom: `1px solid ${colors.border}`, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: colors.brandDeep }}>
          {s.category}
          {s.is_featured && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: colors.brand }}><Icon name="sparkle" size={12} /> Featured</span>}
          {s.status === "draft" && <span style={{ color: colors.inkFaint }}>· Draft</span>}
        </div>
        <h3 className="storyrow-title" style={{ fontSize: 20.5, fontWeight: 700, color: colors.ink, margin: "7px 0 6px", lineHeight: 1.3 }}>{s.title}</h3>
        {s.excerpt && <p style={{ fontSize: 14.5, color: colors.inkMuted, margin: "0 0 12px", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.excerpt}</p>}
        <Byline s={s} />
      </div>
      {s.cover_image_url && (
        <div style={{ position: "relative", width: 132, height: 112, borderRadius: radius.md, overflow: "hidden", flexShrink: 0, background: colors.tintBlue }}>
          <Image src={s.cover_image_url} alt={s.title} fill style={{ objectFit: "cover" }} />
        </div>
      )}
    </Link>
  );
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; mine?: string; tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q, cat, mine, tab } = await searchParams;
  const mineOnly = mine === "1";
  const following = !mineOnly && tab === "following";

  // Show a lead story only on the clean Discover landing (known from the URL,
  // before any query). The hero is the single most-viewed story over the past
  // week; if nobody has read anything this week, fall back to a featured/latest.
  const isLanding = !mineOnly && !following && !cat && !q?.trim();

  // First wave: everything that doesn't depend on another query's result.
  const [counts, followingSet, popular] = await Promise.all([
    getStoryCategoryCounts(),
    following ? getFollowingIds(user.id) : Promise.resolve(null),
    isLanding ? getMostPopularThisWeek(user.id) : Promise.resolve(null),
  ]);
  const followingIds = followingSet ? Array.from(followingSet) : undefined;

  // Second wave: the feed (needs followingIds) and the featured fallback (needs
  // to know there's no "popular"), run together.
  const [stories, featured] = await Promise.all([
    listStories({ userId: user.id, category: cat, search: q, mineOnly, authorIn: followingIds }),
    isLanding && !popular ? listStories({ userId: user.id, featuredOnly: true }) : Promise.resolve([]),
  ]);
  const lead = isLanding ? (popular ?? featured[0] ?? stories[0] ?? null) : null;
  const feed = lead ? stories.filter((s) => s.id !== lead.id) : stories;

  const feedHeading = mineOnly ? "My stories" : following ? "From people you follow" : cat ? cat : q ? `Results for “${q}”` : "Latest";

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "32px 28px 48px", width: "100%" }}>
      {/* Masthead */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", paddingBottom: 18, borderBottom: `2px solid ${colors.ink}` }}>
        <div>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: colors.ink, margin: 0, letterSpacing: "-0.02em" }}>Stories</h1>
          <p style={{ fontSize: 15, color: colors.inkFaint, margin: "6px 0 0", maxWidth: 540, lineHeight: 1.5 }}>
            Personal journeys, research insights and cultural experiences from across the TBHF network.
          </p>
        </div>
        <Link href="/stories/new" style={{ background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "11px 22px", fontSize: 14.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7, boxShadow: gradients.hero ? "0 6px 16px rgba(17,166,214,.26)" : undefined }}>
          <Icon name="fileText" size={17} /> Write
        </Link>
      </div>

      {/* Primary tabs + search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginTop: 14 }}>
        <div style={{ display: "flex", gap: 24 }}>
          <Link href="/stories" style={tabStyle(!following && !mineOnly)}>Discover</Link>
          <Link href="/stories?tab=following" style={tabStyle(following)}>Following</Link>
          <Link href="/stories?mine=1" style={tabStyle(mineOnly)}>My stories</Link>
        </div>
        <form action="/stories" method="get" style={{ width: 260, maxWidth: "100%" }}>
          {following && <input type="hidden" name="tab" value="following" />}
          <input name="q" defaultValue={q ?? ""} placeholder="Search stories…" style={{ width: "100%", padding: "9px 15px", fontSize: 14, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }} />
        </form>
      </div>

      <div style={{ marginTop: 30 }}>
        {/* Lead — most popular story of the week */}
        {lead && (
          <>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: colors.brand, marginBottom: 14 }}>
              <Icon name="sparkle" size={15} /> Most popular story this week
            </div>
            <FeaturedLead s={lead} />
          </>
        )}

        {/* Feed */}
        {feed.length === 0 && !lead ? (
          <EmptyState following={following} mineOnly={mineOnly} q={q} />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: colors.inkFaint }}>{feedHeading}</div>
              {!mineOnly && (
                <StoryCategoryFilter selected={cat} counts={Object.fromEntries(counts)} following={following} />
              )}
            </div>
            {feed.length === 0 ? (
              <p style={{ fontSize: 14, color: colors.inkFaint, padding: "18px 16px" }}>That’s the only story here for now.</p>
            ) : (
              <div>{feed.map((s) => <FeedRow key={s.id} s={s} />)}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ following, mineOnly, q }: { following: boolean; mineOnly: boolean; q?: string }) {
  let msg = "No stories here yet — be the first to share one.";
  if (mineOnly) msg = "You haven’t written any stories yet.";
  else if (following) msg = "Stories from scholars you follow will appear here.";
  else if (q?.trim()) msg = `No stories match “${q}”.`;
  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "46px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
      <div style={{ marginBottom: 14, opacity: 0.5, display: "flex", justifyContent: "center" }}><Icon name="book" size={38} /></div>
      {msg}
      {following && (
        <div style={{ marginTop: 14 }}>
          <Link href="/community" style={{ color: colors.brand, fontWeight: 700 }}>Find scholars to follow →</Link>
        </div>
      )}
      {mineOnly && (
        <div style={{ marginTop: 14 }}>
          <Link href="/stories/new" style={{ color: colors.brand, fontWeight: 700 }}>Write your first story →</Link>
        </div>
      )}
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 15.5, fontWeight: 700, paddingBottom: 8,
    color: active ? colors.ink : colors.inkFaint,
    borderBottom: `2.5px solid ${active ? colors.brand : "transparent"}`,
  };
}
