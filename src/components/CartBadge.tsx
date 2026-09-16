"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";

export function CartBadge() {
  const [mounted, setMounted] = useState(false);
  const count = useCartStore((state) => state.items.length);

  useEffect(() => setMounted(true), []);

  if (!mounted || count === 0) return null;

  return (
    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-bg">
      {count}
    </span>
  );
}
