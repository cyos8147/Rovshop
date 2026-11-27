import { prisma } from "@/lib/prisma";

export const SETTINGS_ID = "main";

export async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  return (
    settings ?? {
      id: SETTINGS_ID,
      contactUrl: "",
      promptpayId: "",
      promptpayName: "",
      skinPriceCents: 30,
      noWatermarkCents: 500,
      signupBonusCents: 0,
      minTopup: 20,
      updatedAt: new Date(),
    }
  );
}
