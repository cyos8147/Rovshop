"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "หน้าหลัก", match: (p: string) => p === "/" },
  { href: "/sort", label: "ทำป้ายสกิน RoV", match: (p: string) => p.startsWith("/sort") },
  { href: "/#pricing", label: "ราคา", match: () => false },
  { href: "/faq", label: "คำถามที่พบบ่อย", match: (p: string) => p.startsWith("/faq") },
];

export function NavLinks() {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="hidden items-center gap-1 text-sm md:flex">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative px-3 py-2 transition ${active ? "font-semibold text-white" : "text-ink-muted hover:text-white"}`}
          >
            {item.label}
            {active ? <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-gold" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
