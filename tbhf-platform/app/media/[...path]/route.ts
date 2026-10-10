import { type NextRequest } from "next/server";
import { BUCKETS, getObject, safePath } from "@/lib/aws/storage";
import { SESSION_COOKIE, verifySession } from "@/lib/aws/session";

// GET /media/<bucket>/<path> — serves a stored file from S3.
// Public buckets (avatars, posters, covers…) are readable by anyone; the
// members-only buckets (resources, research) need a valid session cookie.
export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const [bucket, ...rest] = (await ctx.params).path;
  const rule = BUCKETS[bucket];
  const path = safePath(rest.map(decodeURIComponent).join("/"));
  if (!rule || !path) return new Response("Not found", { status: 404 });

  if (!rule.public) {
    const claims = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!claims) return new Response("Sign in to view this file", { status: 401 });
  }
  const obj = await getObject(`${bucket}/${path}`);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": obj.contentType,
    "X-Content-Type-Options": "nosniff",
    // Members-only files must not be cached by CloudFront or shared caches.
    "Cache-Control": rule.public ? "public, max-age=86400" : "private, no-store",
    // Never let an uploaded HTML/SVG file run as a page on our origin.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  });
  if (obj.length) headers.set("Content-Length", String(obj.length));
  return new Response(obj.body as BodyInit, { headers });
}
