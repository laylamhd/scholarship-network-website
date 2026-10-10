import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Upload endpoint used by lib/supabase/client.ts (browser) → S3.
// The bucket's write rule is enforced inside StorageBucket.upload().
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const bucket = String(form?.get("bucket") ?? "");
  const path = String(form?.get("path") ?? "");
  if (!form || !(file instanceof Blob) || !bucket || !path) {
    return NextResponse.json({ data: null, error: { message: "bucket, path and file are required" } }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: form.get("upsert") === "true",
    contentType: file.type || "application/octet-stream",
  });
  return NextResponse.json({ data, error }, { status: error ? Number(error.statusCode) || 400 : 200 });
}
