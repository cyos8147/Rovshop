"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn("credentials", { email, password, redirect: false });

    setPending(false);

    if (!result || result.error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือลองเข้าสู่ระบบบ่อยเกินไป");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      {error ? <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}
      <div>
        <label className="mb-1 block text-sm text-ink-muted">อีเมล</label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="input"
          autoComplete="email"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-ink-muted">รหัสผ่าน</label>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input"
          autoComplete="current-password"
        />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
