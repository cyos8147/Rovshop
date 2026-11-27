import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { maskPromptPayId, parsePromptPayId, promptPayPayload } from "@/lib/promptpay";
import { formatCoins, MAX_TOPUP, TOPUP_PRESETS } from "@/lib/coins";
import { SlipForm } from "@/components/SlipForm";
import { SignOutButton } from "@/components/SignOutButton";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/lib/types";

export const metadata: Metadata = { title: "เติมคอยน์" };

function thaiDateTime(d: Date) {
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ amount?: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");
  if (session.user.role === "ADMIN") redirect("/admin");

  const [user, settings, sp] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        payments: { orderBy: { createdAt: "desc" }, take: 10 },
        downloads: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    }),
    getSettings(),
    searchParams,
  ]);
  if (!user) redirect("/login?callbackUrl=/account");

  // Amount is chosen with plain links (?amount=50) so the QR is rendered
  // on the server; anything out of range falls back to the first preset.
  const presets = TOPUP_PRESETS.filter((p) => p >= settings.minTopup);
  const requested = Math.floor(Number(sp.amount));
  const amount =
    Number.isFinite(requested) && requested >= settings.minTopup && requested <= MAX_TOPUP
      ? requested
      : (presets[0] ?? settings.minTopup);

  const target = parsePromptPayId(settings.promptpayId);
  const qr = target ? await QRCode.toDataURL(promptPayPayload(target, amount), { margin: 1, width: 320 }) : null;
  const skinsPerTopup = Math.floor((amount * 100) / Math.max(1, settings.skinPriceCents));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink">บัญชีของฉัน</h1>
          <p className="mt-1 truncate text-sm text-ink-muted">{user.email}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-ink-muted">คอยน์คงเหลือ</p>
          <p className="text-3xl font-black text-gold">
            {formatCoins(user.coinCents)} <span className="text-base font-semibold text-ink">คอยน์</span>
          </p>
        </div>
        <Link href="/sort" className="btn-primary">
          ไปทำป้าย →
        </Link>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold text-ink">เติมคอยน์</h2>
          <p className="mt-1 text-sm text-ink-muted">1 บาท = 1 คอยน์ · ไม่มีรายเดือน คอยน์ไม่มีวันหมดอายุ</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {presets.map((p) => (
              <Link
                key={p}
                href={`/account?amount=${p}`}
                scroll={false}
                className={`rounded-xl border py-2.5 text-center font-semibold transition ${
                  p === amount ? "border-gold bg-gold/15 text-gold" : "border-violet-soft/30 text-ink hover:border-gold"
                }`}
              >
                ฿{p}
              </Link>
            ))}
          </div>
          <form className="mt-2 flex gap-2" action="/account">
            <input
              type="number"
              name="amount"
              min={settings.minTopup}
              max={MAX_TOPUP}
              placeholder={`จำนวนอื่น (ขั้นต่ำ ${settings.minTopup})`}
              className="input"
            />
            <button type="submit" className="btn-secondary whitespace-nowrap">
              ตกลง
            </button>
          </form>
          {qr ? (
            <div className="mt-5 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR พร้อมเพย์" className="mx-auto w-56 rounded-xl bg-white p-2" />
              <p className="mt-2 text-lg font-bold text-ink">โอน ฿{amount.toLocaleString("th-TH")}</p>
              <p className="text-sm text-ink-muted">
                พร้อมเพย์ {maskPromptPayId(settings.promptpayId)}
                {settings.promptpayName ? ` · ${settings.promptpayName}` : ""}
              </p>
              <p className="mt-1 text-xs text-ink-muted">ได้ {amount} คอยน์ ≈ ทำป้ายได้ {skinsPerTopup.toLocaleString("th-TH")} สกิน</p>
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-bg-soft p-3 text-sm text-ink-muted">ร้านยังไม่ได้ตั้งค่าการรับเงิน กรุณาติดต่อแอดมิน</p>
          )}
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="font-semibold text-ink">ขั้นตอน</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-ink-muted">
            <li>เลือกจำนวนเงิน แล้วสแกน QR ด้วยแอปธนาคาร</li>
            <li>อัปโหลดสลิปด้านล่าง</li>
            <li>ระบบตรวจสลิปและเติมคอยน์ให้ทันที (ถ้าตรวจอัตโนมัติไม่ได้ แอดมินจะตรวจให้)</li>
          </ol>
          {qr ? <SlipForm key={amount} amount={amount} /> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold text-ink">ประวัติการเติม</h2>
          <div className="space-y-2">
            {user.payments.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span className="text-ink-muted">{thaiDateTime(p.createdAt)}</span>
                <span className="text-ink">+{p.amount} คอยน์</span>
                <span
                  className={
                    p.status === "APPROVED" ? "text-emerald-300" : p.status === "REJECTED" ? "text-rose-300" : "text-gold"
                  }
                >
                  {PAYMENT_STATUS_LABELS[p.status as PaymentStatus] ?? p.status}
                </span>
              </div>
            ))}
            {user.payments.length === 0 ? <p className="text-sm text-ink-muted">ยังไม่มีรายการ</p> : null}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-semibold text-ink">ประวัติการดาวน์โหลด</h2>
          <div className="space-y-2">
            {user.downloads.map((d) => (
              <div key={d.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span className="text-ink-muted">{thaiDateTime(d.createdAt)}</span>
                <span className="text-ink">{d.skinCount} สกิน</span>
                <span className="text-rose-200">-{formatCoins(d.costCents)} คอยน์</span>
              </div>
            ))}
            {user.downloads.length === 0 ? <p className="text-sm text-ink-muted">ยังไม่มีรายการ</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
