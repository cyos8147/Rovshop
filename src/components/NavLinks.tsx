"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ITEMS = [
  { href: "/", label: "หน้าหลัก", match: (p: string) => p === "/" },
  { href: "/sort", label: "ทำป้ายสกิน RoV", match: (p: string) => p.startsWith("/sort") },
  { href: "/#pricing", label: "ราคา", match: () => false },
  { href: "/faq", label: "คำถามที่พบบ่อย", match: (p: string) => p.startsWith("/faq") },
];

export function NavLinks({ guest = false }: { guest?: boolean }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  // Close the folded menu after going to another page.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <nav className="hidden items-center gap-1 text-sm lg:flex">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative px-3 py-2 transition ${active ? "font-semibold text-ink" : "text-ink-muted hover:text-ink"}`}
            >
              {item.label}
              {active ? <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-gold" /> : null}
            </Link>
          );
        })}
      </nav>

      {/* Narrower screens: a folding menu */}
      <div className="relative order-last lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="เมนู"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        {open ? (
          <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-border bg-bg-soft p-1.5 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.8)]">
            {[...ITEMS, ...(guest ? [{ href: "/login", label: "เข้าสู่ระบบ", match: (p: string) => p.startsWith("/login") }] : [])].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm ${
                  item.match(pathname) ? "bg-card font-semibold text-ink" : "text-ink-muted hover:bg-card hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
