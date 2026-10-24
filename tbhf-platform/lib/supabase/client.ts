import { mediaUrl } from "@/lib/aws/media-url";

/**
 * Browser-side client. In this app the browser only uploads files; every
 * database query runs on the server. AWS deployment: uploads go to our own
 * route (/api/storage/upload), which checks the bucket rules and writes to S3.
 * Same method names and result shape as supabase-js, so the forms are unchanged.
 */
export function createClient() {
  return {
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, file: Blob, opts?: { upsert?: boolean; contentType?: string }) {
            const form = new FormData();
            form.set("bucket", bucket);
            form.set("path", path);
            form.set("upsert", opts?.upsert ? "true" : "false");
            form.set("file", file);
            try {
              const res = await fetch("/api/storage/upload", { method: "POST", body: form, credentials: "same-origin" });
              const json = await res.json().catch(() => ({ error: { message: `Upload failed (${res.status})` } }));
              return { data: json.data ?? null, error: json.error ?? null };
            } catch (e) {
              return { data: null, error: { message: e instanceof Error ? e.message : "Upload failed" } };
            }
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: mediaUrl(bucket, path) } };
          },
        };
      },
    },
  };
}
