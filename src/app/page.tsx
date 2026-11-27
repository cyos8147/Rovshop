import { existsSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatCoins } from "@/lib/coins";

// Decorative tiles for the hero mock-up of a banner.
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

const MOCK_TILES = Array.from({ length: 12 }, (_, i) => i);
const TILE_STYLES = [
  "border-violet/60 bg-gradient-to-br from-violet/60 to-[#1a1740]",
  "border-sky-400/50 bg-gradient-to-br from-sky-500/40 to-[#14223d]",
  "border-rose-400/50 bg-gradient-to-br from-rose-500/40 to-[#2a1530]",
  "border-gold/50 bg-gradient-to-br from-gold/40 to-[#2a2112]",
];

export default async function HomePage() {
  const [settings, skinCount, heroes, tileSkins] = await Promise.all([
    getSettings(),
    prisma.skin.count(),
    prisma.hero.findMany({
      where: { skins: { some: {} } },
      orderBy: [{ skins: { _count: "desc" } }, { name: "asc" }],
      take: 24,
      select: { id: true, name: true, _count: { select: { skins: true } } },
    }),
    // Pictures the admin added; shown in the hero mock-up when there are any.
    prisma.skin.findMany({
      where: { imageUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, name: true, imageUrl: true },
    }),
  ]);
  // Optional artwork: drop a file at public/hero-bg.jpg (or .webp/.png) to use it behind the hero.
  const heroArt =
    settings.heroArtUrl ??
    ["jpg", "webp", "png"].map((ext) => `/hero-bg.${ext}`).find((url) => existsSync(join(process.cwd(), "public", url)));

  const c = (cents: number) => formatCoins(cents);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0b0918]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {heroArt ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroArt}
                alt=""
                className="absolute inset-y-0 right-0 h-full w-full object-cover object-top md:w-[68%]"
                style={{
                  maskImage: "linear-gradient(to right, transparent 0%, #000 38%)",
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 38%)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0918] via-transparent to-[#0b0918]/40 md:from-[#0b0918]/70" />
              <div className="absolute inset-0 bg-[#0b0918]/55 md:hidden" />
            </>
          ) : (
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="shardA" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6d4df2" stopOpacity="0.55" />
                  <stop offset="1" stopColor="#2a1a6e" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="shardB" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#a78bfa" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#1a1245" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <rect width="1200" height="700" fill="#0b0918" />
              <polygon points="560,0 1200,0 1200,520 900,260" fill="url(#shardA)" />
              <polygon points="760,0 1200,0 1200,300" fill="url(#shardB)" />
              <polygon points="430,700 780,330 1000,700" fill="url(#shardB)" />
              <polygon points="1000,700 1200,420 1200,700" fill="url(#shardA)" />
              <polyline points="560,0 900,260 1200,520" fill="none" stroke="#c4b3ff" strokeOpacity="0.55" strokeWidth="1.5" />
              <polyline points="430,700 780,330 1200,0" fill="none" stroke="#a78bfa" strokeOpacity="0.35" strokeWidth="1" />
              <polyline points="1000,700 1200,420" fill="none" stroke="#c4b3ff" strokeOpacity="0.4" strokeWidth="1" />
            </svg>
          )}
          {/* curved edge into the next section */}
          <svg className="absolute inset-x-0 bottom-0 h-10 w-full text-bg" viewBox="0 0 1200 40" preserveAspectRatio="none">
            <path d="M0 40 L0 22 Q600 -6 1200 22 L1200 40 Z" fill="currentColor" />
          </svg>
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-12 sm:pt-16 md:grid-cols-[1fr_1fr]">
          <div>
            <h1 className="font-display font-extrabold uppercase leading-none text-white">
              <span className="block text-5xl tracking-[0.14em] sm:text-6xl">Oscar</span>
              <span className="mt-3 block text-xl font-medium tracking-[0.3em] text-ink/80 sm:text-2xl">Gaming Images</span>
            </h1>
            <p className="mt-5 text-lg font-bold text-ink sm:text-xl">
              ทำป้ายสกิน RoV <span className="text-gold-soft">เสร็จในไม่กี่นาที</span>
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-ink-muted">RoV · Arena of Valor</p>
            <p className="mt-4 max-w-md text-ink-muted">
              ค้นหาง่าย ภาพคมชัด เลือกสกินที่มี เลือกพื้นหลัง ใส่ข้อมูลไอดี แล้วได้ภาพเดียวพร้อมโพสต์ ไม่ต้องใช้โปรแกรมแต่งภาพ
              ใช้ได้ทั้งมือถือและคอม
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/sort" className="btn-primary px-6">
                เริ่มทำป้าย →
              </Link>
              <a href="#pricing" className="btn-secondary px-6">
                ดูราคา
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
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

          {heroArt ? (
            <div aria-hidden className="hidden min-h-[22rem] md:block" />
          ) : (
          <div aria-hidden className="relative mx-auto w-full max-w-md py-4 md:max-w-none md:px-4">
            <div className="rounded-3xl border border-violet/40 bg-[#14122c] p-4 shadow-[0_28px_48px_-16px_rgba(0,0,0,0.8)]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-bold text-ink">ตัวอย่างป้ายสกิน RoV</p>
                <p className="text-2xl font-black text-gold">฿3,990</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full bg-violet px-3 py-1 font-semibold text-white">แรงค์ เซียน</span>
                <span className="rounded-full border border-border px-3 py-1 text-ink-muted">ฮีโร่ 112</span>
                <span className="rounded-full border border-border px-3 py-1 text-ink-muted">สกิน 12</span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-1.5">
                {MOCK_TILES.map((i) => {
                  const skin = tileSkins[i];
                  return (
                    <div
                      key={i}
                      className={`relative aspect-[4/5] overflow-hidden rounded-lg border ${TILE_STYLES[i % TILE_STYLES.length]}`}
                    >
                      {skin?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={skin.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <>
                          <span className="absolute inset-x-0 bottom-0 h-1/4 bg-black/40" />
                          <span className="absolute bottom-[9%] left-[12%] h-[6%] w-1/2 rounded-full bg-white/40" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-[11px] text-ink-muted">
                ทำป้ายที่ <span className="font-black text-gold">OSCAR</span> Gaming images
              </p>
            </div>
            <div className="absolute -bottom-1 right-8 rotate-2 rounded-full bg-gradient-to-r from-[#a186ff] to-gold px-4 py-2 text-xs font-black text-white shadow-[0_10px_18px_-8px_rgba(0,0,0,0.8)]">
              พร้อมโพสต์ขาย
            </div>
          </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-center text-2xl font-bold text-ink">
          ทำป้ายได้ใน <span className="text-violet-soft">4</span> ขั้นตอน
        </h2>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {STEPS.flatMap((step, index) => {
            const card = (
              <li key={step.n} className="card flex flex-col items-center p-5 text-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-violet text-sm font-bold text-violet-soft">
                  {step.n}
                </span>
                <svg viewBox="0 0 24 24" className="mt-3 h-10 w-10 text-violet-soft" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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

      {/* Latest skin pictures */}
      {tileSkins.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-2xl font-bold text-ink">สกินล่าสุด</h2>
            <Link href="/sort" className="text-sm text-gold-soft hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {tileSkins.slice(0, 6).map((skin) => (
              <li key={skin.id} className="overflow-hidden rounded-xl border border-border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={skin.imageUrl ?? ""} alt={skin.name} className="aspect-[4/5] w-full object-cover" />
                <p className="truncate px-2 py-1.5 text-xs text-ink-muted">{skin.name}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* RoV heroes in the library */}
      {heroes.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">RoV</p>
              <h2 className="mt-1 text-2xl font-bold text-ink">ฮีโร่และสกินในคลัง</h2>
            </div>
            <Link href="/sort" className="text-sm text-gold hover:underline">
              ดูทั้งหมดในหน้าทำป้าย →
            </Link>
          </div>
          <ul className="mt-5 flex flex-wrap gap-2">
            {heroes.map((hero) => (
              <li key={hero.id}>
                <Link
                  href="/sort"
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-ink transition hover:border-gold"
                >
                  {hero.name}
                  <span className="rounded-full bg-violet/25 px-1.5 text-[11px] font-semibold text-gold-soft">
                    {hero._count.skins}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">เพิ่มฮีโร่และสกินใหม่อย่างต่อเนื่อง</p>
        </section>
      ) : null}

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
