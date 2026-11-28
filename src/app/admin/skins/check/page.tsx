import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteHeroesAction, renameOrMergeHeroAction } from "@/lib/actions/skins";
import { HeroCheck } from "@/components/HeroCheck";

export const metadata: Metadata = { title: "ตรวจกับรายการอ้างอิง" };

export default async function HeroCheckPage() {
  const heroes = await prisma.hero.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, skins: { select: { imageUrl: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/skins" className="text-sm text-ink-muted hover:text-gold">
          ← คลังสกิน
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">ตรวจกับรายการอ้างอิง</h1>
        <p className="mt-1 text-sm text-ink-muted">
          วางรายการฮีโร่และจำนวนสกินที่ถูกต้อง (ชื่อ | จำนวน บรรทัดละฮีโร่) ระบบเทียบกับคลังและบอกว่าอันไหนขาด เกิน หรือจำนวนไม่ตรง
        </p>
      </div>
      <HeroCheck
        action={renameOrMergeHeroAction}
        deleteAction={deleteHeroesAction}
        heroes={heroes.map((h) => ({
          id: h.id,
          name: h.name,
          count: h.skins.length,
          withPicture: h.skins.filter((s) => s.imageUrl).length,
        }))}
      />
    </div>
  );
}
