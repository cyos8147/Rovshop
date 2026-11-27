import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB (Server Action request limit is 6 MB, see next.config.js)

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า Supabase Storage — กรุณาตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  // Service-role key only ever runs on the server (this file is
  // "server-only") — never send it to a client component.
  // New-style secret keys ("sb_secret_...") are not JWTs. supabase-js also
  // sends the key as a Bearer token, which Storage rejects ("Invalid Compact
  // JWS"), so for those keys only the apikey header is sent.
  const isNewStyleKey = serviceKey.startsWith("sb_");
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: isNewStyleKey
      ? {
          fetch: (input, init) => {
            const headers = new Headers(init?.headers);
            if (headers.get("authorization") === `Bearer ${serviceKey}`) headers.delete("authorization");
            return fetch(input, { ...init, headers });
          },
        }
      : undefined,
  });
}

// Validates the browser-reported MIME type and size, then uploads the file
// to Supabase Storage under a freshly generated random name (never the
// client-supplied filename/extension) so an upload can't be used for path
// traversal or to smuggle in an executable/HTML file served from our bucket.
// Throws a user-facing error unless the file is a JPG/PNG/WEBP of 1B–4MB;
// returns the extension to store it under.
export function validateImageFile(file: File): string {
  const extension = ALLOWED_IMAGE_MIME[file.type];
  if (!extension) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP");
  }
  if (file.size === 0) {
    throw new Error("ไฟล์รูปภาพว่างเปล่า");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 4MB ต่อไฟล์");
  }
  return extension;
}

export async function saveUploadedImage(file: File): Promise<string> {
  const extension = validateImageFile(file);

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
  const filename = `${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).upload(filename, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    // Only admins upload skin pictures, so the real reason is shown to them
    // (and logged) to make a wrong key or bucket name easy to spot.
    console.error("Supabase image upload failed", { bucket, message: error.message });
    throw new Error(`อัปโหลดรูปภาพไม่สำเร็จ (${error.message}) — bucket: ${bucket}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}

// Payment slips contain names and partial account numbers, so they go to a
// separate PRIVATE bucket and are only ever shown to admins through
// short-lived signed URLs. Returns the object path (not a URL).
function slipBucket() {
  return process.env.SUPABASE_SLIP_BUCKET || "payment-slips";
}

export async function savePrivateSlip(file: File): Promise<string> {
  const extension = validateImageFile(file);
  const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await getSupabaseAdminClient()
    .storage.from(slipBucket())
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) throw new Error("บันทึกรูปสลิปไม่สำเร็จ");
  return path;
}

export async function signedSlipUrl(path: string): Promise<string | null> {
  try {
    const { data } = await getSupabaseAdminClient()
      .storage.from(slipBucket())
      .createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
