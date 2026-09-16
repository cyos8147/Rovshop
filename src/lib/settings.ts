import { prisma } from "@/lib/prisma";

export const SETTINGS_ID = "main";

export async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  return settings ?? { id: SETTINGS_ID, contactUrl: "", updatedAt: new Date() };
}
