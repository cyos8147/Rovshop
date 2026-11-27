import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const metadata: Metadata = { title: "เปลี่ยนรหัสผ่าน" };

export default async function PasswordPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login?callbackUrl=/password");
  const back = session.user.role === "ADMIN" ? "/admin" : "/account";

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Link href={back} className="text-sm text-ink-muted hover:text-gold">
        ← กลับ
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">เปลี่ยนรหัสผ่าน</h1>
      <p className="mt-1 text-sm text-ink-muted">{session.user.email}</p>
      <div className="mt-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
