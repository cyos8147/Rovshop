"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { formatTHB } from "@/lib/format";

export function CartView() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="mt-8 h-40 animate-pulse rounded-2xl border border-border bg-card" />;
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-ink-muted">ตะกร้าของคุณว่างเปล่า</p>
        <Link href="/accounts" className="btn-primary mt-4 inline-block">
          เลือกซื้อไอดี
        </Link>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {items.map((item) => (
          <div key={item.accountId} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt={item.title} className="h-20 w-28 rounded-xl object-cover" />
            <div className="flex-1">
              <Link href={`/accounts/${item.slug}`} className="font-medium text-ink hover:text-gold">
                {item.title}
              </Link>
              <p className="mt-1 text-gold">{formatTHB(item.price)}</p>
            </div>
            <button type="button" onClick={() => removeItem(item.accountId)} className="btn-danger px-3 py-2 text-sm">
              ลบ
            </button>
          </div>
        ))}
      </div>

      <div className="h-fit rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold text-ink">สรุปคำสั่งซื้อ</h2>
        <div className="mt-3 flex justify-between text-sm text-ink-muted">
          <span>จำนวน {items.length} รายการ</span>
          <span>{formatTHB(total)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-3 font-semibold text-ink">
          <span>ยอดรวม</span>
          <span className="text-gold">{formatTHB(total)}</span>
        </div>
        <Link href="/checkout" className="btn-primary mt-4 block">
          ดำเนินการชำระเงิน
        </Link>
      </div>
    </div>
  );
}
