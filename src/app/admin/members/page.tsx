import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { extendMemberAction } from "@/lib/actions/membership";
import { ExtendForm } from "@/components/MembershipAdmin";
import { accessFor, daysLeft } from "@/lib/membership";

export const metadata: Metadata = { title: "สมาชิก" };

const STATE_LABEL = {
  trial: { text: "ทดลองใช้", tone: "text-gold" },
  paid: { text: "รายเดือน", tone: "text-emerald-300" },
  expired: { text: "หมดอายุ", tone: "text-rose-300" },
} as const;

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";

  const members = await prisma.user.findMany({
    where: { role: "MEMBER", ...(query ? { email: { contains: query, mode: "insensitive" } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, email: true, trialEndsAt: true, paidUntil: true, createdAt: true, role: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">สมาชิก</h1>
        <p className="mt-1 text-sm text-ink-muted">เพิ่มวันให้สมาชิกเองได้ (เช่น ชดเชย หรือรับเงินช่องทางอื่น)</p>
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={query} placeholder="ค้นหาอีเมล" className="input" />
        <button type="submit" className="btn-secondary">
          ค้นหา
        </button>
      </form>
      <div className="space-y-2">
        {members.map((m) => {
          const access = accessFor(m);
          const label = STATE_LABEL[access.state as keyof typeof STATE_LABEL];
          return (
            <div key={m.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{m.email}</p>
                <p className="text-xs text-ink-muted">
                  สมัคร {m.createdAt.toLocaleDateString("th-TH", { dateStyle: "medium" })}
                  {access.until
                    ? ` · ${access.state === "expired" ? "หมดเมื่อ" : "ถึง"} ${new Date(access.until).toLocaleDateString("th-TH", { dateStyle: "medium" })}`
                    : ""}
                  {access.state !== "expired" ? ` (เหลือ ${daysLeft(access.until)} วัน)` : ""}
                </p>
              </div>
              {label ? <span className={label.tone}>{label.text}</span> : null}
              <ExtendForm action={extendMemberAction.bind(null, m.id)} />
            </div>
          );
        })}
        {members.length === 0 ? <p className="py-6 text-center text-ink-muted">ไม่พบสมาชิก</p> : null}
      </div>
    </div>
  );
}
