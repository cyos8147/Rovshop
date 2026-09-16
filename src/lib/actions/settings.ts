"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { SETTINGS_ID } from "@/lib/settings";

const settingsSchema = z.object({
  contactUrl: z
    .string()
    .trim()
    .url("กรุณาใส่ลิงก์ที่ถูกต้อง เช่น https://www.facebook.com/ชื่อผู้ใช้ของคุณ")
    .max(300),
});

export type SettingsFormState = {
  error?: string;
  success?: boolean;
};

export async function updateSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({ contactUrl: formData.get("contactUrl") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: { contactUrl: parsed.data.contactUrl },
    create: { id: SETTINGS_ID, contactUrl: parsed.data.contactUrl },
  });

  revalidatePath("/", "layout");

  return { success: true };
}
