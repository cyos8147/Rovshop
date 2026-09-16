import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AccountCard } from "@/components/AccountCard";
import { RatingStars } from "@/components/RatingStars";
import { primaryImage } from "@/lib/images";
import { RANK_TIERS } from "@/lib/types";

export default async function HomePage() {
  const [featured, testimonials, availableCount] = await Promise.all([
    prisma.gameAccount.findMany({
      where: { status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
    prisma.testimonial.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.gameAccount.count({ where: { status: "AVAILABLE" } }),
  ]);

  return (
    <div>
      <section className="bg-hero-gradient">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="inline-block rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-soft">
            ไอดีเกม RoV แรงค์สูง สกินครบ ปลอดภัย 100%
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-ink sm:text-5xl">
            ซื้อขายไอดี <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-violet">RoV</span>{" "}
            ง่าย ปลอดภัย ส่งไว
          </h1>
          <p className="mt-4 max-w-xl text-ink-muted">
            เลือกไอดีจากสต๊อกจริง ตรวจสอบสเปกครบก่อนตัดสินใจซื้อ ชำระเงินแล้วรับข้อมูลบัญชีได้ทันทีหลังยืนยันการชำระเงิน
            มีให้เลือกกว่า {availableCount} ไอดีในระบบตอนนี้
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/accounts" className="btn-primary">
              ดูไอดีทั้งหมด
            </Link>
            <Link href="/faq" className="btn-secondary">
              วิธีการสั่งซื้อ
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap gap-2">
          {RANK_TIERS.map((rank) => (
            <Link
              key={rank}
              href={`/accounts?rank=${encodeURIComponent(rank)}`}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm text-ink-muted transition hover:border-gold hover:text-gold"
            >
              แรงค์{rank}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">ไอดีมาใหม่ล่าสุด</h2>
            <p className="text-sm text-ink-muted">อัปเดตสต๊อกทุกวัน คัดมาให้แล้วว่าคุ้มค่า</p>
          </div>
          <Link href="/accounts" className="text-sm font-medium text-gold hover:underline">
            ดูทั้งหมด →
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="mt-8 text-center text-ink-muted">ยังไม่มีไอดีในสต๊อกตอนนี้ กลับมาดูใหม่เร็วๆ นี้</p>
        ) : (
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
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "ตรวจสอบได้ทุกรายการ", desc: "ระบุแรงค์ ฮีโร่ สกิน และยอดเพชรคงเหลือชัดเจนก่อนซื้อ" },
            { title: "ส่งมอบหลังยืนยันเงินเท่านั้น", desc: "ข้อมูลบัญชีจะแสดงให้เฉพาะหลังชำระเงินสำเร็จ ปลอดภัยทั้งสองฝ่าย" },
            { title: "ทีมงานพร้อมช่วยเหลือ", desc: "ติดต่อสอบถามหรือแจ้งปัญหาได้ทุกวัน 10:00–24:00 น." },
          ].map((item) => (
            <div key={item.title} className="card p-5">
              <h3 className="font-semibold text-ink">{item.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {testimonials.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-xl font-bold text-ink">รีวิวจากลูกค้า</h2>
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
