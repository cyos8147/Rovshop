import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatTHB } from "@/lib/format";
import { PaymentStatusBadge, DeliveryStatusBadge } from "@/components/StatusBadge";
import { markOrderPaidAction, markOrderDeliveredAction, cancelOrderAction } from "@/lib/actions/orders";
import type { DeliveryStatus, PaymentStatus } from "@/lib/types";

export const metadata: Metadata = { title: "คำสั่งซื้อ" };

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { account: true, user: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">คำสั่งซื้อ</h1>

      <div className="mt-6 space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{order.account.title}</p>
                <p className="text-xs text-ink-muted">
                  {order.orderNumber} · ผู้ซื้อ {order.user.name} ({order.user.email})
                </p>
                <p className="text-xs text-ink-muted">{formatDateTime(order.createdAt)}</p>
              </div>
              <p className="font-semibold text-gold">{formatTHB(order.price)}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <PaymentStatusBadge status={order.paymentStatus as PaymentStatus} />
              <DeliveryStatusBadge status={order.deliveryStatus as DeliveryStatus} />
            </div>

            {order.slipUrl ? (
              <a
                href={order.slipUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm text-gold hover:underline"
              >
                ดูสลิปการโอนเงิน →
              </a>
            ) : null}

            {order.buyerNote ? <p className="mt-2 text-sm text-ink-muted">หมายเหตุ: {order.buyerNote}</p> : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {order.paymentStatus !== "PAID" && order.paymentStatus !== "CANCELLED" ? (
                <form action={markOrderPaidAction.bind(null, order.id)}>
                  <button type="submit" className="btn-primary px-4 py-2 text-sm">
                    ยืนยันชำระเงินแล้ว
                  </button>
                </form>
              ) : null}
              {order.paymentStatus === "PAID" && order.deliveryStatus !== "DELIVERED" ? (
                <form action={markOrderDeliveredAction.bind(null, order.id)}>
                  <button type="submit" className="btn-secondary px-4 py-2 text-sm">
                    ทำเครื่องหมายว่าส่งมอบแล้ว
                  </button>
                </form>
              ) : null}
              {order.paymentStatus !== "CANCELLED" && order.paymentStatus !== "PAID" ? (
                <form action={cancelOrderAction.bind(null, order.id)}>
                  <button type="submit" className="btn-danger px-4 py-2 text-sm">
                    ยกเลิกคำสั่งซื้อ
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ))}
        {orders.length === 0 ? <p className="py-10 text-center text-ink-muted">ยังไม่มีคำสั่งซื้อ</p> : null}
      </div>
    </div>
  );
}
