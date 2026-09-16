import Link from "next/link";
import { getSession } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-1.5 text-xl font-bold tracking-wide">
          <span className="bg-gradient-to-r from-gold to-violet bg-clip-text text-transparent">
            RoV
          </span>
          <span className="text-ink">Shop</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
          <Link href="/accounts" className="transition hover:text-gold">
            ไอดีทั้งหมด
          </Link>
          <Link href="/faq" className="transition hover:text-gold">
            คำถามที่พบบ่อย
          </Link>
          <Link href="/policy" className="transition hover:text-gold">
            นโยบาย
          </Link>
        </nav>

        {session?.user?.role === "ADMIN" ? (
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="rounded-full bg-violet px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              แอดมิน
            </Link>
            <SignOutButton />
          </div>
        ) : (
          <Link href="/accounts" className="btn-primary hidden sm:inline-block">
            ดูไอดีทั้งหมด
          </Link>
        )}
      </div>
    </header>
  );
}
