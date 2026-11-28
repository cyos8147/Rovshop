import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { addHeroSkinAction, importCatalogAction } from "@/lib/actions/skins";
import { AddHeroSkinForm, ImportCatalogForm } from "@/components/SkinAdmin";
import { AutoSplitter } from "@/components/AutoSplitter";

export const metadata: Metadata = { title: "คลังสกิน" };

export default async function AdminSkinsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 60) : "";

  // A picture already on the site: new pictures are saved at its size.
  const refUrl = (await prisma.skin.findFirst({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }))?.imageUrl ?? null;

  const [heroes, missingByHero] = await Promise.all([
    prisma.hero.findMany({
      // Matches the hero's name, or any of its skins' names.
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { skins: { some: { name: { contains: query, mode: "insensitive" } } } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
      include: { _count: { select: { skins: true } } },
    }),
    prisma.skin.groupBy({ by: ["heroId"], where: { imageUrl: null }, _count: { _all: true } }),
  ]);
  const missing = new Map(missingByHero.map((row) => [row.heroId, row._count._all]));
  const totalSkins = heroes.reduce((sum, hero) => sum + hero._count.skins, 0);
  const totalMissing = [...missing.values()].reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">คลังสกิน</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {heroes.length} ฮีโร่ · {totalSkins} สกิน ·{" "}
            <span className={totalMissing > 0 ? "text-gold" : ""}>ยังไม่มีรูป {totalMissing}</span> — ข้อมูลนี้ใช้ในหน้า{" "}
            <Link href="/sort" className="text-gold hover:underline">
              เรียงสกินทำป้าย
            </Link>
          </p>
        </div>
      </div>

      <form className="flex gap-2" role="search">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="ค้นหาฮีโร่หรือสกิน เช่น Volkath"
          className="input"
          aria-label="ค้นหาฮีโร่หรือสกิน"
        />
        <button type="submit" className="btn-secondary whitespace-nowrap">
          ค้นหา
        </button>
        {query ? (
          <Link href="/admin/skins" className="btn-secondary whitespace-nowrap">
            ล้าง
          </Link>
        ) : null}
      </form>
      {query ? (
        <p className="text-sm text-ink-muted">
          พบ {heroes.length} ฮีโร่ สำหรับ &quot;{query}&quot; — กดที่ฮีโร่เพื่อใส่รูปสกิน
        </p>
      ) : null}

      <AutoSplitter skins={[]} refUrl={refUrl} />

      <AddHeroSkinForm action={addHeroSkinAction} />

      <details className="text-sm">
        <summary className="cursor-pointer text-ink-muted hover:text-gold">วางรายชื่อหลายสกินพร้อมกัน</summary>
        <div className="mt-3">
          <ImportCatalogForm action={importCatalogAction} />
        </div>
      </details>

      <div className="grid gap-2 sm:grid-cols-2">
        {heroes.map((hero) => (
          <Link
            key={hero.id}
            href={`/admin/skins/${hero.id}`}
            className="card flex items-center gap-3 p-3 transition hover:border-gold"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.imageUrl ?? `/api/placeholder?text=${encodeURIComponent(hero.name)}&w=200&h=200`}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{hero.name}</p>
              <p className="text-xs text-ink-muted">
                {hero._count.skins} สกิน
                {missing.get(hero.id) ? <span className="text-gold"> · ขาดรูป {missing.get(hero.id)}</span> : null}
              </p>
            </div>
            <span className="text-sm text-ink-muted">จัดการ →</span>
          </Link>
        ))}
      </div>
      {heroes.length === 0 ? (
        <p className="py-6 text-center text-ink-muted">{query ? "ไม่พบฮีโร่หรือสกินที่ค้นหา" : "ยังไม่มีฮีโร่ในระบบ"}</p>
      ) : null}
    </div>
  );
}
