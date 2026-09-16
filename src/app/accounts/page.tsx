import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AccountCard } from "@/components/AccountCard";
import { primaryImage } from "@/lib/images";
import { LOGIN_TYPES, LOGIN_TYPE_LABELS, RANK_TIERS, SERVERS } from "@/lib/types";

export const metadata: Metadata = { title: "ไอดีทั้งหมด" };

type SearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const rank = first(sp.rank);
  const loginType = first(sp.loginType);
  const server = first(sp.server);
  const status = first(sp.status) || "AVAILABLE_RESERVED";
  const sort = first(sp.sort) || "newest";
  const minPriceRaw = first(sp.minPrice);
  const maxPriceRaw = first(sp.maxPrice);
  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined;
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : undefined;

  const where: Prisma.GameAccountWhereInput = {};
  if (q) {
    where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
  }
  if (rank) where.rank = rank;
  if (loginType) where.loginType = loginType;
  if (server) where.server = server;
  if (status === "AVAILABLE") where.status = "AVAILABLE";
  else if (status === "AVAILABLE_RESERVED") where.status = { in: ["AVAILABLE", "RESERVED"] };

  const accounts = await prisma.gameAccount.findMany({
    where,
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });

  let filtered = accounts;
  if (minPrice !== undefined && Number.isFinite(minPrice)) {
    filtered = filtered.filter((a) => (a.discountPrice ?? a.price) >= minPrice);
  }
  if (maxPrice !== undefined && Number.isFinite(maxPrice)) {
    filtered = filtered.filter((a) => (a.discountPrice ?? a.price) <= maxPrice);
  }

  filtered = [...filtered].sort((a, b) => {
    const priceA = a.discountPrice ?? a.price;
    const priceB = b.discountPrice ?? b.price;
    if (sort === "price_asc") return priceA - priceB;
    if (sort === "price_desc") return priceB - priceA;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink">ไอดีเกม RoV ทั้งหมด</h1>
      <p className="mt-1 text-sm text-ink-muted">พบ {filtered.length} รายการ</p>

      <form method="get" className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="ค้นหาชื่อไอดี..."
          className="input sm:col-span-2 lg:col-span-2"
        />
        <select name="rank" defaultValue={rank} className="input">
          <option value="">ทุกแรงค์</option>
          {RANK_TIERS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select name="server" defaultValue={server} className="input">
          <option value="">ทุกเซิร์ฟเวอร์</option>
          {SERVERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="loginType" defaultValue={loginType} className="input">
          <option value="">ทุกการล็อกอิน</option>
          {LOGIN_TYPES.map((lt) => (
            <option key={lt} value={lt}>
              {LOGIN_TYPE_LABELS[lt]}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className="input">
          <option value="newest">ใหม่ล่าสุด</option>
          <option value="price_asc">ราคาต่ำ-สูง</option>
          <option value="price_desc">ราคาสูง-ต่ำ</option>
        </select>
        <input type="number" name="minPrice" min={0} defaultValue={minPriceRaw} placeholder="ราคาต่ำสุด" className="input" />
        <input type="number" name="maxPrice" min={0} defaultValue={maxPriceRaw} placeholder="ราคาสูงสุด" className="input" />
        <select name="status" defaultValue={status} className="input">
          <option value="AVAILABLE_RESERVED">พร้อมขาย/ถูกจอง</option>
          <option value="AVAILABLE">พร้อมขายเท่านั้น</option>
          <option value="ALL">ทั้งหมด (รวมขายแล้ว)</option>
        </select>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary flex-1">
            ค้นหา
          </button>
          <Link href="/accounts" className="btn-secondary flex-1">
            ล้างตัวกรอง
          </Link>
        </div>
      </form>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-ink-muted">ไม่พบไอดีที่ตรงกับเงื่อนไข ลองปรับตัวกรองใหม่</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((account) => (
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
    </div>
  );
}
