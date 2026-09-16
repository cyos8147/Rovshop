"use client";

import { useActionState } from "react";
import { updateSettingsAction, type SettingsFormState } from "@/lib/actions/settings";

const initialState: SettingsFormState = {};

export function SettingsForm({ defaultContactUrl }: { defaultContactUrl: string }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      {state.error ? (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          บันทึกเรียบร้อย ลูกค้าจะกดปุ่มไปแชทที่ลิงก์นี้ทันที
        </p>
      ) : null}
      <div>
        <label className="mb-1 block text-sm text-ink-muted">ลิงก์ Facebook สำหรับให้ลูกค้าแชทมาสั่งซื้อ</label>
        <input
          type="url"
          name="contactUrl"
          required
          defaultValue={defaultContactUrl}
          placeholder="https://www.facebook.com/ชื่อผู้ใช้ของคุณ"
          className="input"
        />
        <p className="mt-1 text-xs text-ink-muted">
          วางลิงก์โปรไฟล์หรือเพจ Facebook ที่ต้องการให้ลูกค้ากดแชทหาได้เลย เช่น
          https://www.facebook.com/yourname หรือ https://m.me/yourname
        </p>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto sm:px-10">
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
