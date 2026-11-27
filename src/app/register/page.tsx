import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/RegisterForm";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { sanitizeCallbackUrl } from "@/lib/callback-url";
import { formatTHB } from "@/lib/format";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [session, settings, sp] = await Promise.all([getSession(), getSettings(), searchParams]);
  const callbackUrl = sanitizeCallbackUrl(sp.callbackUrl, "/sort");
  if (session?.user) redirect("/account");

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center text-2xl font-bold text-ink">
        {settings.trialDays > 0 ? (
          <>
            ทดลองใช้ฟรี <span className="text-gold">{settings.trialDays} วัน</span>
          </>
        ) : (
          "สมัครสมาชิก"
        )}
      </h1>
      <p className="mt-2 text-center text-sm text-ink-muted">
        สมัครด้วยอีเมล ไม่ต้องใช้บัตรเครดิต · หลังทดลองใช้ {formatTHB(settings.planPrice)}/{settings.planDays} วัน
        ทำป้ายได้ไม่จำกัด
      </p>
      <div className="mt-6">
        <RegisterForm callbackUrl={callbackUrl} trialDays={settings.trialDays} />
      </div>
      <p className="mt-4 text-center text-xs text-ink-muted">สิทธิ์ทดลองใช้ฟรีได้ 1 ครั้งต่ออุปกรณ์</p>
    </div>
  );
}
