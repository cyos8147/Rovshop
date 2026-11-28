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

  const libraryRows = await prisma.skin.findMany({
    select: { id: true, name: true, imageUrl: true, imageHash: true, hero: { select: { name: true } } },
    take: 3000,
  });
  const library = libraryRows.map((s) => ({
    id: s.id,
    name: s.name,
    heroName: s.hero.name,
    imageUrl: s.imageUrl,
    imageHash: s.imageHash,
  }));
  const allHeroNames = (await prisma.hero.findMany({ select: { name: true }, orderBy: { name: "asc" } })).map((h) => h.name);

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
  const groups = [...heroes.reduce((map, hero) => {
    const first = hero.name.trim().charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : "#";
    map.set(letter, [...(map.get(letter) ?? []), hero]);
    return map;
  }, new Map<string, typeof heroes>())].sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));
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

      <p className="text-sm">
        <Link href="/admin/skins/check" className="text-gold-soft hover:underline">
          ตรวจกับรายการอ้างอิง (ฮีโร่ขาด เกิน หรือจำนวนสกินไม่ตรง)
        </Link>
        {" · "}
        <Link href="/admin/skins/audit" className="text-gold-soft hover:underline">
          ตรวจชื่อกับรูป (ชื่อสกินและเลเวล EVO)
        </Link>
      </p>

      <AutoSplitter skins={[]} refUrl={refUrl} heroNames={allHeroNames} library={library} />

      <AddHeroSkinForm action={addHeroSkinAction} />

      <details className="text-sm">
        <summary className="cursor-pointer text-ink-muted hover:text-gold">วางรายชื่อหลายสกินพร้อมกัน</summary>
        <div className="mt-3">
          <ImportCatalogForm action={importCatalogAction} />
        </div>
      </details>

      {/* Heroes grouped by first letter, with a jump bar */}
      {groups.length > 1 ? (
        <nav className="sticky top-[71px] z-20 -mx-1 flex flex-wrap gap-1 bg-bg/95 px-1 py-2 backdrop-blur">
          {groups.map(([letter]) => (
            <a key={letter} href={`#letter-${letter}`} className="rounded-md border border-border px-2 py-0.5 text-sm text-ink-muted hover:border-gold hover:text-ink">
              {letter}
            </a>
          ))}
        </nav>
      ) : null}
      {groups.map(([letter, list]) => (
        <section key={letter} id={`letter-${letter}`} className="scroll-mt-32 space-y-2">
          <h2 className="flex items-center gap-3 text-sm font-semibold text-gold-soft">
            {letter}
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-normal text-ink-muted">{list.length} ฮีโร่</span>
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((hero) => (
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
        </section>
      ))}
      {heroes.length === 0 ? (
        <p className="py-6 text-center text-ink-muted">{query ? "ไม่พบฮีโร่หรือสกินที่ค้นหา" : "ยังไม่มีฮีโร่ในระบบ"}</p>
      ) : null}
    </div>
  );
}
