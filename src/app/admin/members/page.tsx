import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { adjustCoinsAction } from "@/lib/actions/membership";
import { CoinAdjustForm } from "@/components/MembershipAdmin";
import { formatCoins } from "@/lib/coins";

export const metadata: Metadata = { title: "สมาชิก" };

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";

  const members = await prisma.user.findMany({
    where: { role: "MEMBER", ...(query ? { email: { contains: query, mode: "insensitive" } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, email: true, coinCents: true, createdAt: true, _count: { select: { downloads: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">สมาชิก</h1>
        <p className="mt-1 text-sm text-ink-muted">
          เพิ่มคอยน์ให้สมาชิกเองได้ (เช่น ชดเชย หรือรับเงินช่องทางอื่น) ใส่ติดลบเพื่อหักคอยน์
        </p>
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={query} placeholder="ค้นหาอีเมล" className="input" />
        <button type="submit" className="btn-secondary">
          ค้นหา
        </button>
      </form>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{m.email}</p>
              <p className="text-xs text-ink-muted">
                สมัคร {m.createdAt.toLocaleDateString("th-TH", { dateStyle: "medium" })} · ดาวน์โหลด {m._count.downloads} ครั้ง
              </p>
            </div>
            <span className="font-semibold text-gold">{formatCoins(m.coinCents)} คอยน์</span>
            <CoinAdjustForm action={adjustCoinsAction.bind(null, m.id)} />
          </div>
        ))}
        {members.length === 0 ? <p className="py-6 text-center text-ink-muted">ไม่พบสมาชิก</p> : null}
      </div>
    </div>
  );
}
