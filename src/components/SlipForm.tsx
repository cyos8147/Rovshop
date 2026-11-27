"use client";

import { useActionState } from "react";
import { submitSlipAction, type SlipState } from "@/lib/actions/membership";

export function SlipForm({ amount }: { amount: number }) {
  const [state, formAction, pending] = useActionState<SlipState, FormData>(submitSlipAction, {});

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
      <input type="file" name="slip" required accept="image/jpeg,image/png,image/webp" className="input" />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "กำลังตรวจสอบสลิป..." : "ส่งสลิป"}
      </button>
    </form>
  );
}
