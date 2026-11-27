"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/lib/actions/membership";

type FormAction = (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;

function Message({ state }: { state: AdminFormState }) {
  if (state.error) return <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>;
  if (state.success)
    return <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{state.success}</p>;
  return null;
}

export function ReviewButtons({
  approve,
  reject,
}: {
  approve: () => Promise<void>;
  reject: () => Promise<void>;
}) {
  return (
    <form className="flex gap-2">
      <button
        type="submit"
        formAction={approve}
        onClick={(e) => {
          if (!window.confirm("ยืนยันว่าได้รับเงินแล้ว และอนุมัติรายการนี้?")) e.preventDefault();
        }}
        className="btn-primary px-3 py-1.5 text-sm"
      >
        อนุมัติ
      </button>
      <button
        type="submit"
        formAction={reject}
        onClick={(e) => {
          if (!window.confirm("ไม่อนุมัติรายการนี้?")) e.preventDefault();
        }}
        className="btn-danger px-3 py-1.5 text-sm"
      >
        ไม่อนุมัติ
      </button>
    </form>
  );
}

export function CoinAdjustForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        name="coins"
        step="0.01"
        defaultValue={10}
        aria-label="จำนวนคอยน์ (ติดลบเพื่อหัก)"
        className="input w-24 py-1.5"
      />
      <button type="submit" disabled={pending} className="btn-secondary px-3 py-1.5 text-sm">
        ± คอยน์
      </button>
      <Message state={state} />
    </form>
  );
}

const cents = (v: number) => String(v / 100);

export function PricingForm({
  action,
  defaults,
  slipAutoVerify,
}: {
  action: FormAction;
  defaults: {
    promptpayId: string;
    promptpayName: string;
    skinPriceCents: number;
    noWatermarkCents: number;
    signupBonusCents: number;
    minTopup: number;
    planPrice: number;
    planDays: number;
  };
  slipAutoVerify: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold text-ink">ราคาและการรับเงิน (คอยน์)</h2>
        <p className="mt-1 text-xs text-ink-muted">1 บาท = 1 คอยน์ · เลือก/จัดเรียง/ดูตัวอย่างฟรี จ่ายเฉพาะตอนดาวน์โหลด</p>
      </div>
      <Message state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-ink-muted">พร้อมเพย์ (เบอร์มือถือ / เลขบัตร 13 หลัก)</label>
          <input name="promptpayId" defaultValue={defaults.promptpayId} placeholder="0812345678" className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">ชื่อบัญชี (แสดงใต้ QR)</label>
          <input name="promptpayName" defaultValue={defaults.promptpayName} maxLength={100} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">ราคาต่อสกิน (คอยน์)</label>
          <input type="number" name="skinPrice" step="0.01" min={0} required defaultValue={cents(defaults.skinPriceCents)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">ค่าบริการแบบไม่มีลายน้ำ (คอยน์/ป้าย)</label>
          <input type="number" name="noWatermark" step="0.01" min={0} required defaultValue={cents(defaults.noWatermarkCents)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">คอยน์ฟรีตอนสมัคร (0 = ไม่แจก)</label>
          <input type="number" name="signupBonus" step="0.01" min={0} required defaultValue={cents(defaults.signupBonusCents)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">เติมขั้นต่ำ (บาท)</label>
          <input type="number" name="minTopup" min={1} required defaultValue={defaults.minTopup} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">ราคารายเดือน (คอยน์, 0 = ปิด)</label>
          <input type="number" name="planPrice" min={0} required defaultValue={defaults.planPrice} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">จำนวนวันต่อรายเดือน</label>
          <input type="number" name="planDays" min={1} required defaultValue={defaults.planDays} className="input" />
        </div>
      </div>
      <p className="text-xs text-ink-muted">
        ตรวจสลิปอัตโนมัติ (SlipOK):{" "}
        {slipAutoVerify ? (
          <span className="text-emerald-300">เปิดใช้งาน</span>
        ) : (
          <span className="text-gold">ยังไม่ได้ตั้งค่า — ทุกสลิปจะรอแอดมินอนุมัติที่เมนู &quot;การชำระเงิน&quot;</span>
        )}
      </p>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
