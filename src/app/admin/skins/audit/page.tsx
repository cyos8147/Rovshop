import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fixSkinAction } from "@/lib/actions/skins";
import { SkinAudit } from "@/components/SkinAudit";

export const metadata: Metadata = { title: "ตรวจชื่อกับรูป" };

export default async function SkinAuditPage() {
  const skins = await prisma.skin.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, name: true, imageUrl: true, hero: { select: { id: true, name: true } } },
    orderBy: [{ hero: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/skins" className="text-sm text-ink-muted hover:text-gold">
          ← คลังสกิน
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">ตรวจชื่อกับรูป</h1>
        <p className="mt-1 text-sm text-ink-muted">
          อ่านชื่อที่พิมพ์อยู่ในรูปสกินแต่ละใบ และเลเวล EVO จากป้าย แล้วเทียบกับชื่อที่บันทึกไว้ แสดงเฉพาะรายการที่ไม่ตรงหรืออ่านไม่ชัด
        </p>
      </div>
      <SkinAudit
        fixAction={fixSkinAction}
        skins={skins.map((s) => ({
          id: s.id,
          name: s.name,
          imageUrl: s.imageUrl ?? "",
          heroId: s.hero.id,
          heroName: s.hero.name,
        }))}
      />
    </div>
  );
}
