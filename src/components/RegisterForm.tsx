"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { registerAction, type RegisterState } from "@/lib/actions/membership";

export function RegisterForm({ callbackUrl, bonusText }: { callbackUrl: string; bonusText: string | null }) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const router = useRouter();

  // Account created → log straight in with the same credentials.
  useEffect(() => {
    if (!state.ok) return;
    setSigningIn(true);
    signIn("credentials", { email, password, redirect: false }).then(() => {
      router.push(callbackUrl);
      router.refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {state.error ? (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>
      ) : null}
      <div>
        <label className="mb-1 block text-sm text-ink-muted">อีเมล</label>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-ink-muted">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</label>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-ink-muted">ยืนยันรหัสผ่าน</label>
        <input type="password" name="confirm" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      <button type="submit" disabled={pending || signingIn} className="btn-primary w-full">
        {pending || signingIn ? "กำลังสมัคร..." : bonusText ? `สมัครและรับฟรี ${bonusText} คอยน์` : "สมัครสมาชิก"}
      </button>
      <p className="text-center text-xs text-ink-muted">
        การสมัครถือว่ายอมรับ{" "}
        <Link href="/terms" className="text-gold hover:underline">
          เงื่อนไขการใช้บริการ
        </Link>{" "}
        และ{" "}
        <Link href="/privacy" className="text-gold hover:underline">
          นโยบายความเป็นส่วนตัว
        </Link>
      </p>
      <p className="text-center text-sm text-ink-muted">
        มีบัญชีแล้ว?{" "}
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-gold hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
