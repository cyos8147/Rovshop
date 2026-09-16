"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  accountId: string;
  slug: string;
  title: string;
  price: number;
  image: string;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (accountId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        if (get().items.some((i) => i.accountId === item.accountId)) return;
        set({ items: [...get().items, item] });
      },
      removeItem: (accountId) =>
        set({ items: get().items.filter((i) => i.accountId !== accountId) }),
      clear: () => set({ items: [] }),
    }),
    { name: "rovshop-cart" }
  )
);
