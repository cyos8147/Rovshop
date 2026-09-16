import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatDateTime, formatTHB } from "@/lib/format";
import { PaymentStatusBadge, DeliveryStatusBadge } from "@/components/StatusBadge";
import type { DeliveryStatus, PaymentStatus } from "@/lib/types";

export const metadata: Metadata = { title: "บัญชีของฉัน" };

export default async function AccountPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { account: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink">บัญชีของฉัน</h1>

      <div className="card mt-4 p-5">
        <p className="text-ink">
          <span className="text-ink-muted">ชื่อ:</span> {session.user.name}
        </p>
        <p className="mt-1 text-ink">
          <span className="text-ink-muted">อีเมล:</span> {session.user.email}
        </p>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-ink">ประวัติคำสั่งซื้อ</h2>

      {orders.length === 0 ? (
        <div className="card mt-4 p-10 text-center">
          <p className="text-ink-muted">คุณยังไม่มีคำสั่งซื้อ</p>
          <Link href="/accounts" className="btn-primary mt-4 inline-block">
            เลือกซื้อไอดี
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.batchId ?? order.orderNumber}`}
              className="card flex items-center gap-4 p-4 transition hover:border-violet/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  order.account.images[0]?.url ??
                  `/api/placeholder?text=${encodeURIComponent(order.account.title)}`
                }
                alt={order.account.title}
                className="h-16 w-24 rounded-lg object-cover"
              />
              <div className="flex-1">
                <p className="font-medium text-ink">{order.account.title}</p>
                <p className="text-xs text-ink-muted">
                  {order.orderNumber} · {formatDateTime(order.createdAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <PaymentStatusBadge status={order.paymentStatus as PaymentStatus} />
                  <DeliveryStatusBadge status={order.deliveryStatus as DeliveryStatus} />
                </div>
              </div>
              <p className="font-semibold text-gold">{formatTHB(order.price)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
