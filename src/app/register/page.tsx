import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/RegisterForm";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { sanitizeCallbackUrl } from "@/lib/callback-url";
import { formatCoins } from "@/lib/coins";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [session, settings, sp] = await Promise.all([getSession(), getSettings(), searchParams]);
  const callbackUrl = sanitizeCallbackUrl(sp.callbackUrl, "/sort");
  if (session?.user) redirect("/account");

  const bonus = settings.signupBonusCents > 0 ? formatCoins(settings.signupBonusCents) : null;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center text-2xl font-bold text-ink">
        สมัครสมาชิก{bonus ? <> รับฟรี <span className="text-gold">{bonus} คอยน์</span></> : null}
      </h1>
      <p className="mt-2 text-center text-sm text-ink-muted">
        สมัครด้วยอีเมล ไม่มีรายเดือน · จ่ายเฉพาะตอนดาวน์โหลด {formatCoins(settings.skinPriceCents)} คอยน์ต่อสกิน
      </p>
      <div className="mt-6">
        <RegisterForm callbackUrl={callbackUrl} bonusText={bonus} />
      </div>
      {bonus ? <p className="mt-4 text-center text-xs text-ink-muted">คอยน์ฟรีรับได้ 1 ครั้งต่ออุปกรณ์</p> : null}
    </div>
  );
}
