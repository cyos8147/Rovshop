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

export default async function AdminHeroSkinsPage({ params }: { params: Promise<{ heroId: string }> }) {
  const { heroId } = await params;
  const hero = await prisma.hero.findUnique({
    where: { id: heroId },
    include: { skins: true },
  });
  if (!hero) notFound();

  const skins = [...hero.skins].sort(
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
        <h2 className="mb-3 font-semibold text-ink">สกินทั้งหมด ({skins.length})</h2>
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
