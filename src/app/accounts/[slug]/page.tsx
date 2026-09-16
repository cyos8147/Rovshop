import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatTHB } from "@/lib/format";
import { Gallery } from "@/components/Gallery";
import { StatusBadge } from "@/components/StatusBadge";
import { getSettings } from "@/lib/settings";
import { LOGIN_TYPE_LABELS, type LoginType } from "@/lib/types";

async function getAccount(slug: string) {
  return prisma.gameAccount.findUnique({
    where: { slug },
    include: { images: { orderBy: { position: "asc" } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const account = await getAccount(slug);
  if (!account) return { title: "ไม่พบไอดี" };
  return { title: account.title, description: account.description.slice(0, 150) };
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [account, settings] = await Promise.all([getAccount(slug), getSettings()]);
  if (!account) notFound();

  const finalPrice = account.discountPrice ?? account.price;
  const images = account.images.map((image) => image.url);
  const available = account.status === "AVAILABLE";

  const specs = [
    { label: "แรงค์ปัจจุบัน", value: account.rank },
    { label: "แรงค์สูงสุด", value: account.maxRank },
    { label: "เซิร์ฟเวอร์", value: account.server },
    { label: "ประเภทล็อกอิน", value: LOGIN_TYPE_LABELS[account.loginType as LoginType] ?? account.loginType },
    { label: "จำนวนฮีโร่", value: `${account.heroCount} ตัว` },
    { label: "จำนวนสกิน", value: `${account.skinCount} ชิ้น` },
    { label: "เพชรคงเหลือ", value: account.diamondBalance.toLocaleString("th-TH") },
    { label: "คอยน์คงเหลือ", value: account.coinBalance.toLocaleString("th-TH") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <Gallery images={images} title={account.title} />

        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status={account.status as "AVAILABLE" | "RESERVED" | "SOLD"} />
            <span className="rounded-full bg-bg-soft px-2.5 py-1 text-xs text-ink-muted">แรงค์{account.rank}</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-ink">{account.title}</h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-black text-gold">{formatTHB(finalPrice)}</span>
            {account.discountPrice ? (
              <span className="text-lg text-ink-muted line-through">{formatTHB(account.price)}</span>
            ) : null}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            {specs.map((spec) => (
              <div key={spec.label}>
                <dt className="text-ink-muted">{spec.label}</dt>
                <dd className="font-medium text-ink">{spec.value}</dd>
              </div>
            ))}
            <div className="col-span-2">
              <dt className="text-ink-muted">สกินหายาก/เด่น</dt>
              <dd className="font-medium text-ink">{account.rareSkins}</dd>
            </div>
          </dl>

          <div className="mt-6">
            {available ? (
              <a
                href={settings.contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl bg-gold px-6 py-3 text-center font-semibold text-bg transition hover:bg-gold-soft"
              >
                แชทกับแอดมินเพื่อสั่งซื้อ
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-xl bg-bg-soft px-6 py-3 font-semibold text-ink-muted"
              >
                ไอดีนี้ไม่พร้อมขายแล้ว
              </button>
            )}
            <p className="mt-3 text-xs text-ink-muted">
              กดปุ่มด้านบนเพื่อแชทกับแอดมินโดยตรง แจ้งชื่อไอดี &quot;{account.title}&quot; เพื่อสอบถามและนัดโอน-รับไอดีได้เลย
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold text-ink">รายละเอียดไอดี</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{account.description}</p>
      </div>
    </div>
  );
}
