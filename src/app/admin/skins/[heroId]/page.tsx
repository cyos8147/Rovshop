import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  bulkAddSkinsAction,
  createSkinAction,
  deleteHeroAction,
  deleteSkinAction,
  updateHeroAction,
  updateSkinAction,
} from "@/lib/actions/skins";
import { AddSkinForm, BulkSkinForm, DeleteHeroButton, HeroForm, SkinRow } from "@/components/SkinAdmin";
import { skinTierRank } from "@/lib/types";

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

  const missingCount = hero.skins.filter((skin) => !skin.imageUrl).length;
  const skins = hero.skins
    .filter((skin) => !onlyMissing || !skin.imageUrl)
    .sort(
    (a, b) => skinTierRank(a.tier) - skinTierRank(b.tier) || a.name.localeCompare(b.name)
  );

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

      <HeroForm
        action={updateHeroAction.bind(null, hero.id)}
        defaultValues={{ name: hero.name, role: hero.role, imageUrl: hero.imageUrl }}
        submitLabel="บันทึกข้อมูลฮีโร่"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AddSkinForm action={createSkinAction.bind(null, hero.id)} />
        <BulkSkinForm action={bulkAddSkinsAction.bind(null, hero.id)} />
      </div>

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
