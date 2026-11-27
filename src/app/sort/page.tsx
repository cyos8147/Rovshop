import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SkinSorter } from "@/components/SkinSorter";
import { getWallet } from "@/lib/wallet";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "เรียงสกินทำป้าย RoV",
  description: "เลือกสกิน RoV ที่มี จัดเรียง แล้วสร้างเป็นภาพป้ายภาพเดียว ใช้ได้ทั้งมือถือและคอม จัดฟรี จ่ายเฉพาะตอนดาวน์โหลด",
};

export default async function SortPage() {
  const [heroes, wallet, settings] = await Promise.all([
    prisma.hero.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        skins: { select: { id: true, name: true, imageUrl: true } },
      },
    }),
    getWallet(),
    getSettings(),
  ]);

  const skinCount = heroes.reduce((sum, hero) => sum + hero.skins.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          ทำป้ายสกิน RoV
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          เลือกสกิน ตกแต่ง แล้วดาวน์โหลดเป็นภาพเดียวพร้อมโพสต์ จัดและดูตัวอย่างได้ฟรี จ่ายตอนดาวน์โหลด
          มี {heroes.length} ฮีโร่ {skinCount.toLocaleString("th-TH")} สกินให้เลือก
        </p>
      </div>
      <SkinSorter
        heroes={heroes}
        watermark={{ text: "ทำป้ายที่", brand: "OSCAR", suffix: "Gaming images" }}
        wallet={{
          state: wallet.state,
          balanceCents: wallet.balanceCents,
          skinPriceCents: settings.skinPriceCents,
          noWatermarkCents: settings.noWatermarkCents,
          signupBonusCents: settings.signupBonusCents,
          planUntil: wallet.state === "member" ? wallet.planUntil : null,
          planPrice: settings.planPrice,
        }}
      />
    </div>
  );
}
