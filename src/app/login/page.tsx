import { LogoMark } from "@/components/Logo";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { sanitizeCallbackUrl } from "@/lib/callback-url";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  // /account forwards admins on to /admin.
  const callbackUrl = sanitizeCallbackUrl(sp.callbackUrl, "/account");

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <LogoMark className="mx-auto mb-3 h-12 w-12" />
      <h1 className="text-center text-2xl font-bold text-ink">เข้าสู่ระบบ</h1>
      <div className="mt-6">
        <LoginForm callbackUrl={callbackUrl} />
      </div>
      <p className="mt-4 text-center text-sm text-ink-muted">
        ยังไม่มีบัญชี?{" "}
        <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl === "/account" ? "/sort" : callbackUrl)}`} className="text-gold hover:underline">
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  );
}
