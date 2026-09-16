import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

function sanitizeCallbackUrl(url: string | undefined): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/admin";
  return url;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(sp.callbackUrl);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center text-2xl font-bold text-ink">เข้าสู่ระบบแอดมิน</h1>
      <p className="mt-2 text-center text-sm text-ink-muted">สำหรับผู้ดูแลร้านเท่านั้น</p>
      <div className="mt-6">
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
