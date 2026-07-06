import { createClient } from "@/lib/supabase/server";

// SECURITY (BUG-007): the `resources` and `research` buckets are private, so their
// files are not reachable via a public URL. Members read them through short-lived
// SIGNED URLs generated server-side. These helpers turn a stored value — whether a
// legacy public URL or a bare object path — into a signed URL for display/download.
// Never feed the result back into an edit form (signed URLs expire); sign only at
// the point of rendering a link.

const SIGNED_TTL = 60 * 60; // 1 hour

/** Pull the object path out of a stored public/signed URL (or accept a bare path). */
function extractPath(bucket: string, stored: string): string | null {
  for (const marker of [`/object/public/${bucket}/`, `/object/sign/${bucket}/`, `/${bucket}/`]) {
    const i = stored.indexOf(marker);
    if (i !== -1) return decodeURIComponent(stored.slice(i + marker.length).split("?")[0]);
  }
  // No bucket marker found: assume the stored value is already a bare object path.
  const bare = stored.split("?")[0].replace(/^\/+/, "");
  return bare ? decodeURIComponent(bare) : null;
}

/** Sign a single stored file value. Returns null when there's nothing to sign. */
export async function signBucketUrl(
  bucket: string,
  stored: string | null | undefined,
  ttl = SIGNED_TTL,
): Promise<string | null> {
  if (!stored) return null;
  const path = extractPath(bucket, stored);
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
  if (error) {
    console.error(`signBucketUrl(${bucket}):`, error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/** Batch-sign many stored file values (dedupes paths). Preserves input order/nulls. */
export async function signBucketUrls(
  bucket: string,
  stored: (string | null)[],
  ttl = SIGNED_TTL,
): Promise<(string | null)[]> {
  const paths = stored.map((v) => (v ? extractPath(bucket, v) : null));
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (unique.length === 0) return stored.map(() => null);

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, ttl);
  if (error) {
    console.error(`signBucketUrls(${bucket}):`, error.message);
    return stored.map(() => null);
  }
  const byPath = new Map<string, string>();
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) byPath.set(d.path, d.signedUrl);
  });
  return paths.map((p) => (p ? byPath.get(p) ?? null : null));
}
