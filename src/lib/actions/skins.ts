"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { saveUploadedImage } from "@/lib/uploads";
import { normalizeSkinName } from "@/lib/skin-name";
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

// A skin of this hero whose name is the same as `name` apart from case, spaces
// and punctuation.
async function findSameNameSkin(heroId: string, name: string) {
  const wanted = normalizeSkinName(name);
  const skins = await prisma.skin.findMany({ where: { heroId }, select: { id: true, name: true } });
  return skins.find((skin) => normalizeSkinName(skin.name) === wanted) ?? null;
}

// A fingerprint is exactly 64 characters of 0/1; anything else is ignored.
function cleanHash(value: string | undefined | null): string | null {
  return value && /^[01]{64}$/.test(value) ? value : null;
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

  // A skin is created with its name only. Its picture is added afterwards,
  // on the skin that now exists (row "ใส่รูป" or the screenshot cutter).
  const same = await findSameNameSkin(heroId, parsed.data.name);
  if (same) return { error: `มีสกิน "${same.name}" อยู่แล้ว` };
  try {
    await prisma.skin.create({ data: { ...parsed.data, tier: parsed.data.tier ?? "NORMAL", heroId } });
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

// The one "add" form on /admin/skins: a hero name and a skin name. The hero
// is created when it doesn't exist yet (matched case-insensitively).
export async function addHeroSkinAction(_prev: SkinFormState, formData: FormData): Promise<SkinFormState> {
  await requireAdmin();

  const clean = (value: FormDataEntryValue | null) => String(value ?? "").replace(/[|\r\n]/g, " ").trim();
  const heroParsed = heroSchema.shape.name.safeParse(clean(formData.get("hero")));
  if (!heroParsed.success) return { error: heroParsed.error.issues[0]?.message ?? "กรุณาใส่ชื่อฮีโร่" };
  const skinParsed = skinSchema.shape.name.safeParse(clean(formData.get("skin")));
  if (!skinParsed.success) return { error: skinParsed.error.issues[0]?.message ?? "กรุณาใส่ชื่อสกิน" };

  let hero = await prisma.hero.findFirst({
    where: { name: { equals: heroParsed.data, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  const heroIsNew = !hero;
  if (!hero) {
    try {
      hero = await prisma.hero.create({ data: { name: heroParsed.data }, select: { id: true, name: true } });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      hero = await prisma.hero.findFirst({
        where: { name: { equals: heroParsed.data, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      if (!hero) return { error: "เพิ่มฮีโร่ไม่สำเร็จ ลองใหม่อีกครั้ง" };
    }
  }

  const sameName = await findSameNameSkin(hero.id, skinParsed.data);
  if (sameName) return { error: `${hero.name} มีสกิน "${sameName.name}" อยู่แล้ว` };

  try {
    await prisma.skin.create({ data: { name: skinParsed.data, tier: "NORMAL", heroId: hero.id } });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: `${hero.name} มีสกิน "${skinParsed.data}" อยู่แล้ว` };
    throw error;
  }

  revalidateSkinPages(hero.id);
  return {
    success: `เพิ่ม ${heroIsNew ? "ฮีโร่ใหม่ " : ""}${hero.name} · ${skinParsed.data} แล้ว — ใส่รูปได้ที่หน้าฮีโร่`,
  };
}

// Sets (or replaces) only the picture of one skin. Used by the screenshot
// cutter, which crops several skins out of one screenshot in a row.
export async function setSkinImageAction(skinId: string, formData: FormData, imageHash?: string): Promise<SkinFormState> {
  await requireAdmin();

  let imageUrl: string | null;
  try {
    imageUrl = await optionalImage(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ" };
  }
  if (!imageUrl) return { error: "ไม่พบรูป กรุณาลองตัดใหม่อีกครั้ง" };

  try {
    const skin = await prisma.skin.update({
      where: { id: skinId },
      data: { imageUrl, imageHash: cleanHash(imageHash) },
      select: { heroId: true, name: true },
    });
    revalidateSkinPages(skin.heroId);
    return { success: `บันทึกรูป "${skin.name}" แล้ว` };
  } catch {
    return { error: "ไม่พบสกินนี้ อาจถูกลบไปแล้ว" };
  }
}

export type ScreenshotSkinResult = { ok: boolean; status?: "created" | "skipped"; heroCreated?: boolean; error?: string };

// One card from a screenshot: finds (or creates) the hero by name, then
// creates the skin with this picture. A skin with the same name is skipped, or
// gets the new picture when `replace` is set.
export async function addSkinFromScreenshotAction(
  heroName: string,
  skinName: string,
  formData: FormData,
  imageHash?: string
): Promise<ScreenshotSkinResult> {
  await requireAdmin();

  const clean = (value: string) => value.replace(/[|\r\n]/g, " ").replace(/\s+/g, " ").trim();
  const heroParsed = heroSchema.shape.name.safeParse(clean(heroName));
  if (!heroParsed.success) return { ok: false, error: heroParsed.error.issues[0]?.message ?? "ชื่อฮีโร่ไม่ถูกต้อง" };
  const skinParsed = skinSchema.shape.name.safeParse(clean(skinName));
  if (!skinParsed.success) return { ok: false, error: skinParsed.error.issues[0]?.message ?? "ชื่อสกินไม่ถูกต้อง" };

  let imageUrl: string | null;
  try {
    imageUrl = await optionalImage(formData);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ" };
  }
  if (!imageUrl) return { ok: false, error: "ไม่มีรูป" };

  let hero = await prisma.hero.findFirst({
    where: { name: { equals: heroParsed.data, mode: "insensitive" } },
    select: { id: true },
  });
  const heroCreated = !hero;
  if (!hero) {
    try {
      hero = await prisma.hero.create({ data: { name: heroParsed.data }, select: { id: true } });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      hero = await prisma.hero.findFirst({
        where: { name: { equals: heroParsed.data, mode: "insensitive" } },
        select: { id: true },
      });
      if (!hero) return { ok: false, error: "เพิ่มฮีโร่ไม่สำเร็จ" };
    }
  }

  // One picture per skin: a skin that is already there is left as it is.
  const existing = await findSameNameSkin(hero.id, skinParsed.data);
  if (existing) {
    revalidateSkinPages(hero.id);
    return { ok: true, status: "skipped", heroCreated };
  }
  try {
    await prisma.skin.create({
      data: { name: skinParsed.data, tier: "NORMAL", heroId: hero.id, imageUrl, imageHash: cleanHash(imageHash) },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: true, status: "skipped", heroCreated };
    throw error;
  }
  const status = "created" as const;
  revalidateSkinPages(hero.id);
  return { ok: true, status, heroCreated };
}

// Saves fingerprints computed in the browser for pictures that did not have
// one yet, so the next screenshot is compared without loading them again.
export async function saveSkinHashesAction(items: { id: string; hash: string }[]): Promise<void> {
  await requireAdmin();
  for (const item of items.slice(0, 500)) {
    const hash = cleanHash(item.hash);
    if (!hash) continue;
    await prisma.skin.updateMany({ where: { id: item.id, imageHash: null }, data: { imageHash: hash } });
  }
}

export type FixSkinResult = { ok: boolean; status?: "fixed" | "same"; error?: string; heroRemoved?: boolean };

// Corrects an existing skin (found again by its picture): sets its name and
// moves it to the right hero, creating that hero when needed. The picture is
// not touched. A hero left with no skins by the move is removed.
export async function fixSkinAction(skinId: string, heroName: string, skinName: string): Promise<FixSkinResult> {
  await requireAdmin();

  const clean = (value: string) => value.replace(/[|\r\n]/g, " ").replace(/\s+/g, " ").trim();
  const heroParsed = heroSchema.shape.name.safeParse(clean(heroName));
  if (!heroParsed.success) return { ok: false, error: heroParsed.error.issues[0]?.message ?? "ชื่อฮีโร่ไม่ถูกต้อง" };
  const skinParsed = skinSchema.shape.name.safeParse(clean(skinName));
  if (!skinParsed.success) return { ok: false, error: skinParsed.error.issues[0]?.message ?? "ชื่อสกินไม่ถูกต้อง" };

  const skin = await prisma.skin.findUnique({ where: { id: skinId }, include: { hero: true } });
  if (!skin) return { ok: false, error: "ไม่พบสกินนี้แล้ว" };

  let hero = await prisma.hero.findFirst({
    where: { name: { equals: heroParsed.data, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!hero) {
    try {
      hero = await prisma.hero.create({ data: { name: heroParsed.data }, select: { id: true, name: true } });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      hero = await prisma.hero.findFirst({
        where: { name: { equals: heroParsed.data, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      if (!hero) return { ok: false, error: "เพิ่มฮีโร่ไม่สำเร็จ" };
    }
  }

  if (hero.id === skin.heroId && skin.name === skinParsed.data) return { ok: true, status: "same" };

  const other = await findSameNameSkin(hero.id, skinParsed.data);
  if (other && other.id !== skin.id) {
    return { ok: false, error: `${hero.name} มีสกิน "${other.name}" อยู่แล้ว (ซ้ำกับสกินอื่น)` };
  }
  try {
    await prisma.skin.update({ where: { id: skin.id }, data: { name: skinParsed.data, heroId: hero.id } });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "ชื่อซ้ำกับสกินอื่นของฮีโร่นี้" };
    throw error;
  }

  // A wrongly named hero that has nothing left is removed.
  let heroRemoved = false;
  if (skin.heroId !== hero.id) {
    const left = await prisma.skin.count({ where: { heroId: skin.heroId } });
    if (left === 0 && !skin.hero.imageUrl) {
      await prisma.hero.delete({ where: { id: skin.heroId } });
      heroRemoved = true;
    }
  }
  revalidateSkinPages(hero.id);
  return { ok: true, status: "fixed", heroRemoved };
}

export type MergeHeroResult = { ok: boolean; error?: string; merged?: boolean; moved?: number; removed?: number; heroId?: string };

// Renames a hero. When another hero already has that name the two are merged:
// the skins move to that hero, and a skin whose name is already there is not
// duplicated (the copy with a picture is kept). The emptied hero is removed.
export async function renameOrMergeHeroAction(heroId: string, newName: string): Promise<MergeHeroResult> {
  await requireAdmin();

  const parsed = heroSchema.shape.name.safeParse(newName.replace(/\s+/g, " ").trim());
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ชื่อฮีโร่ไม่ถูกต้อง" };

  const source = await prisma.hero.findUnique({ where: { id: heroId }, include: { skins: true } });
  if (!source) return { ok: false, error: "ไม่พบฮีโร่นี้แล้ว" };

  const target = await prisma.hero.findFirst({
    where: { name: { equals: parsed.data, mode: "insensitive" } },
    include: { skins: true },
  });

  if (!target || target.id === source.id) {
    await prisma.hero.update({ where: { id: source.id }, data: { name: parsed.data } });
    revalidateSkinPages(source.id);
    return { ok: true, merged: false, heroId: source.id };
  }

  let moved = 0;
  let removed = 0;
  for (const skin of source.skins) {
    const same = target.skins.find((t) => normalizeSkinName(t.name) === normalizeSkinName(skin.name));
    if (!same) {
      await prisma.skin.update({ where: { id: skin.id }, data: { heroId: target.id } });
      moved++;
      continue;
    }
    // Already there: keep one copy, preferring the one that has a picture.
    if (!same.imageUrl && skin.imageUrl) {
      await prisma.skin.update({ where: { id: same.id }, data: { imageUrl: skin.imageUrl, imageHash: skin.imageHash } });
    }
    await prisma.skin.delete({ where: { id: skin.id } });
    removed++;
  }
  await prisma.hero.delete({ where: { id: source.id } });
  revalidateSkinPages(target.id);
  return { ok: true, merged: true, moved, removed, heroId: target.id };
}

// Deletes skins picked by the admin in the screenshot tool ("not in the pictures
// you sent"). A hero left with no skins and no picture is removed too.
export async function deleteSkinsAction(ids: string[]): Promise<{ ok: boolean; deleted: number; heroesRemoved: number }> {
  await requireAdmin();
  const clean = ids.filter((id) => typeof id === "string" && id.length > 0).slice(0, 300);
  if (clean.length === 0) return { ok: true, deleted: 0, heroesRemoved: 0 };

  const skins = await prisma.skin.findMany({ where: { id: { in: clean } }, select: { id: true, heroId: true } });
  await prisma.skin.deleteMany({ where: { id: { in: skins.map((s) => s.id) } } });

  let heroesRemoved = 0;
  for (const heroId of new Set(skins.map((s) => s.heroId))) {
    const left = await prisma.skin.count({ where: { heroId } });
    const hero = await prisma.hero.findUnique({ where: { id: heroId }, select: { imageUrl: true } });
    if (left === 0 && hero && !hero.imageUrl) {
      await prisma.hero.delete({ where: { id: heroId } });
      heroesRemoved++;
    }
  }
  revalidateSkinPages();
  return { ok: true, deleted: skins.length, heroesRemoved };
}

// Deletes whole heroes (with their skins) picked on the reference-check page.
export async function deleteHeroesAction(ids: string[]): Promise<{ ok: boolean; deleted: number }> {
  await requireAdmin();
  const clean = ids.filter((id) => typeof id === "string" && id.length > 0).slice(0, 100);
  if (clean.length === 0) return { ok: true, deleted: 0 };
  const result = await prisma.hero.deleteMany({ where: { id: { in: clean } } });
  revalidateSkinPages();
  return { ok: true, deleted: result.count };
}
