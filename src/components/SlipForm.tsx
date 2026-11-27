"use client";

import { useActionState, useState } from "react";

const MAX_BYTES = 4 * 1024 * 1024;
import { submitSlipAction, type SlipState } from "@/lib/actions/membership";

export function SlipForm({ amount }: { amount: number }) {
  const [state, formAction, pending] = useActionState<SlipState, FormData>(submitSlipAction, {});
  const [tooBig, setTooBig] = useState(false);

  return (
    <form action={formAction} className="space-y-3">
      {state.error ? (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{state.success}</p>
      ) : null}
      {state.pending ? (
        <p className="rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold">{state.pending}</p>
      ) : null}
      <input type="hidden" name="amount" value={amount} />
      <label className="mb-1 block text-sm text-ink-muted">อัปโหลดสลิปโอนเงิน {amount} บาท</label>
      <input
        type="file"
        name="slip"
        required
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setTooBig((e.target.files?.[0]?.size ?? 0) > MAX_BYTES)}
        className="input"
      />
      {tooBig ? (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          ไฟล์ใหญ่เกิน 4MB — ลองแคปหน้าจอสลิปใหม่ หรือส่งเป็นไฟล์ JPG
        </p>
      ) : null}
      <button type="submit" disabled={pending || tooBig} className="btn-primary w-full">
        {pending ? "กำลังตรวจสอบสลิป..." : "ส่งสลิป"}
      </button>
    </form>
  );
}
