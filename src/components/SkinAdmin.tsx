"use client";

import { useActionState, useEffect, useRef } from "react";
import { CroppedImageInput } from "@/components/CroppedImageInput";
import type { SkinFormState } from "@/lib/actions/skins";

type FormAction = (prev: SkinFormState, formData: FormData) => Promise<SkinFormState>;

const initialState: SkinFormState = {};

function FormMessage({ state }: { state: SkinFormState }) {
  if (state.error) {
    return <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>;
  }
  if (state.success) {
    return <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{state.success}</p>;
  }
  return null;
}

// Clears the form after each successful submit so the admin can keep adding.
function useResetOnSuccess(state: SkinFormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state]);
  return ref;
}

export function HeroForm({
  action,
  defaultName,
  submitLabel,
}: {
  action: FormAction;
  defaultName?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <FormMessage state={state} />
      <div>
        <label className="mb-1 block text-sm text-ink-muted">ชื่อฮีโร่</label>
        <input name="name" required maxLength={60} defaultValue={defaultName} className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "กำลังบันทึก..." : submitLabel}
      </button>
    </form>
  );
}

export function AddSkinForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={formAction} className="card space-y-4 p-5">
      <h2 className="font-semibold text-ink">เพิ่มสกินทีละรายการ (พร้อมรูป)</h2>
      <FormMessage state={state} />
      <div>
        <label className="mb-1 block text-sm text-ink-muted">ชื่อสกิน</label>
        <input name="name" required maxLength={80} className="input" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-ink-muted">รูปสกิน (เลือกรูปหรือภาพแคปหน้าจอ แล้วลาก/ซูมครอปเฉพาะช่องสกิน)</label>
        <CroppedImageInput label="เลือกรูปสกิน" />
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "กำลังเพิ่ม..." : "เพิ่มสกิน"}
      </button>
    </form>
  );
}

export function BulkSkinForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={formAction} className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold text-ink">เพิ่มหลายสกินพร้อมกัน (เฉพาะชื่อ)</h2>
        <p className="mt-1 text-sm text-ink-muted">บรรทัดละ 1 สกิน (ชื่อที่มีอยู่แล้วจะถูกข้าม) ใส่รูปทีหลังได้ที่แถวของแต่ละสกิน</p>
      </div>
      <FormMessage state={state} />
      <textarea
        name="lines"
        rows={6}
        required
        placeholder={"Dimension Breaker\nStar Guardian\nSummer Vibes"}
        className="input font-mono"
      />
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "กำลังเพิ่ม..." : "เพิ่มทั้งหมด"}
      </button>
    </form>
  );
}

export function ImportCatalogForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={formAction} className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold text-ink">นำเข้าฮีโร่และสกินทั้งชุดจากรายชื่อ</h2>
        <p className="mt-1 text-sm text-ink-muted">
          วางรายชื่อบรรทัดละ 1 สกิน รูปแบบ <code className="text-gold">ฮีโร่ | สกิน</code> เช่น{" "}
          <code className="text-gold">Volkath | Shogun</code> ฮีโร่ที่ยังไม่มีจะถูกสร้างให้เอง ชื่อที่มีอยู่แล้วจะถูกข้าม ครั้งละไม่เกิน 600 บรรทัด
        </p>
      </div>
      <FormMessage state={state} />
      <textarea
        name="lines"
        rows={8}
        required
        placeholder={"Volkath | Shogun\nVolkath | Sky Rider\nAiri | Shadowblade"}
        className="input font-mono"
      />
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "กำลังนำเข้า..." : "นำเข้า"}
      </button>
    </form>
  );
}

export function SkinRow({
  skin,
  updateAction,
  deleteAction,
}: {
  skin: { id: string; name: string; tier: string; imageUrl: string | null };
  updateAction: FormAction;
  deleteAction: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(updateAction, initialState);

  return (
    <div className="card p-3">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        {skin.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={skin.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-border text-xs text-ink-muted">
            ไม่มีรูป
          </div>
        )}
        <input name="name" required maxLength={80} defaultValue={skin.name} className="input min-w-40 flex-1" />
        {/* Keep any tier an older entry already has; it's no longer edited here. */}
        <input type="hidden" name="tier" value={skin.tier} />
        <CroppedImageInput label={skin.imageUrl ? "เปลี่ยนรูป" : "ใส่รูป"} compact />
        <button type="submit" disabled={pending} className="btn-secondary px-3 py-2 text-sm">
          {pending ? "..." : "บันทึก"}
        </button>
        <button
          type="submit"
          formAction={deleteAction}
          formNoValidate
          onClick={(event) => {
            if (!window.confirm(`ลบสกิน "${skin.name}"?`)) event.preventDefault();
          }}
          className="btn-danger px-3 py-2 text-sm"
        >
          ลบ
        </button>
      </form>
      {state.error || state.success ? (
        <div className="mt-2">
          <FormMessage state={state} />
        </div>
      ) : null}
    </div>
  );
}

export function DeleteHeroButton({ action, skinCount }: { action: () => Promise<void>; skinCount: number }) {
  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm(`ลบฮีโร่นี้และสกินทั้งหมด ${skinCount} รายการ? การลบไม่สามารถกู้คืนได้`)) {
            event.preventDefault();
          }
        }}
        className="btn-danger"
      >
        ลบฮีโร่นี้
      </button>
    </form>
  );
}
