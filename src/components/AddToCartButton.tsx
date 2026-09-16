"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart-store";

type Props = {
  account: {
    id: string;
    slug: string;
    title: string;
    price: number;
    image: string;
  };
  available: boolean;
};

export function AddToCartButton({ account, available }: Props) {
  const [mounted, setMounted] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const inCart = useCartStore((state) => state.items.some((item) => item.accountId === account.id));
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  if (!available) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-bg-soft px-6 py-3 font-semibold text-ink-muted"
      >
        ไอดีนี้ไม่พร้อมขายแล้ว
      </button>
    );
  }

  const disabled = mounted && inCart;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        addItem({
          accountId: account.id,
          slug: account.slug,
          title: account.title,
          price: account.price,
          image: account.image,
        });
        router.push("/cart");
      }}
      className="w-full rounded-xl bg-gold px-6 py-3 font-semibold text-bg transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
    >
      {disabled ? "อยู่ในตะกร้าแล้ว" : "สั่งซื้อทันที"}
    </button>
  );
}
