"use client";

import { useActionState } from "react";
import { CroppedImageInput } from "@/components/CroppedImageInput";
import type { AdminFormState } from "@/lib/actions/membership";

type Action = (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
const initial: AdminFormState = {};

export function HeroArtForm({
  action,
  currentUrl,
}: {
  action: Action;
  currentUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold text-ink">ภาพพื้นหลังหน้าแรก</h2>
        <p className="mt-1 text-xs text-ink-muted">
          ภาพใหญ่ด้านขวาของส่วนหัวหน้าแรก ใช้เฉพาะภาพที่คุณมีสิทธิ์ใช้ ภาพแนวนอนหรือแนวตั้งก็ได้ ลากกรอบครอปให้พอดี
        </p>
      </div>
      {state.error ? <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p> : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{state.success}</p>
      ) : null}
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="ภาพพื้นหลังปัจจุบัน" className="max-h-48 rounded-xl border border-border" />
      ) : (
        <p className="text-sm text-ink-muted">ยังไม่ได้ตั้งภาพ (ตอนนี้ใช้ลายคริสตัลสีม่วง)</p>
      )}
      <CroppedImageInput label={currentUrl ? "เปลี่ยนภาพ" : "เลือกภาพ"} aspect={16 / 10} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "กำลังบันทึก..." : "บันทึกภาพ"}
        </button>
        {currentUrl ? (
          <button
            type="submit"
            name="remove"
            value="1"
            formNoValidate
            disabled={pending}
            className="btn-danger"
            onClick={(event) => {
              if (!window.confirm("ลบภาพพื้นหลังหน้าแรก?")) event.preventDefault();
            }}
          >
            ลบภาพ
          </button>
        ) : null}
      </div>
    </form>
  );
}
