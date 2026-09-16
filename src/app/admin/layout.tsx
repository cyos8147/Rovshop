import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="card h-fit p-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            แผงควบคุมแอดมิน
          </p>
          <nav className="mt-3 space-y-1 text-sm">
            <Link href="/admin" className="block rounded-lg px-3 py-2 text-ink transition hover:bg-bg-soft">
              แดชบอร์ด
            </Link>
            <Link
              href="/admin/accounts"
              className="block rounded-lg px-3 py-2 text-ink transition hover:bg-bg-soft"
            >
              จัดการไอดี
            </Link>
            <Link href="/admin/orders" className="block rounded-lg px-3 py-2 text-ink transition hover:bg-bg-soft">
              คำสั่งซื้อ
            </Link>
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
