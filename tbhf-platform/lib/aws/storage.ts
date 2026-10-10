import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile, unlink, stat } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { withRole } from "./db";
import type { Identity } from "./postgrest";

/**
 * File storage on Amazon S3 (replaces Supabase Storage).
 *
 * Objects live in ONE private S3 bucket (MEDIA_BUCKET) under "<bucket>/<path>",
 * e.g. "avatars/<user-id>/avatar-123.jpg". Nothing in S3 is public: the website
 * serves files at /media/<bucket>/<path> (app/media/[...path]/route.ts) using
 * the EC2 instance role, and checks the rules below first.
 *
 * The rules are a direct port of the Supabase Storage RLS policies
 * (supabase/phase*.sql + security_hardening.sql). Without MEDIA_BUCKET (local
 * development) files are kept on disk under STORAGE_LOCAL_DIR.
 */

type Who = Identity;
type Rule = {
  public: boolean; // anyone may read (else: signed-in members only)
  maxBytes: number;
  mime?: string[]; // allowed content types (undefined = any)
  canWrite: (who: Who, path: string) => Promise<boolean>; // insert/update/delete
};

const IMAGES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const DOCS = [
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv", ...IMAGES, "application/zip",
];
const MB = 1024 * 1024;

const signedIn = async (who: Who) => who.role === "authenticated" && !!who.userId;
const dbCheck = (fn: "is_admin" | "mod_can", arg?: string) => async (who: Who) => {
  if (!(await signedIn(who))) return false;
  const sql = arg ? `select public.${fn}($1) as ok` : `select public.${fn}() as ok`;
  const rows = await withRole("authenticated", who.userId, async (c) => (await c.query(sql, arg ? [arg] : [])).rows);
  return rows[0]?.ok === true;
};

export const BUCKETS: Record<string, Rule> = {
  // own folder only: avatars/<your user id>/...
  avatars: { public: true, maxBytes: 10 * MB, mime: IMAGES,
    canWrite: async (who, path) => (await signedIn(who)) && path.split("/")[0] === who.userId },
  "story-covers": { public: true, maxBytes: 10 * MB, mime: IMAGES, canWrite: signedIn },
  projects: { public: true, maxBytes: 10 * MB, mime: IMAGES, canWrite: signedIn },
  "event-posters": { public: true, maxBytes: 10 * MB, mime: IMAGES, canWrite: signedIn },
  "community-media": { public: true, maxBytes: 100 * MB, canWrite: signedIn },
  showcase: { public: true, maxBytes: 100 * MB, canWrite: signedIn },
  // members-only buckets
  research: { public: false, maxBytes: 25 * MB, mime: DOCS, canWrite: signedIn },
  resources: { public: false, maxBytes: 25 * MB, mime: DOCS, canWrite: dbCheck("mod_can", "manage_events_resources") },
};

export function safePath(path: string): string | null {
  const p = normalize(String(path ?? "")).replace(/^\/+/, "");
  if (!p || p.startsWith("..") || p.includes("/../") || p.includes("\0")) return null;
  return p;
}

// ---------------------------------------------------------------------------
// Backend: S3 in AWS, local folder in development
const bucket = () => process.env.MEDIA_BUCKET;
let s3: S3Client | null = null;
const client = () => (s3 ??= new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" }));
const localRoot = () => {
  const dir = process.env.STORAGE_LOCAL_DIR;
  if (!dir) throw new Error("Set MEDIA_BUCKET (S3) or STORAGE_LOCAL_DIR (local development)");
  return dir;
};

export async function putObject(key: string, body: Buffer, contentType: string) {
  if (bucket()) {
    await client().send(new PutObjectCommand({
      Bucket: bucket(), Key: key, Body: body, ContentType: contentType,
      ServerSideEncryption: "AES256", CacheControl: "public, max-age=31536000, immutable",
    }));
    return;
  }
  const file = join(/*turbopackIgnore: true*/ localRoot(), key);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, body);
  await writeFile(`${file}.__type`, contentType);
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    if (bucket()) { await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key })); return true; }
    await stat(join(/*turbopackIgnore: true*/ localRoot(), key)); return true;
  } catch { return false; }
}

export async function getObject(key: string): Promise<{ body: ReadableStream | Buffer; contentType: string; length?: number } | null> {
  try {
    if (bucket()) {
      const r = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
      return { body: r.Body!.transformToWebStream(), contentType: r.ContentType ?? "application/octet-stream", length: r.ContentLength };
    }
    const file = join(/*turbopackIgnore: true*/ localRoot(), key);
    const [body, type] = await Promise.all([readFile(file), readFile(`${file}.__type`, "utf8").catch(() => "application/octet-stream")]);
    return { body, contentType: type };
  } catch { return null; }
}

export async function deleteObjects(keys: string[]) {
  if (!keys.length) return;
  if (bucket()) {
    await client().send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: keys.map((Key) => ({ Key })) } }));
    return;
  }
  await Promise.all(keys.map((k) => unlink(join(/*turbopackIgnore: true*/ localRoot(), k)).catch(() => {})));
}

// ---------------------------------------------------------------------------
// supabase.storage.from(bucket) — server side
type StorageError = { message: string; statusCode: string };
const err = (message: string, statusCode = "400"): StorageError => ({ message, statusCode });
export { mediaUrl } from "./media-url";
import { mediaUrl } from "./media-url";

export class StorageBucket {
  constructor(private name: string, private who: () => Promise<Who>) {}

  private rule() { return BUCKETS[this.name]; }

  async upload(path: string, body: Blob | Buffer | ArrayBuffer, opts?: { upsert?: boolean; contentType?: string }) {
    const rule = this.rule();
    const p = safePath(path);
    if (!rule) return { data: null, error: err("Bucket not found", "404") };
    if (!p) return { data: null, error: err("Invalid key") };
    const who = await this.who();
    if (!(await rule.canWrite(who, p))) return { data: null, error: err("new row violates row-level security policy", "403") };

    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body instanceof Blob ? await body.arrayBuffer() : body);
    const type = opts?.contentType ?? (body instanceof Blob && body.type ? body.type : "application/octet-stream");
    if (buf.length > rule.maxBytes) return { data: null, error: err("The object exceeded the maximum allowed size", "413") };
    if (rule.mime && !rule.mime.includes(type)) return { data: null, error: err(`mime type ${type} is not supported`, "415") };

    const key = `${this.name}/${p}`;
    if (!opts?.upsert && (await objectExists(key))) return { data: null, error: err("The resource already exists", "409") };
    await putObject(key, buf, type);
    return { data: { path: p, id: key, fullPath: key }, error: null };
  }

  getPublicUrl(path: string) {
    return { data: { publicUrl: mediaUrl(this.name, safePath(path) ?? "") } };
  }

  /** Members-only files are authorised by /media itself, so the "signed" URL is the same path. */
  async createSignedUrl(path: string, _ttl: number): Promise<{ data: { signedUrl: string } | null; error: StorageError | null }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const p = safePath(path);
    if (!p || !this.rule()) return { data: null, error: err("Object not found", "404") };
    return { data: { signedUrl: mediaUrl(this.name, p) }, error: null };
  }

  async createSignedUrls(paths: string[], ttl: number): Promise<{ data: { path: string; signedUrl: string | null; error: string | null }[] | null; error: StorageError | null }> {
    const out = await Promise.all(paths.map(async (path) => ({ path, signedUrl: (await this.createSignedUrl(path, ttl)).data?.signedUrl ?? null, error: null })));
    return { data: out, error: null };
  }

  async remove(paths: string[]) {
    const rule = this.rule();
    if (!rule) return { data: null, error: err("Bucket not found", "404") };
    const who = await this.who();
    const ok: string[] = [];
    for (const path of paths) {
      const p = safePath(path);
      if (p && (await rule.canWrite(who, p))) ok.push(`${this.name}/${p}`);
    }
    await deleteObjects(ok);
    return { data: ok.map((k) => ({ name: k })), error: null };
  }
}
