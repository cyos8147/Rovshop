"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { registerAction, type RegisterState } from "@/lib/actions/auth";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const router = useRouter();
  const autoLoggingIn = useRef(false);

  useEffect(() => {
    if (state.success && !autoLoggingIn.current) {
      autoLoggingIn.current = true;
      signIn("credentials", { ...credentials, redirect: false }).then(() => {
        router.push("/");
        router.refresh();
      });
    }
  }, [state.success, credentials, router]);

  function captureCredentials(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    setCredentials({
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    });
  }

  return (
    <form action={formAction} onSubmit={captureCredentials} className="card space-y-4 p-6">
      {state.error ? (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          สมัครสมาชิกสำเร็จ กำลังเข้าสู่ระบบ...
        </p>
      ) : null}
      <div>
        <label className="mb-1 block text-sm text-ink-muted">ชื่อ-นามสกุล</label>
        <input name="name" required minLength={2} maxLength={100} className="input" autoComplete="name" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-ink-muted">อีเมล</label>
        <input type="email" name="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-ink-muted">เบอร์โทร (ไม่บังคับ)</label>
        <input name="phone" className="input" autoComplete="tel" placeholder="0812345678" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-ink-muted">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</label>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          className="input"
          autoComplete="new-password"
        />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
      </button>
      <p className="text-center text-sm text-ink-muted">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="text-gold hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
