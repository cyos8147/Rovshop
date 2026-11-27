import { existsSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatCoins } from "@/lib/coins";
import { LogoMark } from "@/components/Logo";
import { BrandBackdrop } from "@/components/BrandBackdrop";

const STEPS = [
  {
    n: "1",
    title: "เลือกสกิน",
    desc: "ค้นหาชื่อฮีโร่หรือสกิน กดเลือกสกินที่มี และเรียงลำดับเองได้",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="M21 16l-5-5-9 9" />
      </>
    ),
  },
  {
    n: "2",
    title: "เลือกพื้นหลัง",
    desc: "อัปโหลดรูปของคุณตัดให้พอดีหัวป้าย หรือเลือกธีมสี",
    icon: (
      <>
        <path d="M12 3a9 9 0 100 18c1.4 0 2-.9 2-1.8 0-1.2-1-1.6-1-2.7 0-1 .8-1.5 1.8-1.5H17a4 4 0 004-4c0-4.4-4-8-9-8z" />
        <circle cx="7.5" cy="11" r="1" />
        <circle cx="10.5" cy="7" r="1" />
        <circle cx="15" cy="7.5" r="1" />
      </>
    ),
  },
  {
    n: "3",
    title: "ข้อมูลไอดี",
    desc: "ใส่รหัสไอดี จำนวนฮีโร่/สกิน แรงค์ ราคา และช่องทางติดต่อ",
    icon: (
      <>
        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
  },
  {
    n: "4",
    title: "ชำระเงิน / ดาวน์โหลด",
    desc: "ดูราคาก่อนจ่าย แล้วได้ภาพ PNG คมชัดพร้อมโพสต์",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.8 2.8L16.5 9.5" />
      </>
    ),
  },
];

export default async function HomePage() {
  const [settings, skinCount, heroes] = await Promise.all([
    getSettings(),
    prisma.skin.count(),
    prisma.hero.findMany({
      where: { skins: { some: {} } },
      orderBy: [{ skins: { _count: "desc" } }, { name: "asc" }],
      take: 6,
      select: {
        id: true,
        name: true,
        _count: { select: { skins: true } },
        // One picture of this hero's skins (added by the admin), for the card.
        skins: { where: { imageUrl: { not: null } }, take: 1, select: { imageUrl: true } },
      },
    }),
  ]);
  // Optional artwork: set in /admin/settings, or drop a file at public/hero-bg.jpg (.webp/.png).
  const heroArt =
    settings.heroArtUrl ??
    ["jpg", "webp", "png"].map((ext) => `/hero-bg.${ext}`).find((url) => existsSync(join(process.cwd(), "public", url)));

  const c = (cents: number) => formatCoins(cents);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <BrandBackdrop />
        {heroArt ? (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroArt}
              alt=""
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-top md:w-[62%]"
              style={{
                maskImage: "linear-gradient(to right, transparent 0%, #000 40%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 40%)",
              }}
            />
            <div className="absolute inset-0 bg-[#09061a]/55 md:hidden" />
          </div>
        ) : (
          <LogoMark className="pointer-events-none absolute right-[9%] top-1/2 hidden h-72 w-72 -translate-y-1/2 opacity-[0.16] md:block" />
        )}

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="font-display font-extrabold uppercase leading-none">
            <span className="block bg-gradient-to-b from-[#e3ddf6] to-[#a898d8] bg-clip-text text-5xl tracking-[0.16em] text-transparent sm:text-7xl">
              Oscar
            </span>
            <span className="mt-3 block text-xl font-medium tracking-[0.34em] text-ink/80 sm:text-3xl">Gaming Images</span>
          </h1>
          <p className="mt-8 text-xl font-bold text-ink sm:text-2xl">ทำป้ายสกิน RoV เสร็จในไม่กี่นาที</p>
          <p className="mt-1 max-w-md text-ink-muted">
            เลือกสกิน เลือกพื้นหลัง ใส่ข้อมูลไอดี แล้วได้ภาพเดียวพร้อมโพสต์ ค้นหาง่าย ภาพคมชัด ใช้ได้ทั้งมือถือและคอม
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/sort" className="btn-primary rounded-full px-7">
              เริ่มทำป้าย →
            </Link>
            <Link href="/sort" className="btn-secondary rounded-full px-7">
              ดูสกินทั้งหมด
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            {[
              `${skinCount.toLocaleString("th-TH")} สกินในคลัง`,
              "4 ธีมสี",
              `${c(settings.skinPriceCents)} คอยน์/สกิน`,
            ].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet text-[10px] text-white">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Heroes in the library */}
      {heroes.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pt-10">
          <div className="flex items-center gap-4">
            <h2 className="whitespace-nowrap text-xl font-bold text-ink">ฮีโร่ในคลัง</h2>
            <span className="h-px flex-1 bg-border" />
            <Link href="/sort" className="whitespace-nowrap text-sm text-gold-soft hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {heroes.map((hero) => (
              <li key={hero.id}>
                <Link
                  href="/sort"
                  className="relative block aspect-[4/3] overflow-hidden rounded-xl border border-border bg-gradient-to-br from-violet/30 to-card transition hover:border-gold"
                >
                  {hero.skins[0]?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero.skins[0].imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-8">
                    <span className="block truncate text-sm font-semibold text-ink">{hero.name}</span>
                    <span className="text-[11px] text-ink-muted">{hero._count.skins} สกิน</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-center gap-4">
          <h2 className="whitespace-nowrap text-xl font-bold text-ink">
            ทำป้ายได้ใน <span className="text-gold-soft">4</span> ขั้นตอน
          </h2>
          <span className="h-px flex-1 bg-border" />
        </div>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {STEPS.flatMap((step, index) => {
            const card = (
              <li key={step.n} className="card flex flex-col items-center p-5 text-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gold text-sm font-bold text-gold-soft">
                  {step.n}
                </span>
                <svg viewBox="0 0 24 24" className="mt-3 h-10 w-10 text-gold-soft" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {step.icon}
                </svg>
                <h3 className="mt-3 font-semibold text-ink">{step.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{step.desc}</p>
              </li>
            );
            return index < STEPS.length - 1
              ? [card, <li key={`a${step.n}`} aria-hidden className="hidden items-center text-ink-muted lg:flex">→</li>]
              : [card];
          })}
        </ol>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">จ่ายเมื่อดาวน์โหลด หรือรายเดือนไม่จำกัด</h2>
        <p className="mt-2 text-sm text-ink-muted">
          จัดเรียงจนพอใจก่อนแล้วค่อยจ่าย ราคาคิดตามจำนวนสกินในภาพ · ร้านที่ทำป้ายทุกวันเลือกรายเดือนคุ้มกว่า
        </p>
        <div className="card mt-8 grid overflow-hidden p-0 sm:grid-cols-2">
          {[
            { price: "ฟรี", label: "เลือกสกิน จัดเรียง และดูตัวอย่าง" },
            { price: `${c(settings.skinPriceCents)} คอยน์`, label: "RoV · ต่อสกิน", gold: true },
            { price: "ฟรี", label: "ตกแต่งป้าย (พื้นหลัง ข้อมูลไอดี ราคา ช่องทางติดต่อ)" },
            {
              price: `+${c(settings.noWatermarkCents)} คอยน์`,
              label: "ไม่มีลายน้ำ OSCAR · แสดงราคาก่อนชำระทุกครั้ง",
            },
            { price: "ฟรี", label: "ดาวน์โหลดซ้ำป้ายเดิม" },
            ...(settings.planPrice > 0
              ? [{ price: `${settings.planPrice} คอยน์`, label: `รายเดือน ${settings.planDays} วัน · ดาวน์โหลดไม่จำกัด รวมไม่มีลายน้ำ`, gold: true }]
              : []),
            settings.signupBonusCents > 0
              ? { price: `${c(settings.signupBonusCents)} คอยน์`, label: "แจกฟรีเมื่อสมัครสมาชิก", gold: true }
              : { price: "ไม่หมดอายุ", label: "คอยน์ที่เติมไว้ใช้ได้ตลอด" },
            { price: "1 บาท = 1 คอยน์", label: `เติมผ่านพร้อมเพย์ ขั้นต่ำ ${settings.minTopup} บาท` },
          ].map((item, i) => (
            <div
              key={i}
              className="border-b border-border p-6 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <p className={`text-2xl font-bold ${item.gold ? "text-gold" : "text-ink"}`}>{item.price}</p>
              <p className="mt-1 text-sm text-ink-muted">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/sort" className="btn-primary px-6">
            เริ่มจัดป้ายฟรี →
          </Link>
          <Link href="/account" className="btn-secondary px-6">
            เติมคอยน์
          </Link>
        </div>
      </section>
    </div>
  );
}
