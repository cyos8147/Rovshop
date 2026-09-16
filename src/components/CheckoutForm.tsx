"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart-store";
import { formatTHB } from "@/lib/format";
import { checkoutAction } from "@/lib/actions/orders";
import { PAYMENT_INFO } from "@/lib/payment-info";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/types";

export function CheckoutForm() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [buyerNote, setBuyerNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="mt-8 h-40 animate-pulse rounded-2xl border border-border bg-card" />;
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-ink-muted">ยังไม่มีสินค้าในตะกร้า</p>
        <Link href="/accounts" className="btn-primary mt-4 inline-block">
          เลือกซื้อไอดี
        </Link>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + item.price, 0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await checkoutAction({
      accountIds: items.map((item) => item.accountId),
      paymentMethod,
      buyerNote,
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.batchId) {
      clear();
      router.push(`/orders/${result.batchId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="card p-5">
          <h2 className="font-semibold text-ink">รายการสั่งซื้อ</h2>
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <div key={item.accountId} className="flex justify-between text-sm">
                <span className="text-ink-muted">{item.title}</span>
                <span className="text-ink">{formatTHB(item.price)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-ink">ช่องทางชำระเงิน</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  paymentMethod === method
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border text-ink-muted hover:border-gold/50"
                }`}
              >
                {PAYMENT_METHOD_LABELS[method]}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-bg-soft p-4 text-sm text-ink-muted">
            {PAYMENT_INFO[paymentMethod].lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-2 text-xs">
              * หลังยืนยันคำสั่งซื้อ ระบบจะพาไปหน้าอัปโหลดสลิปโอนเงินเพื่อให้แอดมินตรวจสอบ
            </p>
          </div>
        </div>

        <div className="card p-5">
          <label className="mb-1 block text-sm font-medium text-ink">หมายเหตุถึงร้านค้า (ไม่บังคับ)</label>
          <textarea
            value={buyerNote}
            onChange={(event) => setBuyerNote(event.target.value)}
            rows={3}
            maxLength={500}
            className="input"
            placeholder="เช่น ต้องการให้ส่งไอดีทางอีเมล..."
          />
        </div>
      </div>

      <div className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold text-ink">สรุปยอดชำระ</h2>
        <div className="flex justify-between border-t border-border pt-3 font-semibold text-ink">
          <span>ยอดรวม</span>
          <span className="text-gold">{formatTHB(total)}</span>
        </div>
        {error ? <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "กำลังทำรายการ..." : "ยืนยันคำสั่งซื้อ"}
        </button>
      </div>
    </form>
  );
}
