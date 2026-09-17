import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

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
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// Validates the browser-reported MIME type and size, then uploads the file
// to Supabase Storage under a freshly generated random name (never the
// client-supplied filename/extension) so an upload can't be used for path
// traversal or to smuggle in an executable/HTML file served from our bucket.
export async function saveUploadedImage(file: File): Promise<string> {
  const extension = ALLOWED_IMAGE_MIME[file.type];
  if (!extension) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP");
  }
  if (file.size === 0) {
    throw new Error("ไฟล์รูปภาพว่างเปล่า");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB ต่อไฟล์");
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
  const filename = `${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).upload(filename, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error("อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}
