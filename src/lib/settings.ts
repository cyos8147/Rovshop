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
      planPrice: 199,
      planDays: 30,
      trialDays: 3,
      updatedAt: new Date(),
    }
  );
}
