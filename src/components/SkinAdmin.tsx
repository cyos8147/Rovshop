"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
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

// The single add form on /admin/skins: hero name + skin name. The hero name
// is kept after a save so several skins of one hero can be typed in a row.
export function AddHeroSkinForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const skinRef = useRef<HTMLInputElement>(null);
  // React clears uncontrolled fields after a form action, so the hero name is
  // held in state to survive it and be reused for the next skin.
  const [hero, setHero] = useState("");
  useEffect(() => {
    if (state.success) skinRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold text-ink">เพิ่มชื่อฮีโร่และชื่อสกิน</h2>
        <p className="mt-1 text-xs text-ink-muted">
          ใส่แค่ชื่อ ฮีโร่ที่ยังไม่มีจะถูกสร้างให้เอง แล้วค่อยไปใส่รูปที่หน้าฮีโร่
        </p>
      </div>
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-ink-muted">ชื่อฮีโร่</label>
          <input
            name="hero"
            required
            maxLength={60}
            value={hero}
            onChange={(event) => setHero(event.target.value)}
            className="input"
            placeholder="Volkath"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">ชื่อสกิน</label>
          <input ref={skinRef} name="skin" required maxLength={80} className="input" placeholder="Preying Umbra" />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "กำลังเพิ่ม..." : "เพิ่ม"}
      </button>
    </form>
  );
}

export function AddSkinForm({ action, heroName }: { action: FormAction; heroName: string }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={formAction} className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold text-ink">เพิ่มชื่อสกินของ {heroName}</h2>
        <p className="mt-1 text-xs text-ink-muted">ใส่แค่ชื่อก่อน แล้วค่อยใส่รูปให้สกินที่เพิ่มแล้วด้านล่าง</p>
      </div>
      <FormMessage state={state} />
      <div>
        <label className="mb-1 block text-sm text-ink-muted">ชื่อสกิน</label>
        <input name="name" required maxLength={80} className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "กำลังเพิ่ม..." : "เพิ่มสกิน"}
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
  refUrl,
  updateAction,
  deleteAction,
}: {
  skin: { id: string; name: string; tier: string; imageUrl: string | null };
  refUrl?: string | null;
  updateAction: FormAction;
  deleteAction: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(updateAction, initialState);

  return (
    <div className="card p-3">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        {skin.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={skin.imageUrl} alt="" className="h-16 w-[45px] rounded-lg object-cover" />
        ) : (
          <div className="flex h-16 w-[45px] items-center justify-center rounded-lg border border-dashed border-border text-xs text-ink-muted">
            ไม่มีรูป
          </div>
        )}
        <input name="name" required maxLength={80} defaultValue={skin.name} className="input min-w-40 flex-1" />
        {/* Keep any tier an older entry already has; it's no longer edited here. */}
        <input type="hidden" name="tier" value={skin.tier} />
        <CroppedImageInput label={skin.imageUrl ? "เปลี่ยนรูป" : "ใส่รูป"} compact refUrl={refUrl ?? null} />
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

// Rename a hero, or merge it into another one by typing that hero's name.
export function RenameHeroForm({
  heroId,
  heroName,
  otherHeroes,
  action,
}: {
  heroId: string;
  heroName: string;
  otherHeroes: string[];
  action: (heroId: string, name: string) => Promise<{ ok: boolean; error?: string; merged?: boolean; moved?: number; removed?: number; heroId?: string }>;
}) {
  const router = useRouter();
  const [name, setName] = useState(heroName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const targets = new Set(otherHeroes.map((h) => h.toLowerCase()));
  const willMerge = targets.has(name.trim().toLowerCase()) && name.trim().toLowerCase() !== heroName.toLowerCase();

  const submit = async () => {
    if (willMerge && !window.confirm(`รวมสกินทั้งหมดของ "${heroName}" เข้ากับ "${name.trim()}" แล้วลบ "${heroName}" ออก?`)) return;
    setBusy(true);
    setMessage(null);
    const result = await action(heroId, name);
    setBusy(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error ?? "ไม่สำเร็จ" });
      return;
    }
    if (result.merged && result.heroId) {
      router.push(`/admin/skins/${result.heroId}`);
      return;
    }
    setMessage({ kind: "ok", text: "เปลี่ยนชื่อแล้ว" });
    router.refresh();
  };

  return (
    <div className="card space-y-2 p-4">
      <h2 className="font-semibold text-ink">เปลี่ยนชื่อ หรือรวมกับฮีโร่อื่น</h2>
      <p className="text-xs text-ink-muted">
        ถ้าฮีโร่ถูกสร้างซ้ำหรือชื่อผิด พิมพ์ชื่อที่ถูกต้อง ถ้ามีฮีโร่ชื่อนั้นอยู่แล้ว ระบบจะย้ายสกินทั้งหมดไปรวมกัน (สกินชื่อซ้ำเก็บไว้ใบเดียว ใบที่มีรูปจะถูกเก็บ) แล้วลบฮีโร่นี้
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          list="merge-hero-names"
          maxLength={60}
          className="input min-w-48 flex-1"
        />
        <datalist id="merge-hero-names">
          {otherHeroes.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={submit}
          disabled={busy || name.trim().length < 1 || name.trim() === heroName}
          className="btn-secondary px-4 py-2 text-sm"
        >
          {busy ? "..." : willMerge ? "รวมเข้ากับฮีโร่นี้" : "เปลี่ยนชื่อ"}
        </button>
      </div>
      {message ? (
        <p className={`text-xs ${message.kind === "ok" ? "text-emerald-300" : "text-rose-300"}`}>{message.text}</p>
      ) : null}
    </div>
  );
}
