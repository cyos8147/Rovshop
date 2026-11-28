import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSkinAction,
  deleteHeroAction,
  deleteSkinAction,
  renameOrMergeHeroAction,
  updateSkinAction,
} from "@/lib/actions/skins";
import { AddSkinForm, DeleteHeroButton, RenameHeroForm, SkinRow } from "@/components/SkinAdmin";
import { AutoSplitter } from "@/components/AutoSplitter";
import { ScreenshotCutter } from "@/components/ScreenshotCutter";

export const metadata: Metadata = { title: "จัดการสกินของฮีโร่" };

export default async function AdminHeroSkinsPage({
  params,
  searchParams,
}: {
  params: Promise<{ heroId: string }>;
  searchParams: Promise<{ missing?: string }>;
}) {
  const { heroId } = await params;
  const { missing } = await searchParams;
  const onlyMissing = missing === "1";
  const hero = await prisma.hero.findUnique({
    where: { id: heroId },
    include: { skins: true },
  });
  if (!hero) notFound();

  // A picture already added (this hero first, then any hero): new crops use its size.
  const refUrl =
    hero.skins.find((skin) => skin.imageUrl)?.imageUrl ??
    (await prisma.skin.findFirst({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }))?.imageUrl ??
    null;

  const otherHeroes = (
    await prisma.hero.findMany({ where: { id: { not: hero.id } }, select: { name: true }, orderBy: { name: "asc" } })
  ).map((h) => h.name);

  const missingCount = hero.skins.filter((skin) => !skin.imageUrl).length;
  const skins = hero.skins
    .filter((skin) => !onlyMissing || !skin.imageUrl)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/skins" className="text-sm text-ink-muted hover:text-gold">
            ← คลังสกิน
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-ink">{hero.name}</h1>
        </div>
        <DeleteHeroButton action={deleteHeroAction.bind(null, hero.id)} skinCount={skins.length} />
      </div>

      <RenameHeroForm
        heroId={hero.id}
        heroName={hero.name}
        otherHeroes={otherHeroes}
        action={renameOrMergeHeroAction}
      />

      <AddSkinForm action={createSkinAction.bind(null, hero.id)} heroName={hero.name} />

      <AutoSplitter
        heroName={hero.name}
        library={hero.skins.map((skin) => ({
          id: skin.id,
          name: skin.name,
          heroName: hero.name,
          imageUrl: skin.imageUrl,
          imageHash: skin.imageHash,
        }))}
        refUrl={refUrl}
        skins={[...hero.skins]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((skin) => ({ id: skin.id, name: skin.name, hasImage: Boolean(skin.imageUrl) }))}
      />

      <ScreenshotCutter
        refUrl={refUrl}
        skins={[...hero.skins]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((skin) => ({ id: skin.id, name: skin.name, hasImage: Boolean(skin.imageUrl) }))}
      />

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">
            สกิน ({skins.length}) · <span className={missingCount > 0 ? "text-gold" : "text-ink-muted"}>ยังไม่มีรูป {missingCount}</span>
          </h2>
          <Link
            href={onlyMissing ? `/admin/skins/${hero.id}` : `/admin/skins/${hero.id}?missing=1`}
            className="text-sm text-gold hover:underline"
          >
            {onlyMissing ? "แสดงทั้งหมด" : "แสดงเฉพาะที่ยังไม่มีรูป"}
          </Link>
        </div>
        <div className="space-y-2">
          {skins.map((skin) => (
            <SkinRow
              key={`${skin.id}-${skin.name}-${skin.tier}-${skin.imageUrl ?? ""}`}
              skin={skin}
              refUrl={refUrl}
              updateAction={updateSkinAction.bind(null, skin.id)}
              deleteAction={deleteSkinAction.bind(null, skin.id)}
            />
          ))}
          {skins.length === 0 ? <p className="py-6 text-center text-ink-muted">ยังไม่มีสกิน</p> : null}
        </div>
      </div>
    </div>
  );
}
