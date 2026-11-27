import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SkinSorter } from "@/components/SkinSorter";
import type { BannerInfo } from "@/lib/banner";
import { getWallet } from "@/lib/wallet";
import { getSettings } from "@/lib/settings";
import { CrownIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "เรียงสกินทำป้ายขายไอดี",
  description: "เลือกสกิน RoV ที่มี จัดเรียง แล้วสร้างเป็นภาพป้ายขายไอดีภาพเดียว ใช้ได้ทั้งมือถือและคอม จัดฟรี จ่ายเฉพาะตอนดาวน์โหลด",
};

export default async function SortPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string | string[] }>;
}) {
  const { account: accountSlug } = await searchParams;

  const [heroes, account, wallet, settings] = await Promise.all([
    prisma.hero.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        skins: { select: { id: true, name: true, tier: true, imageUrl: true } },
      },
    }),
    typeof accountSlug === "string"
      ? prisma.gameAccount.findUnique({
          where: { slug: accountSlug },
          select: { title: true, rank: true, heroCount: true, price: true, discountPrice: true },
        })
      : null,
    getWallet(),
    getSettings(),
  ]);

  // "ทำป้ายจากไอดีนี้" link from the admin: prefill the banner details.
  const initialInfo: Partial<BannerInfo> | undefined = account
    ? {
        title: account.title.slice(0, 60),
        rank: account.rank,
        heroCount: String(account.heroCount),
        price: (account.discountPrice ?? account.price).toLocaleString("en-US"),
      }
    : undefined;

  const skinCount = heroes.reduce((sum, hero) => sum + hero.skins.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5">
      <div className="card relative mb-2 overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
        {/* soft decorative glows */}
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#ff8ad8]/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-violet/30 blur-3xl" />
        <div className="relative">
          <h1 className="text-3xl font-black italic leading-tight text-ink drop-shadow sm:text-4xl">
            เรียงสกิน{" "}
            <span className="bg-gradient-to-b from-gold-soft to-gold bg-clip-text text-transparent">ทำป้ายขายไอดี</span>
          </h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink sm:text-base">
            <CrownIcon className="shrink-0 text-gold" />
            เลือกสกินที่มี → จัดเรียง → ได้ภาพเดียวพร้อมโพสต์
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="pill">จัดและดูตัวอย่างฟรี · จ่ายตอนดาวน์โหลด</span>
            <span className="pill">
              {heroes.length} ฮีโร่ · {skinCount.toLocaleString("th-TH")} สกินในคลัง
            </span>
          </div>
        </div>
      </div>
      <SkinSorter
        key={accountSlug ? String(accountSlug) : "default"}
        heroes={heroes}
        initialInfo={initialInfo}
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
