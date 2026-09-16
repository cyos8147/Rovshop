import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED_IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Validates the browser-reported MIME type and size, then writes the file
// under a freshly generated random name (never the client-supplied
// filename/extension) so an upload can't be used for path traversal or to
// smuggle in an executable/HTML file that later gets served from our origin.
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

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), bytes);

  return `/uploads/${filename}`;
}
