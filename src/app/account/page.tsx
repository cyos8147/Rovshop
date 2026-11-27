import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { accessFor, daysLeft } from "@/lib/membership";
import { maskPromptPayId, parsePromptPayId, promptPayPayload } from "@/lib/promptpay";
import { formatTHB } from "@/lib/format";
import { SlipForm } from "@/components/SlipForm";
import { SignOutButton } from "@/components/SignOutButton";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/lib/types";

export const metadata: Metadata = { title: "บัญชีของฉัน" };

function thaiDate(iso: string | Date) {
  return new Date(iso).toLocaleDateString("th-TH", { dateStyle: "long" });
}

export default async function AccountPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");
  if (session.user.role === "ADMIN") redirect("/admin");

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 10 } },
    }),
    getSettings(),
  ]);
  if (!user) redirect("/login?callbackUrl=/account");

  const access = accessFor(user);
  const left = daysLeft(access.until);
  const target = parsePromptPayId(settings.promptpayId);
  const qr = target
    ? await QRCode.toDataURL(promptPayPayload(target, settings.planPrice), { margin: 1, width: 320 })
    : null;

  const status =
    access.state === "paid"
      ? { label: "สมาชิกรายเดือน", tone: "text-emerald-300", detail: `ใช้งานได้ถึง ${thaiDate(access.until!)} (เหลือ ${left} วัน)` }
      : access.state === "trial"
        ? { label: "ทดลองใช้ฟรี", tone: "text-gold", detail: `หมดเขต ${thaiDate(access.until!)} (เหลือ ${left} วัน)` }
        : {
            label: "หมดอายุ",
            tone: "text-rose-300",
            detail: access.until ? `หมดอายุเมื่อ ${thaiDate(access.until)}` : "ยังไม่มีแพ็กเกจ",
          };

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
          <p className={`text-lg font-bold ${status.tone}`}>{status.label}</p>
          <p className="text-sm text-ink-muted">{status.detail}</p>
        </div>
        <Link href="/sort" className="btn-primary">
          ไปทำป้าย →
        </Link>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold text-ink">
            {access.state === "paid" ? "ต่ออายุล่วงหน้า" : "สมัครแพ็กเกจรายเดือน"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            <span className="text-2xl font-bold text-gold">{formatTHB(settings.planPrice)}</span> / {settings.planDays} วัน
            · ทำป้ายและดาวน์โหลดได้ไม่จำกัด ไม่มีลายน้ำตัวอย่าง
          </p>
          {qr ? (
            <div className="mt-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR พร้อมเพย์" className="mx-auto w-56 rounded-xl bg-white p-2" />
              <p className="mt-2 text-sm text-ink">
                พร้อมเพย์ {maskPromptPayId(settings.promptpayId)}
                {settings.promptpayName ? ` · ${settings.promptpayName}` : ""}
              </p>
              <p className="text-xs text-ink-muted">
                สแกนด้วยแอปธนาคาร ยอด {formatTHB(settings.planPrice)} จะขึ้นให้อัตโนมัติ
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-bg-soft p-3 text-sm text-ink-muted">ร้านยังไม่ได้ตั้งค่าการรับเงิน กรุณาติดต่อแอดมิน</p>
          )}
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="font-semibold text-ink">ขั้นตอน</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-ink-muted">
            <li>สแกน QR แล้วโอน {formatTHB(settings.planPrice)}</li>
            <li>อัปโหลดสลิปด้านล่าง</li>
            <li>ระบบตรวจสลิปและเปิดใช้งานให้ทันที (ถ้าระบบตรวจอัตโนมัติไม่ได้ แอดมินจะตรวจให้)</li>
          </ol>
          {qr ? <SlipForm /> : null}
          <p className="text-xs text-ink-muted">ถ้าชำระตอนแพ็กเกจยังไม่หมด วันที่เหลือจะถูกบวกต่อให้ ไม่เสียวัน</p>
        </div>
      </div>

      {user.payments.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-3 font-semibold text-ink">ประวัติการชำระเงิน</h2>
          <div className="space-y-2">
            {user.payments.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span className="text-ink">{thaiDate(p.createdAt)}</span>
                <span className="text-ink-muted">
                  {formatTHB(p.amount)} · {p.days} วัน
                </span>
                <span
                  className={
                    p.status === "APPROVED" ? "text-emerald-300" : p.status === "REJECTED" ? "text-rose-300" : "text-gold"
                  }
                >
                  {PAYMENT_STATUS_LABELS[p.status as PaymentStatus] ?? p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
