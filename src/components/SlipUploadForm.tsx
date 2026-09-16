"use client";

import { useActionState } from "react";
import { uploadSlipAction, type SlipUploadState } from "@/lib/actions/orders";

const initialState: SlipUploadState = {};

export function SlipUploadForm({ batchId }: { batchId: string }) {
  const [state, formAction, pending] = useActionState(uploadSlipAction, initialState);

  return (
    <form action={formAction} className="card mt-4 space-y-3 p-5">
      <input type="hidden" name="batchId" value={batchId} />
      <label className="block text-sm font-medium text-ink">แนบสลิปการโอนเงิน</label>
      <input
        type="file"
        name="slip"
        accept="image/jpeg,image/png,image/webp"
        required
        className="input file:mr-3 file:rounded-lg file:border-0 file:bg-violet file:px-3 file:py-1.5 file:text-white"
      />
      {state.error ? (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          อัปโหลดสลิปสำเร็จ รอแอดมินตรวจสอบการชำระเงิน
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "กำลังอัปโหลด..." : "ส่งสลิปให้ตรวจสอบ"}
      </button>
    </form>
  );
}
