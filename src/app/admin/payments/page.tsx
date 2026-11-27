import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { approvePaymentAction, rejectPaymentAction } from "@/lib/actions/membership";
import { ReviewButtons } from "@/components/MembershipAdmin";
import { signedSlipUrl } from "@/lib/uploads";
import { formatTHB } from "@/lib/format";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/lib/types";

export const metadata: Metadata = { title: "การชำระเงิน" };

function dateTime(d: Date) {
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminPaymentsPage() {
  const [pending, recent] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { email: true } } },
    }),
    prisma.payment.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { email: true } } },
    }),
  ]);

  // Short-lived signed links to the private slip images.
  const slipUrls = await Promise.all(pending.map((p) => (p.slipPath ? signedSlipUrl(p.slipPath) : null)));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">การชำระเงิน</h1>
        <p className="mt-1 text-sm text-ink-muted">
          สลิปที่ตรวจอัตโนมัติผ่านจะอนุมัติเองทันที รายการด้านล่างคือสลิปที่ต้องตรวจด้วยตัวเอง (เทียบกับแอปธนาคาร)
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-ink">รอตรวจสอบ ({pending.length})</h2>
        <div className="space-y-3">
          {pending.map((p, i) => (
            <div key={p.id} className="card flex flex-wrap items-start gap-4 p-4">
              {slipUrls[i] ? (
                <a href={slipUrls[i]!} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slipUrls[i]!} alt="สลิป" className="h-40 w-28 rounded-lg object-cover" />
                </a>
              ) : (
                <div className="flex h-40 w-28 items-center justify-center rounded-lg bg-bg-soft text-center text-xs text-ink-muted">
                  ไม่มีรูปสลิป
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <p className="font-medium text-ink">{p.user.email}</p>
                <p className="text-ink-muted">
                  {formatTHB(p.amount)} · {p.days} วัน · ส่งเมื่อ {dateTime(p.createdAt)}
                </p>
                {p.note ? <p className="text-xs text-ink-muted">{p.note}</p> : null}
              </div>
              <ReviewButtons
                approve={approvePaymentAction.bind(null, p.id)}
                reject={rejectPaymentAction.bind(null, p.id)}
              />
            </div>
          ))}
          {pending.length === 0 ? <p className="py-6 text-center text-ink-muted">ไม่มีรายการรอตรวจ</p> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-ink">ล่าสุด</h2>
        <div className="space-y-2">
          {recent.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-ink">{p.user.email}</span>
              <span className="text-ink-muted">{formatTHB(p.amount)}</span>
              <span className="text-ink-muted">{dateTime(p.createdAt)}</span>
              {p.senderName ? <span className="text-ink-muted">จาก {p.senderName}</span> : null}
              <span className={p.status === "APPROVED" ? "text-emerald-300" : "text-rose-300"}>
                {PAYMENT_STATUS_LABELS[p.status as PaymentStatus] ?? p.status}
              </span>
            </div>
          ))}
          {recent.length === 0 ? <p className="py-6 text-center text-ink-muted">ยังไม่มีรายการ</p> : null}
        </div>
      </section>
    </div>
  );
}
