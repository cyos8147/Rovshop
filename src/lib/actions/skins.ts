"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { saveUploadedImage } from "@/lib/uploads";
import { HERO_ROLES, SKIN_TIERS, SKIN_TIER_LABELS, type SkinTier } from "@/lib/types";

export type SkinFormState = {
  error?: string;
  success?: string;
};

const heroSchema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อฮีโร่").max(60),
  role: z.enum(HERO_ROLES),
});

const skinSchema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อสกิน").max(80),
  tier: z.enum(SKIN_TIERS),
});

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// Returns the uploaded URL, null when no file was chosen, or throws with a
// user-facing message (see saveUploadedImage).
async function optionalImage(formData: FormData, field = "image"): Promise<string | null> {
  const entry = formData.get(field);
  if (!(entry instanceof File) || entry.size === 0) return null;
  return saveUploadedImage(entry);
}

function revalidateSkinPages(heroId?: string) {
  revalidatePath("/sort");
  revalidatePath("/admin/skins");
  if (heroId) revalidatePath(`/admin/skins/${heroId}`);
}

// --- Heroes ----------------------------------------------------------------

export async function createHeroAction(_prev: SkinFormState, formData: FormData): Promise<SkinFormState> {
  await requireAdmin();

  const parsed = heroSchema.safeParse({ name: formData.get("name"), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  let imageUrl: string | null;
  try {
    imageUrl = await optionalImage(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ" };
  }

  let heroId: string;
  try {
    const hero = await prisma.hero.create({ data: { ...parsed.data, imageUrl } });
    heroId = hero.id;
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "มีฮีโร่ชื่อนี้อยู่แล้ว" };
    throw error;
  }

  revalidateSkinPages();
  redirect(`/admin/skins/${heroId}`);
}

export async function updateHeroAction(
  heroId: string,
  _prev: SkinFormState,
  formData: FormData
): Promise<SkinFormState> {
  await requireAdmin();

  const parsed = heroSchema.safeParse({ name: formData.get("name"), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  let imageUrl: string | null;
  try {
    imageUrl = await optionalImage(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ" };
  }

  try {
    await prisma.hero.update({
      where: { id: heroId },
      // Only replace the picture when a new one was uploaded.
      data: { ...parsed.data, ...(imageUrl ? { imageUrl } : {}) },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "มีฮีโร่ชื่อนี้อยู่แล้ว" };
    throw error;
  }

  revalidateSkinPages(heroId);
  return { success: "บันทึกข้อมูลฮีโร่แล้ว" };
}

export async function deleteHeroAction(heroId: string) {
  await requireAdmin();
  await prisma.hero.delete({ where: { id: heroId } });
  revalidateSkinPages();
  redirect("/admin/skins");
}

// --- Skins -----------------------------------------------------------------

export async function createSkinAction(
  heroId: string,
  _prev: SkinFormState,
  formData: FormData
): Promise<SkinFormState> {
  await requireAdmin();

  const parsed = skinSchema.safeParse({ name: formData.get("name"), tier: formData.get("tier") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  let imageUrl: string | null;
  try {
    imageUrl = await optionalImage(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ" };
  }

  try {
    await prisma.skin.create({ data: { ...parsed.data, imageUrl, heroId } });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "ฮีโร่ตัวนี้มีสกินชื่อนี้อยู่แล้ว" };
    throw error;
  }

  revalidateSkinPages(heroId);
  return { success: `เพิ่มสกิน "${parsed.data.name}" แล้ว` };
}

// Accepts any of the labels admins naturally type ("S+", "s+", "S_PLUS",
// "limited", "ทั่วไป") and maps them back to a SkinTier.
function parseTier(raw: string | undefined): SkinTier | null {
  if (!raw) return "A";
  const value = raw.trim().toUpperCase();
  if (!value) return "A";
  for (const tier of SKIN_TIERS) {
    if (tier === value || SKIN_TIER_LABELS[tier].toUpperCase() === value) return tier;
  }
  return null;
}

// One skin per line: "ชื่อสกิน | tier" (tier optional, defaults to A).
// Existing names are skipped rather than failing the whole batch, so the
// same list can be pasted again after adding a few new lines.
export async function bulkAddSkinsAction(
  heroId: string,
  _prev: SkinFormState,
  formData: FormData
): Promise<SkinFormState> {
  await requireAdmin();

  const text = String(formData.get("lines") ?? "");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return { error: "กรุณาใส่รายชื่อสกินอย่างน้อย 1 บรรทัด" };
  if (lines.length > 200) return { error: "เพิ่มได้ครั้งละไม่เกิน 200 บรรทัด" };

  const rows: { name: string; tier: SkinTier }[] = [];
  for (const [index, line] of lines.entries()) {
    const [rawName, rawTier] = line.split("|");
    const tier = parseTier(rawTier);
    const parsed = skinSchema.safeParse({ name: rawName, tier });
    if (!tier || !parsed.success) {
      return { error: `บรรทัดที่ ${index + 1} ไม่ถูกต้อง: "${line}"` };
    }
    rows.push(parsed.data);
  }

  const result = await prisma.skin.createMany({
    data: rows.map((row) => ({ ...row, heroId })),
    skipDuplicates: true,
  });

  revalidateSkinPages(heroId);
  const skipped = rows.length - result.count;
  return {
    success: `เพิ่มสกินใหม่ ${result.count} รายการ${skipped > 0 ? ` (ข้ามชื่อซ้ำ ${skipped} รายการ)` : ""}`,
  };
}

export async function updateSkinAction(
  skinId: string,
  _prev: SkinFormState,
  formData: FormData
): Promise<SkinFormState> {
  await requireAdmin();

  const parsed = skinSchema.safeParse({ name: formData.get("name"), tier: formData.get("tier") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  let imageUrl: string | null;
  try {
    imageUrl = await optionalImage(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ" };
  }

  let heroId: string;
  try {
    const skin = await prisma.skin.update({
      where: { id: skinId },
      data: { ...parsed.data, ...(imageUrl ? { imageUrl } : {}) },
    });
    heroId = skin.heroId;
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "ฮีโร่ตัวนี้มีสกินชื่อนี้อยู่แล้ว" };
    throw error;
  }

  revalidateSkinPages(heroId);
  return { success: "บันทึกแล้ว" };
}

export async function deleteSkinAction(skinId: string) {
  await requireAdmin();
  const skin = await prisma.skin.delete({ where: { id: skinId } });
  revalidateSkinPages(skin.heroId);
}
