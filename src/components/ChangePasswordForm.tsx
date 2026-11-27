"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, type PasswordState } from "@/lib/actions/password";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(changePasswordAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="card space-y-4 p-6">
      {state.error ? (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{state.success}</p>
      ) : null}
      <div>
        <label className="mb-1 block text-sm text-ink-muted">รหัสผ่านปัจจุบัน</label>
        <input type="password" name="current" required autoComplete="current-password" className="input" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-ink-muted">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
        <input type="password" name="next" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-ink-muted">ยืนยันรหัสผ่านใหม่</label>
        <input type="password" name="confirm" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
      </button>
    </form>
  );
}
