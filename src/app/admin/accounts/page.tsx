import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatTHB } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { primaryImage } from "@/lib/images";
import type { AccountStatus } from "@/lib/types";

export const metadata: Metadata = { title: "จัดการไอดี" };

export default async function AdminAccountsPage() {
  const accounts = await prisma.gameAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      _count: { select: { orders: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">จัดการไอดี</h1>
        <Link href="/admin/accounts/new" className="btn-primary">
          + เพิ่มไอดีใหม่
        </Link>
      </div>

      <div className="mt-6 space-y-2">
        {accounts.map((account) => (
          <div key={account.id} className="card flex flex-wrap items-center gap-4 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryImage(account.images, account.title)}
              alt={account.title}
              className="h-14 w-20 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{account.title}</p>
              <p className="text-xs text-ink-muted">
                แรงค์{account.rank} · {formatTHB(account.discountPrice ?? account.price)} · สั่งซื้อแล้ว{" "}
                {account._count.orders} ครั้ง
              </p>
            </div>
            <StatusBadge status={account.status as AccountStatus} />
            <Link href={`/admin/accounts/${account.id}/edit`} className="btn-secondary px-4 py-2 text-sm">
              แก้ไข
            </Link>
          </div>
        ))}
        {accounts.length === 0 ? <p className="py-10 text-center text-ink-muted">ยังไม่มีไอดีในระบบ</p> : null}
      </div>
    </div>
  );
}
