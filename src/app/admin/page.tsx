import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatTHB } from "@/lib/format";
import { formatCoins } from "@/lib/coins";

export const metadata: Metadata = { title: "แดชบอร์ดแอดมิน" };

export default async function AdminDashboardPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [memberCount, activePlans, pendingPayments, monthRevenue, monthDownloads, coinsOutstanding] = await Promise.all([
    prisma.user.count({ where: { role: "MEMBER" } }),
    prisma.user.count({ where: { role: "MEMBER", paidUntil: { gt: new Date() } } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.aggregate({
      where: { status: "APPROVED", reviewedAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.download.aggregate({
      where: { createdAt: { gte: monthStart } },
      _count: true,
      _sum: { costCents: true },
    }),
    prisma.user.aggregate({ where: { role: "MEMBER" }, _sum: { coinCents: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">แดชบอร์ด</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "รายได้เดือนนี้ (เติมคอยน์)", value: formatTHB(monthRevenue._sum.amount ?? 0) },
          { label: "ดาวน์โหลดเดือนนี้", value: monthDownloads._count.toLocaleString("th-TH") },
          { label: "คอยน์ที่ใช้เดือนนี้", value: formatCoins(monthDownloads._sum.costCents ?? 0) },
          { label: "สมาชิกทั้งหมด", value: memberCount.toLocaleString("th-TH") },
          { label: "รายเดือนที่ใช้งานอยู่", value: activePlans.toLocaleString("th-TH") },
          { label: "สลิปรอตรวจ", value: pendingPayments.toLocaleString("th-TH") },
          { label: "คอยน์คงค้างของสมาชิก", value: formatCoins(coinsOutstanding._sum.coinCents ?? 0) },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-sm text-ink-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gold">{stat.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-muted">
        เพิ่มฮีโร่และสกินที่เมนู &quot;คลังสกิน&quot; · ตรวจสลิปที่เมนู &quot;การชำระเงิน&quot; · ตั้งราคา พร้อมเพย์ และช่องทางติดต่อที่เมนู
        &quot;ตั้งค่าร้าน&quot;
      </p>
    </div>
  );
}
