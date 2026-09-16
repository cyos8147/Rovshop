import Link from "next/link";
import { formatTHB } from "@/lib/format";
import { LOGIN_TYPE_LABELS, type AccountStatus, type LoginType } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

type AccountCardProps = {
  slug: string;
  title: string;
  price: number;
  discountPrice: number | null;
  rank: string;
  heroCount: number;
  skinCount: number;
  server: string;
  loginType: string;
  status: string;
  image: string | null;
};

export function AccountCard({
  slug,
  title,
  price,
  discountPrice,
  rank,
  heroCount,
  skinCount,
  server,
  loginType,
  status,
  image,
}: AccountCardProps) {
  const finalPrice = discountPrice ?? price;

  return (
    <Link
      href={`/accounts/${slug}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-violet/60 hover:shadow-glow"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-bg-soft">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute left-2 top-2">
          <StatusBadge status={status as AccountStatus} />
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-bg/80 px-2 py-1 text-xs font-medium text-gold-soft backdrop-blur">
          {rank}
        </div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 min-h-[2.7em] font-semibold text-ink">{title}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span>ฮีโร่ {heroCount} ตัว</span>
          <span>สกิน {skinCount} ชิ้น</span>
          <span>เซิร์ฟ {server}</span>
          <span>{LOGIN_TYPE_LABELS[loginType as LoginType] ?? loginType}</span>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-lg font-bold text-gold">{formatTHB(finalPrice)}</span>
          {discountPrice ? (
            <span className="text-sm text-ink-muted line-through">{formatTHB(price)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
