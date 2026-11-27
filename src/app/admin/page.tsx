import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatTHB } from "@/lib/format";
import { formatCoins } from "@/lib/coins";

export const metadata: Metadata = { title: "แดชบอร์ดแอดมิน" };

export default async function AdminDashboardPage() {
  const [totalAccounts, available, reserved, soldAccounts] = await Promise.all([
    prisma.gameAccount.count(),
    prisma.gameAccount.count({ where: { status: "AVAILABLE" } }),
    prisma.gameAccount.count({ where: { status: "RESERVED" } }),
    prisma.gameAccount.findMany({
      where: { status: "SOLD" },
      select: { price: true, discountPrice: true },
    }),
  ]);

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

  const soldValue = soldAccounts.reduce((sum, account) => sum + (account.discountPrice ?? account.price), 0);

  const stats = [
    { label: "ไอดีทั้งหมด", value: totalAccounts },
    { label: "พร้อมขาย", value: available },
    { label: "ถูกจองแล้ว", value: reserved },
    { label: "ขายแล้ว", value: soldAccounts.length },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">แดชบอร์ด</h1>
      <h2 className="mt-6 font-semibold text-ink">เว็บทำป้าย</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
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
      <h2 className="mt-8 font-semibold text-ink">ร้านขายไอดี</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-sm text-ink-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="card mt-4 p-4">
        <p className="text-sm text-ink-muted">มูลค่ารวมไอดีที่ขายแล้ว (ประเมินจากราคาที่ตั้งไว้)</p>
        <p className="mt-1 text-2xl font-bold text-gold">{formatTHB(soldValue)}</p>
      </div>
      <p className="mt-6 text-sm text-ink-muted">
        เพิ่ม/แก้ไขไอดีได้ที่เมนู &quot;จัดการไอดี&quot; และแก้ลิงก์แชท Facebook ได้ที่เมนู &quot;ตั้งค่าร้าน&quot; ด้านซ้าย
        เมื่อขายไอดีได้แล้วอย่าลืมกลับมาเปลี่ยนสถานะเป็น &quot;ขายแล้ว&quot; ที่หน้าแก้ไขไอดีนั้นๆ
      </p>
    </div>
  );
}
