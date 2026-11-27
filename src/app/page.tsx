import { LogoImage } from "@/components/Logo";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatCoins } from "@/lib/coins";

// Decorative tiles for the hero mock-up of a banner.
const MOCK_TILES = Array.from({ length: 12 }, (_, i) => i);
const TILE_STYLES = [
  "border-violet/60 bg-gradient-to-br from-violet/60 to-[#1a1740]",
  "border-sky-400/50 bg-gradient-to-br from-sky-500/40 to-[#14223d]",
  "border-rose-400/50 bg-gradient-to-br from-rose-500/40 to-[#2a1530]",
  "border-gold/50 bg-gradient-to-br from-gold/40 to-[#2a2112]",
];

export default async function HomePage() {
  const [settings, skinCount, heroes] = await Promise.all([
    getSettings(),
    prisma.skin.count(),
    prisma.hero.findMany({
      where: { skins: { some: {} } },
      orderBy: [{ skins: { _count: "desc" } }, { name: "asc" }],
      take: 24,
      select: { id: true, name: true, _count: { select: { skins: true } } },
    }),
  ]);

  const c = (cents: number) => formatCoins(cents);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-bg">
        {/* Background: a crisp diagonal "stage" behind the banner, a dot grid and thin gold lines. No glows. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-y-0 right-0 w-full bg-[#12112a] md:w-[56%]"
            style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
          >
            <div
              className="absolute inset-0 opacity-[0.16]"
              style={{
                backgroundImage: "radial-gradient(#a78bfa 1px, transparent 1.2px)",
                backgroundSize: "22px 22px",
              }}
            />
          </div>
          <div
            className="absolute inset-y-0 right-0 hidden w-[56%] md:block"
            style={{
              clipPath: "polygon(18% 0, calc(18% + 3px) 0, 3px 100%, 0 100%)",
              background: "linear-gradient(180deg, #e8b64a, #e8b64a 40%, #7c5cff)",
            }}
          />
          <div className="absolute left-0 top-0 h-1 w-40 bg-gold" />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 md:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="mb-4">
              <LogoImage />
            </div>
            <p className="inline-block rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-soft">
              สำหรับเกม RoV · จัดฟรี · จ่ายเมื่อดาวน์โหลด · หรือรายเดือนไม่จำกัด
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-ink sm:text-5xl">
              ทำป้ายสกิน RoV
              <br />
              <span className="bg-gradient-to-r from-gold-soft to-gold bg-clip-text text-transparent">
                เสร็จในไม่กี่นาที
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-ink-muted md:max-w-sm lg:max-w-xl">
              ติ๊กสกินที่มี เลือกพื้นหลัง ใส่ข้อมูลไอดี ราคา ช่องทางติดต่อ แล้วได้ภาพเดียวพร้อมโพสต์ขาย
              ไม่ต้องใช้โปรแกรมแต่งภาพ ใช้ได้ทั้งมือถือและคอม
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sort" className="btn-primary px-6">
                เริ่มทำป้าย →
              </Link>
              <a href="#pricing" className="btn-secondary px-6">
                ดูราคา
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
              <li>• {skinCount.toLocaleString("th-TH")} สกินในคลัง</li>
              <li>• 4 ธีมสี</li>
              <li>• {c(settings.skinPriceCents)} คอยน์/สกิน</li>
            </ul>
          </div>

          <div aria-hidden className="relative mx-auto w-full max-w-md py-6 md:max-w-none md:px-6">
            {/* Cards stacked behind the main one */}
            <div className="card absolute inset-x-8 top-2 bottom-8 -rotate-6 border-violet/30 bg-[#1b1840] md:inset-x-12" />
            <div className="card absolute inset-x-10 top-4 bottom-6 rotate-[-2.5deg] border-gold/20 bg-[#16152e] md:inset-x-14" />

          <div className="card relative z-10 rotate-1 border-gold/30 bg-card p-4 shadow-[0_28px_48px_-16px_rgba(0,0,0,0.75)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-ink">ตัวอย่างป้ายสกิน RoV</p>
                <div className="mt-2 flex gap-1.5 text-[11px]">
                  {["แรงค์ เซียน", "ฮีโร่ 112", "สกิน 12"].map((t) => (
                    <span key={t} className="rounded-full border border-gold/40 px-2 py-0.5 text-gold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-2xl font-black text-gold">฿3,990</p>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-1.5">
              {MOCK_TILES.map((i) => (
                <div
                  key={i}
                  className={`relative aspect-[4/5] overflow-hidden rounded-lg border ${TILE_STYLES[i % TILE_STYLES.length]}`}
                >
                  <span className="absolute inset-x-0 bottom-0 h-1/4 bg-black/40" />
                  <span className="absolute bottom-[9%] left-[12%] h-[6%] w-1/2 rounded-full bg-white/40" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-right text-[11px] text-ink-muted">
              ทำป้ายที่ <span className="font-black text-gold">OSCAR</span> Gaming images
            </p>
          </div>

            {/* Floating badges around the banner */}
            <div className="absolute -right-1 top-2 z-20 rotate-6 rounded-full border border-gold bg-bg px-3 py-1.5 text-xs font-bold text-gold shadow-[0_8px_16px_-6px_rgba(0,0,0,0.7)] sm:-right-3">
              ✓ ไม่มีลายน้ำ
            </div>
            <div className="absolute -left-1 top-1/2 z-20 -rotate-6 rounded-xl border border-violet/60 bg-bg px-3 py-2 text-xs font-semibold text-ink shadow-[0_8px_16px_-6px_rgba(0,0,0,0.7)] sm:-left-3">
              <span className="text-gold">4</span> ขั้นตอน
              <span className="block text-[10px] font-normal text-ink-muted">เสร็จในไม่กี่นาที</span>
            </div>
            <div className="absolute -bottom-1 right-6 z-20 rotate-3 rounded-full bg-gradient-to-r from-gold-soft to-gold px-3.5 py-1.5 text-xs font-black text-[#2a1b05] shadow-[0_8px_16px_-6px_rgba(0,0,0,0.7)]">
              พร้อมโพสต์ขาย
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-2xl font-bold text-ink">ทำป้ายได้ใน 4 ขั้นตอน</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "1", title: "เลือกสกิน", desc: "ค้นหาชื่อฮีโร่หรือสกิน กดเลือกสกินที่มี และเรียงลำดับเองได้ตามใจ" },
            { n: "2", title: "เลือกพื้นหลัง", desc: "อัปโหลดรูปของคุณตัดให้พอดีหัวป้าย หรือเลือกธีมสีที่มีให้" },
            { n: "3", title: "ข้อมูลไอดี", desc: "ใส่รหัสไอดี จำนวนฮีโร่/สกิน แรงค์ ราคา และช่องทางติดต่อ" },
            { n: "4", title: "ชำระเงิน / ดาวน์โหลด", desc: "ดูราคาก่อนจ่าย แล้วได้ภาพ PNG คมชัดพร้อมโพสต์ขาย" },
          ].map((step) => (
            <div key={step.n} className="card p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-bold text-bg">
                {step.n}
              </span>
              <h3 className="mt-3 font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

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
