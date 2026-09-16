import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AccountForm } from "@/components/AccountForm";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { updateAccountAction } from "@/lib/actions/accounts";

export const metadata: Metadata = { title: "แก้ไขไอดี" };

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await prisma.gameAccount.findUnique({
    where: { id },
    include: { images: { orderBy: { position: "asc" } } },
  });

  if (!account) notFound();

  const boundUpdate = updateAccountAction.bind(null, account.id);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">แก้ไขไอดี</h1>
        <a href={`/accounts/${account.slug}`} target="_blank" rel="noreferrer" className="text-sm text-gold hover:underline">
          ดูหน้าจริง →
        </a>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
        <AccountForm
          action={boundUpdate}
          submitLabel="บันทึกการแก้ไข"
          existingImages={account.images.map((image) => ({ id: image.id, url: image.url }))}
          defaultValues={{
            title: account.title,
            description: account.description,
            price: account.price,
            discountPrice: account.discountPrice,
            rank: account.rank,
            maxRank: account.maxRank,
            server: account.server,
            loginType: account.loginType,
            heroCount: account.heroCount,
            skinCount: account.skinCount,
            rareSkins: account.rareSkins,
            diamondBalance: account.diamondBalance,
            coinBalance: account.coinBalance,
            status: account.status,
            credentialUsername: account.credentialUsername,
            credentialPassword: account.credentialPassword,
            credentialNote: account.credentialNote,
          }}
        />

        <div className="card h-fit p-5">
          <h2 className="font-semibold text-ink">โซนอันตราย</h2>
          <p className="mt-1 text-xs text-ink-muted">
            การลบจะลบไอดีนี้ออกถาวร กู้คืนไม่ได้ หากแค่ขายไปแล้วให้เปลี่ยน &quot;สถานะ&quot; เป็น &quot;ขายแล้ว&quot; ด้านบนแทนการลบ
          </p>
          <div className="mt-3">
            <DeleteAccountButton accountId={account.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
