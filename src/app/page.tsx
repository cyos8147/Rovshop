import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AccountCard } from "@/components/AccountCard";
import { RatingStars } from "@/components/RatingStars";
import { primaryImage } from "@/lib/images";
import { getSettings } from "@/lib/settings";
import { formatCoins } from "@/lib/coins";
import { SKIN_TIER_COLORS, SKIN_TIER_LABELS, type SkinTier } from "@/lib/types";

// Decorative tiles for the hero mock-up of a banner.
const MOCK_TILES: SkinTier[] = ["SSS", "SSS", "SS", "SS", "S_PLUS", "S_PLUS", "S", "S", "A", "LIMITED", "A", "NORMAL"];

export default async function HomePage() {
  const [featured, testimonials, settings, skinCount] = await Promise.all([
    prisma.gameAccount.findMany({
      where: { status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
    prisma.testimonial.findMany({ orderBy: { createdAt: "desc" }, take: 2 }),
    getSettings(),
    prisma.skin.count(),
  ]);

  const c = (cents: number) => formatCoins(cents);

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
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
              ติ๊กสกินที่มี ระบบเรียงตามความหายากให้อัตโนมัติ ใส่แรงค์ ราคา ช่องทางติดต่อ แล้วได้ภาพเดียวพร้อมโพสต์ขาย
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
              <li>• 4 ธีมป้าย</li>
              <li>• {c(settings.skinPriceCents)} คอยน์/สกิน</li>
            </ul>
          </div>

          <div aria-hidden className="card mx-auto w-full max-w-md rotate-1 p-4 shadow-goldGlow">
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
              {MOCK_TILES.map((tier, i) => (
                <div
                  key={i}
                  className="relative aspect-[4/5] rounded-lg bg-gradient-to-br from-violet/40 to-bg-soft"
                  style={{ border: `2px solid ${SKIN_TIER_COLORS[tier]}` }}
                >
                  {tier !== "NORMAL" ? (
                    <span
                      className="absolute left-1 top-1 rounded-full px-1 text-[9px] font-bold text-bg"
                      style={{ backgroundColor: SKIN_TIER_COLORS[tier] }}
                    >
                      {SKIN_TIER_LABELS[tier]}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-3 text-right text-[11px] text-ink-muted">
              ทำป้ายที่ <span className="font-black text-gold">OSCAR</span> Gaming images
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-2xl font-bold text-ink">ทำป้ายได้ใน 3 ขั้นตอน</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", title: "เลือกสกิน", desc: "ค้นหาชื่อฮีโร่หรือสกิน กรองตามระดับ กดเลือกทั้งหมดของฮีโร่ได้ในคลิกเดียว" },
            { n: "2", title: "จัดเรียง", desc: "เรียงตามความหายาก SSS → SS → S+ อัตโนมัติ หรือสลับตำแหน่งเองตามใจ" },
            { n: "3", title: "ดาวน์โหลด / แชร์", desc: "ใส่แรงค์ ราคา ช่องทางติดต่อ เลือกธีม แล้วได้ภาพ PNG คมชัดพร้อมโพสต์" },
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
            { price: `${c(settings.skinPriceCents)} คอยน์`, label: "ROV · ต่อสกิน", gold: true },
            { price: "ฟรี", label: "ตกแต่งป้าย (ธีม ข้อความ ราคา ช่องทางติดต่อ)" },
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

      {/* ID shop (secondary) */}
      {featured.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">ไอดีขายจากร้าน</h2>
              <p className="text-sm text-ink-muted">ไอดีที่ร้านคัดมาขายเอง ตรวจสอบสเปกได้ก่อนซื้อ</p>
            </div>
            <Link href="/accounts" className="text-sm font-medium text-gold hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((account) => (
              <AccountCard
                key={account.id}
                slug={account.slug}
                title={account.title}
                price={account.price}
                discountPrice={account.discountPrice}
                rank={account.rank}
                heroCount={account.heroCount}
                skinCount={account.skinCount}
                server={account.server}
                loginType={account.loginType}
                status={account.status}
                image={primaryImage(account.images, account.title)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {testimonials.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-xl font-bold text-ink">รีวิวจากลูกค้าร้าน</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {testimonials.map((t) => (
              <div key={t.id} className="card p-5">
                <RatingStars rating={t.rating} />
                <p className="mt-2 text-sm text-ink-muted">&ldquo;{t.comment}&rdquo;</p>
                <p className="mt-3 text-sm font-medium text-ink">— {t.name}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
