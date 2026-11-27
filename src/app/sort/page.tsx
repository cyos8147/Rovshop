import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SkinSorter } from "@/components/SkinSorter";
import { getWallet } from "@/lib/wallet";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "เรียงสกินทำป้ายขายไอดี",
  description: "เลือกสกิน RoV ที่มี จัดเรียง แล้วสร้างเป็นภาพป้ายขายไอดีภาพเดียว ใช้ได้ทั้งมือถือและคอม จัดฟรี จ่ายเฉพาะตอนดาวน์โหลด",
};

export default async function SortPage() {
  const [heroes, wallet, settings] = await Promise.all([
    prisma.hero.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        skins: { select: { id: true, name: true, tier: true, imageUrl: true } },
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
          เรียงสกิน <span className="text-gold">ทำป้ายขายไอดี</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          เลือกสกินที่มี → จัดเรียง → ได้ภาพเดียวพร้อมโพสต์ · จัดและดูตัวอย่างฟรี จ่ายตอนดาวน์โหลด ·{" "}
          {heroes.length} ฮีโร่ · {skinCount.toLocaleString("th-TH")} สกินในคลัง
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
