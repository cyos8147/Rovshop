import Link from "next/link";
import { getSession } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { Logo } from "@/components/Logo";
import { prisma } from "@/lib/prisma";
import { formatCoins } from "@/lib/coins";

export async function Header() {
  const session = await getSession();
  const member =
    session?.user?.role === "MEMBER"
      ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { coinCents: true } })
      : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="Oscar Gaming images — หน้าแรก">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
          <Link href="/sort" className="transition hover:text-gold">
            ทำป้ายขายไอดี
          </Link>
          <Link href="/#pricing" className="transition hover:text-gold">
            ราคา
          </Link>
          <Link href="/accounts" className="transition hover:text-gold">
            ไอดีขายจากร้าน
          </Link>
          <Link href="/faq" className="transition hover:text-gold">
            คำถามที่พบบ่อย
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
        ) : session?.user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              aria-label="บัญชีของฉัน / เติมคอยน์"
              className="btn-secondary flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-sm"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-[10px] font-black text-[#2a1b05]">
                C
              </span>
              <span className="font-bold text-gold">{formatCoins(member?.coinCents ?? 0)}</span>
              <span className="text-ink-muted">คอยน์</span>
            </Link>
            {/* On phones sign-out lives on /account to keep the header on one line. */}
            <span className="hidden sm:inline">
              <SignOutButton />
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm text-ink-muted transition hover:text-gold sm:inline">
              เข้าสู่ระบบ
            </Link>
            <Link href="/sort" className="btn-primary whitespace-nowrap px-3 py-1.5 text-sm">
              ทำป้ายเลย
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
