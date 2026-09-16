"use client";

import { useActionState } from "react";
import type { AccountFormState } from "@/lib/actions/accounts";
import {
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_LABELS,
  LOGIN_TYPES,
  LOGIN_TYPE_LABELS,
  RANK_TIERS,
  SERVERS,
} from "@/lib/types";

export type AccountFormValues = {
  title: string;
  description: string;
  price: number;
  discountPrice: number | null;
  rank: string;
  maxRank: string;
  server: string;
  loginType: string;
  heroCount: number;
  skinCount: number;
  rareSkins: string;
  diamondBalance: number;
  coinBalance: number;
  status: string;
  credentialUsername: string | null;
  credentialPassword: string | null;
  credentialNote: string | null;
};

type ExistingImage = { id: string; url: string };

type AccountFormProps = {
  action: (prevState: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  defaultValues?: AccountFormValues;
  existingImages?: ExistingImage[];
  submitLabel: string;
};

const initialState: AccountFormState = {};

export function AccountForm({ action, defaultValues, existingImages = [], submitLabel }: AccountFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">บันทึกข้อมูลสำเร็จ</p>
      ) : null}

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-ink-muted">ชื่อสินค้า</label>
          <input name="title" required minLength={4} defaultValue={defaultValues?.title} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-ink-muted">รายละเอียด</label>
          <textarea
            name="description"
            required
            minLength={10}
            rows={4}
            defaultValue={defaultValues?.description}
            className="input"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-muted">ราคาปกติ (บาท)</label>
          <input type="number" name="price" required min={1} defaultValue={defaultValues?.price} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">ราคาส่วนลด (ไม่บังคับ)</label>
          <input
            type="number"
            name="discountPrice"
            min={1}
            defaultValue={defaultValues?.discountPrice ?? ""}
            className="input"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-muted">แรงค์ปัจจุบัน</label>
          <select name="rank" defaultValue={defaultValues?.rank ?? RANK_TIERS[0]} className="input">
            {RANK_TIERS.map((rank) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">แรงค์สูงสุด</label>
          <select name="maxRank" defaultValue={defaultValues?.maxRank ?? RANK_TIERS[0]} className="input">
            {RANK_TIERS.map((rank) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-muted">เซิร์ฟเวอร์</label>
          <select name="server" defaultValue={defaultValues?.server ?? SERVERS[0]} className="input">
            {SERVERS.map((server) => (
              <option key={server} value={server}>
                {server}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">ประเภทล็อกอิน</label>
          <select name="loginType" defaultValue={defaultValues?.loginType ?? LOGIN_TYPES[0]} className="input">
            {LOGIN_TYPES.map((loginType) => (
              <option key={loginType} value={loginType}>
                {LOGIN_TYPE_LABELS[loginType]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-muted">จำนวนฮีโร่</label>
          <input
            type="number"
            name="heroCount"
            min={0}
            required
            defaultValue={defaultValues?.heroCount ?? 0}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">จำนวนสกิน</label>
          <input
            type="number"
            name="skinCount"
            min={0}
            required
            defaultValue={defaultValues?.skinCount ?? 0}
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-ink-muted">สกินหายาก/เด่น (คั่นด้วยจุลภาค)</label>
          <input name="rareSkins" defaultValue={defaultValues?.rareSkins} className="input" />
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-muted">เพชรคงเหลือ</label>
          <input
            type="number"
            name="diamondBalance"
            min={0}
            defaultValue={defaultValues?.diamondBalance ?? 0}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">คอยน์คงเหลือ</label>
          <input
            type="number"
            name="coinBalance"
            min={0}
            defaultValue={defaultValues?.coinBalance ?? 0}
            className="input"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-muted">สถานะ</label>
          <select name="status" defaultValue={defaultValues?.status ?? "AVAILABLE"} className="input">
            {ACCOUNT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ACCOUNT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="font-semibold text-ink">ข้อมูลบัญชี (จดไว้ใช้เองเท่านั้น)</h2>
        <p className="text-xs text-ink-muted">
          เป็นที่จดบันทึกสำหรับแอดมินเท่านั้น เว็บจะไม่แสดงข้อมูลนี้ให้ลูกค้าเห็นเด็ดขาด — ส่งให้ลูกค้าเองทางแชทหลังรับเงินแล้ว
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-ink-muted">ยูสเซอร์ / อีเมลล็อกอิน</label>
            <input name="credentialUsername" defaultValue={defaultValues?.credentialUsername ?? ""} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink-muted">รหัสผ่าน</label>
            <input name="credentialPassword" defaultValue={defaultValues?.credentialPassword ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">หมายเหตุถึงผู้ซื้อ</label>
          <textarea
            name="credentialNote"
            rows={2}
            defaultValue={defaultValues?.credentialNote ?? ""}
            className="input"
          />
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-semibold text-ink">รูปภาพ</h2>
        {existingImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {existingImages.map((image) => (
              <label key={image.id} className="relative block cursor-pointer">
                <input type="checkbox" name="removeImageIds" value={image.id} className="peer absolute right-1 top-1 z-10 h-4 w-4" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="aspect-[16/10] w-full rounded-lg object-cover" />
                <span className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-lg bg-rose-900/70 text-xs font-medium text-white peer-checked:flex">
                  จะลบรูปนี้
                </span>
              </label>
            ))}
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-sm text-ink-muted">เพิ่มรูปภาพใหม่ (JPG, PNG, WEBP ไม่เกิน 5MB ต่อไฟล์)</label>
          <input
            type="file"
            name="images"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-violet file:px-3 file:py-1.5 file:text-white"
          />
        </div>
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto sm:px-10">
        {pending ? "กำลังบันทึก..." : submitLabel}
      </button>
    </form>
  );
}
