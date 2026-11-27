"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { saveUploadedImage } from "@/lib/uploads";
import {
  HERO_ROLES,
  HERO_ROLE_LABELS,
  SKIN_TIERS,
  SKIN_TIER_LABELS,
  type HeroRole,
  type SkinTier,
} from "@/lib/types";

export type SkinFormState = {
  error?: string;
  success?: string;
};

const heroSchema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อฮีโร่").max(60),
  // No longer asked for in the admin forms; kept optional for imports.
  role: z.enum(HERO_ROLES).optional(),
});

const skinSchema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อสกิน").max(80),
  // Tiers (SSS, SS ...) are optional now; new skins are "NORMAL".
  tier: z.enum(SKIN_TIERS).optional(),
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

  const parsed = heroSchema.safeParse({ name: formData.get("name"), role: formData.get("role") ?? undefined });
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

  const parsed = heroSchema.safeParse({ name: formData.get("name"), role: formData.get("role") ?? undefined });
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

  const parsed = skinSchema.safeParse({ name: formData.get("name"), tier: formData.get("tier") ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  let imageUrl: string | null;
  try {
    imageUrl = await optionalImage(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ" };
  }

  try {
    await prisma.skin.create({ data: { ...parsed.data, tier: parsed.data.tier ?? "NORMAL", imageUrl, heroId } });
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
  if (!raw) return "NORMAL";
  const value = raw.trim().toUpperCase();
  if (!value) return "NORMAL";
  for (const tier of SKIN_TIERS) {
    if (tier === value || SKIN_TIER_LABELS[tier].toUpperCase() === value) return tier;
  }
  return null;
}

// One skin per line: "ชื่อสกิน" (an optional "| tier" is still accepted).
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
    rows.push({ name: parsed.data.name, tier });
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

  const parsed = skinSchema.safeParse({ name: formData.get("name"), tier: formData.get("tier") ?? undefined });
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

// Accepts the English key or the Thai label ("MAGE", "เมจ"); null = not given.
function parseRole(raw: string | undefined): HeroRole | null | "invalid" {
  const value = raw?.trim();
  if (!value) return null;
  const upper = value.toUpperCase();
  for (const role of HERO_ROLES) {
    if (role === upper || HERO_ROLE_LABELS[role] === value) return role;
  }
  return "invalid";
}

// One line per skin: "ฮีโร่ | สกิน | ระดับ | ตำแหน่ง" (last two optional).
// Creates any hero that doesn't exist yet (matched case-insensitively), then
// the skins, skipping ones that already exist — so the same list can be
// pasted again after it grows.
export async function importCatalogAction(_prev: SkinFormState, formData: FormData): Promise<SkinFormState> {
  await requireAdmin();

  const lines = String(formData.get("lines") ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { error: "กรุณาวางรายชื่ออย่างน้อย 1 บรรทัด" };
  if (lines.length > 600) return { error: "นำเข้าได้ครั้งละไม่เกิน 600 บรรทัด" };

  type Row = { hero: string; skin: string; tier: SkinTier; role: HeroRole | null };
  const rows: Row[] = [];
  for (const [index, line] of lines.entries()) {
    const [hero, skin, rawTier, rawRole] = line.split("|").map((part) => part.trim());
    const tier = parseTier(rawTier);
    const role = parseRole(rawRole);
    const heroOk = heroSchema.shape.name.safeParse(hero).success;
    const skinOk = skinSchema.shape.name.safeParse(skin).success;
    if (!heroOk || !skinOk || !tier || role === "invalid") {
      return { error: `บรรทัดที่ ${index + 1} ไม่ถูกต้อง: "${line}"` };
    }
    rows.push({ hero, skin, tier, role });
  }

  const existing = await prisma.hero.findMany({ select: { id: true, name: true } });
  const byName = new Map(existing.map((hero) => [hero.name.toLowerCase(), hero]));

  // Role of a new hero = the first role mentioned for it, else FIGHTER.
  const newHeroes = new Map<string, { name: string; role: HeroRole }>();
  for (const row of rows) {
    const key = row.hero.toLowerCase();
    if (byName.has(key)) continue;
    const known = newHeroes.get(key);
    if (!known) newHeroes.set(key, { name: row.hero, role: row.role ?? "FIGHTER" });
    else if (row.role && known.role === "FIGHTER") known.role = row.role;
  }
  if (newHeroes.size > 0) {
    await prisma.hero.createMany({ data: [...newHeroes.values()], skipDuplicates: true });
    const created = await prisma.hero.findMany({ select: { id: true, name: true } });
    for (const hero of created) byName.set(hero.name.toLowerCase(), hero);
  }

  const result = await prisma.skin.createMany({
    data: rows.map((row) => ({ name: row.skin, tier: row.tier, heroId: byName.get(row.hero.toLowerCase())!.id })),
    skipDuplicates: true,
  });

  revalidateSkinPages();
  const skipped = rows.length - result.count;
  return {
    success: `เพิ่มฮีโร่ใหม่ ${newHeroes.size} · สกินใหม่ ${result.count}${skipped > 0 ? ` (ข้ามที่มีอยู่แล้ว ${skipped})` : ""}`,
  };
}

// Sets (or replaces) only the picture of one skin. Used by the screenshot
// cutter, which crops several skins out of one screenshot in a row.
export async function setSkinImageAction(skinId: string, formData: FormData): Promise<SkinFormState> {
  await requireAdmin();

  let imageUrl: string | null;
  try {
    imageUrl = await optionalImage(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ" };
  }
  if (!imageUrl) return { error: "ไม่พบรูป กรุณาลองตัดใหม่อีกครั้ง" };

  try {
    const skin = await prisma.skin.update({ where: { id: skinId }, data: { imageUrl }, select: { heroId: true, name: true } });
    revalidateSkinPages(skin.heroId);
    return { success: `บันทึกรูป "${skin.name}" แล้ว` };
  } catch {
    return { error: "ไม่พบสกินนี้ อาจถูกลบไปแล้ว" };
  }
}
