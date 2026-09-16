import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatDateTime, formatTHB } from "@/lib/format";
import { PaymentStatusBadge, DeliveryStatusBadge } from "@/components/StatusBadge";
import { SlipUploadForm } from "@/components/SlipUploadForm";
import { PAYMENT_INFO } from "@/lib/payment-info";
import type { DeliveryStatus, PaymentMethod, PaymentStatus } from "@/lib/types";

export const metadata: Metadata = { title: "รายละเอียดคำสั่งซื้อ" };

export default async function OrderBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const session = await getSession();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/orders/${batchId}`);
  }

  const orders = await prisma.order.findMany({
    where: { batchId },
    include: { account: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
    orderBy: { createdAt: "asc" },
  });

  if (orders.length === 0) notFound();

  const isOwner = orders.every((order) => order.userId === session.user.id);
  if (!isOwner && session.user.role !== "ADMIN") notFound();

  const total = orders.reduce((sum, order) => sum + order.price, 0);
  const needsSlip = orders.some((order) => order.paymentStatus === "PENDING");
  const awaitingVerification = orders.some((order) => order.paymentStatus === "AWAITING_VERIFICATION");
  const paymentMethod = orders[0].paymentMethod as PaymentMethod;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink">คำสั่งซื้อ #{batchId.slice(0, 8).toUpperCase()}</h1>
      <p className="mt-1 text-sm text-ink-muted">สั่งซื้อเมื่อ {formatDateTime(orders[0].createdAt)}</p>

      <div className="mt-6 space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="card p-4">
            <div className="flex items-center gap-4">
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
                <p className="text-xs text-ink-muted">เลขที่คำสั่งซื้อ {order.orderNumber}</p>
              </div>
              <p className="font-semibold text-gold">{formatTHB(order.price)}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <PaymentStatusBadge status={order.paymentStatus as PaymentStatus} />
              <DeliveryStatusBadge status={order.deliveryStatus as DeliveryStatus} />
            </div>

            {order.paymentStatus === "PAID" ? (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
                <p className="font-semibold text-emerald-300">ข้อมูลบัญชีของคุณ</p>
                <p className="mt-2 text-ink">ยูสเซอร์: {order.account.credentialUsername ?? "-"}</p>
                <p className="text-ink">รหัสผ่าน: {order.account.credentialPassword ?? "-"}</p>
                {order.account.credentialNote ? (
                  <p className="mt-2 text-ink-muted">{order.account.credentialNote}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between rounded-2xl border border-border bg-card p-4 font-semibold">
        <span className="text-ink">ยอดรวมทั้งหมด</span>
        <span className="text-gold">{formatTHB(total)}</span>
      </div>

      {needsSlip ? (
        <>
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-ink">ชำระเงินผ่าน {PAYMENT_INFO[paymentMethod].label}</h2>
            <div className="mt-2 text-sm text-ink-muted">
              {PAYMENT_INFO[paymentMethod].lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          <SlipUploadForm batchId={batchId} />
        </>
      ) : awaitingVerification ? (
        <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300">
          ได้รับสลิปแล้ว กำลังรอแอดมินตรวจสอบการชำระเงิน โดยปกติใช้เวลาไม่เกิน 30 นาทีในเวลาทำการ
        </p>
      ) : null}

      <div className="mt-6">
        <Link href="/account" className="text-sm text-gold hover:underline">
          ← กลับไปที่ประวัติคำสั่งซื้อ
        </Link>
      </div>
    </div>
  );
}
