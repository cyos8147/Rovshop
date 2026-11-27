import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SkinSorter } from "@/components/SkinSorter";
import type { BannerInfo } from "@/lib/banner";

export const metadata: Metadata = {
  title: "เรียงสกินทำป้ายขายไอดี",
  description: "เลือกสกิน RoV ที่มี จัดเรียง แล้วสร้างเป็นภาพป้ายขายไอดีภาพเดียว ใช้ฟรีทั้งมือถือและคอม",
};

export default async function SortPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string | string[] }>;
}) {
  const { account: accountSlug } = await searchParams;

  const [heroes, account] = await Promise.all([
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
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          เรียงสกิน <span className="text-gold">ทำป้ายขายไอดี</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          เลือกสกินที่มี → จัดเรียง → ได้ภาพเดียวพร้อมโพสต์ ใช้ฟรี ไม่ต้องสมัครสมาชิก ·{" "}
          {heroes.length} ฮีโร่ · {skinCount.toLocaleString("th-TH")} สกินในคลัง
        </p>
      </div>
      <SkinSorter
        key={accountSlug ? String(accountSlug) : "default"}
        heroes={heroes}
        initialInfo={initialInfo}
        watermark="ทำป้ายฟรีที่ RoVShop"
      />
    </div>
  );
}
