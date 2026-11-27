import { LogoImage } from "@/components/Logo";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatCoins } from "@/lib/coins";

// Decorative tiles for the hero mock-up of a banner.
const MOCK_TILES = Array.from({ length: 12 }, (_, i) => i);

export default async function HomePage() {
  const [settings, skinCount] = await Promise.all([getSettings(), prisma.skin.count()]);

  const c = (cents: number) => formatCoins(cents);

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient relative overflow-hidden">
        {/* Background: soft glows, a faint grid, and a fade into the page. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-violet/25 blur-3xl" />
          <div className="absolute -right-24 top-24 h-[28rem] w-[28rem] rounded-full bg-gold/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "radial-gradient(ellipse at 70% 40%, #000 20%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at 70% 40%, #000 20%, transparent 75%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 md:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="mb-4">
              <LogoImage />
            </div>
            <p className="inline-block rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-soft">
              จัดฟรี · จ่ายเมื่อดาวน์โหลด · หรือรายเดือนไม่จำกัด
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-ink sm:text-5xl">
              ทำป้ายขายไอดี
              <br />
              <span className="bg-gradient-to-r from-gold-soft to-gold bg-clip-text text-transparent">
                เสร็จในไม่กี่นาที
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-ink-muted">
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
            <div className="card absolute inset-x-8 top-2 bottom-8 -rotate-6 border-violet/30 bg-gradient-to-br from-violet/20 to-card opacity-70 md:inset-x-12" />
            <div className="card absolute inset-x-10 top-4 bottom-6 rotate-[-2.5deg] border-gold/20 bg-card/80 opacity-80 md:inset-x-14" />

          <div className="card relative z-10 rotate-1 bg-card p-4 shadow-goldGlow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-ink">ขายไอดีเซียน สกินเพียบ</p>
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
                  className="aspect-[4/5] rounded-lg border-2 border-violet/50 bg-gradient-to-br from-violet/40 to-bg-soft"
                />
              ))}
            </div>
            <p className="mt-3 text-right text-[11px] text-ink-muted">
              ทำป้ายที่ <span className="font-black text-gold">OSCAR</span> Gaming images
            </p>
          </div>

            {/* Floating badges around the banner */}
            <div className="absolute -right-1 top-2 z-20 rotate-6 rounded-full border border-gold/50 bg-bg/90 px-3 py-1.5 text-xs font-bold text-gold shadow-goldGlow backdrop-blur sm:-right-3">
              ✓ ไม่มีลายน้ำ
            </div>
            <div className="absolute -left-1 top-1/2 z-20 -rotate-6 rounded-xl border border-violet/50 bg-bg/90 px-3 py-2 text-xs font-semibold text-ink shadow-lg backdrop-blur sm:-left-3">
              <span className="text-gold">4</span> ขั้นตอน
              <span className="block text-[10px] font-normal text-ink-muted">เสร็จในไม่กี่นาที</span>
            </div>
            <div className="absolute -bottom-1 right-6 z-20 rotate-3 rounded-full bg-gradient-to-r from-gold-soft to-gold px-3.5 py-1.5 text-xs font-black text-[#2a1b05] shadow-goldGlow">
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
