import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatTHB } from "@/lib/format";

export const metadata: Metadata = { title: "แดชบอร์ดแอดมิน" };

export default async function AdminDashboardPage() {
  const [totalAccounts, available, reserved, sold, totalOrders, pendingOrders, revenue] = await Promise.all([
    prisma.gameAccount.count(),
    prisma.gameAccount.count({ where: { status: "AVAILABLE" } }),
    prisma.gameAccount.count({ where: { status: "RESERVED" } }),
    prisma.gameAccount.count({ where: { status: "SOLD" } }),
    prisma.order.count(),
    prisma.order.count({ where: { paymentStatus: { in: ["PENDING", "AWAITING_VERIFICATION"] } } }),
    prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { price: true } }),
  ]);

  const stats = [
    { label: "ไอดีทั้งหมด", value: totalAccounts },
    { label: "พร้อมขาย", value: available },
    { label: "ถูกจอง", value: reserved },
    { label: "ขายแล้ว", value: sold },
    { label: "คำสั่งซื้อทั้งหมด", value: totalOrders },
    { label: "รอดำเนินการ", value: pendingOrders },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">แดชบอร์ด</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-sm text-ink-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{stat.value}</p>
          </div>
        ))}
        <div className="card p-4 sm:col-span-3">
          <p className="text-sm text-ink-muted">ยอดขายรวม (ชำระเงินแล้ว)</p>
          <p className="mt-1 text-2xl font-bold text-gold">{formatTHB(revenue._sum.price ?? 0)}</p>
        </div>
      </div>
    </div>
  );
}
