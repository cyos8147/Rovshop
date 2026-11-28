"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useImageSize } from "@/components/ImageCropper";
import { addSkinFromScreenshotAction, setSkinImageAction } from "@/lib/actions/skins";
import {
  cleanName,
  detectCards,
  heroStripCanvas,
  matchCards,
  nameStripCanvas,
  readNames,
  type Rect,
} from "@/lib/screenshot-split";

type SplitSkin = { id: string; name: string; hasImage: boolean };

const NEW = "__new__";

type Row = {
  card: Rect;
  preview: string;
  read: string;
  // "" = skip, NEW = create a skin named newName, otherwise an existing skin id
  skinId: string;
  newName: string;
  include: boolean;
  status: "idle" | "saving" | "ok" | "error";
  note?: string;
};

// Admin tool: pick ONE screenshot that shows a grid of skin cards. The cards
// are found automatically and the name under each card is read. A card whose
// name matches an existing skin of the hero gets its picture; any other card
// becomes a NEW skin with the name that was read. Without a fixed hero the hero
// name is read from the screenshot's header too and the hero is created if needed.
export function AutoSplitter({
  heroName: fixedHeroName,
  skins,
  refUrl = null,
}: {
  heroName?: string;
  skins: SplitSkin[];
  refUrl?: string | null;
}) {
  const router = useRouter();
  const chooserRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const refSize = useImageSize(refUrl);

  const [phase, setPhase] = useState<"idle" | "working" | "review" | "saving" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [heroInput, setHeroInput] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const heroName = (fixedHeroName ?? heroInput).trim();
  const skinById = new Map(skins.map((s) => [s.id, s]));
  const existingNames = new Set(skins.map((s) => s.name.toLowerCase()));

  const reset = () => {
    if (imageRef.current?.src.startsWith("blob:")) URL.revokeObjectURL(imageRef.current.src);
    imageRef.current = null;
    setRows([]);
    setPhase("idle");
    setProgress("");
  };

  const onPick = async (file: File) => {
    setMessage(null);
    setPhase("working");
    setProgress("กำลังเปิดภาพ...");
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      imageRef.current = img;

      setProgress("กำลังหาการ์ดสกินในภาพ...");
      await new Promise((resolve) => setTimeout(resolve, 30));
      const { cards, gridTop } = detectCards(img, img.naturalWidth, img.naturalHeight);
      if (cards.length === 0) {
        reset();
        setMessage({ kind: "error", text: "ไม่พบการ์ดสกินในภาพ ลองใช้ \"ตัดเอง\" ด้านล่างแทน" });
        return;
      }

      // The hero name (when it is not fixed) is read in the same OCR run.
      const heroStrip = fixedHeroName ? null : heroStripCanvas(img, img.naturalWidth, img.naturalHeight, gridTop);
      const strips = [...(heroStrip ? [heroStrip] : []), ...cards.map((card) => nameStripCanvas(img, card))];

      let reads: string[] = strips.map(() => "");
      let readFailed = false;
      try {
        setProgress(`กำลังอ่านชื่อ 0/${strips.length}`);
        reads = await readNames(strips, (done, total) => setProgress(`กำลังอ่านชื่อ ${done}/${total}`));
      } catch {
        readFailed = true;
      }
      if (heroStrip) {
        const guess = cleanName(reads[0] ?? "");
        if (guess.length >= 2) setHeroInput(guess);
        reads = reads.slice(1);
      }
      const matches = matchCards(
        reads,
        skins.map((s) => s.name)
      );

      const built: Row[] = cards.map((card, i) => {
        const preview = document.createElement("canvas");
        preview.width = 240;
        preview.height = Math.max(1, Math.round((card.h / card.w) * 240));
        preview.getContext("2d")?.drawImage(img, card.x, card.y, card.w, card.h, 0, 0, preview.width, preview.height);
        const matched = matches[i] >= 0 ? skins[matches[i]] : null;
        const newName = matched ? "" : cleanName(reads[i]);
        return {
          card,
          preview: preview.toDataURL("image/jpeg", 0.8),
          read: reads[i],
          skinId: matched ? matched.id : newName.length >= 2 ? NEW : "",
          newName,
          include: matched ? !matched.hasImage : newName.length >= 2,
          status: "idle",
        };
      });
      setRows(built);
      setPhase("review");
      if (readFailed) setMessage({ kind: "error", text: "อ่านชื่อไม่ได้ กรุณาใส่ชื่อสกินให้แต่ละการ์ดเอง" });
    } catch {
      reset();
      setMessage({ kind: "error", text: "เปิดภาพไม่สำเร็จ ลองเลือกภาพใหม่" });
    }
  };

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const chosen = rows.filter((row) => row.include && row.skinId && (row.skinId !== NEW || row.newName.trim().length >= 2));
  const keyOf = (row: Row) => (row.skinId === NEW ? `new:${row.newName.trim().toLowerCase()}` : `id:${row.skinId}`);
  const keys = chosen.map(keyOf);
  const duplicated = keys.some((key, i) => keys.indexOf(key) !== i);
  const clashesWithExisting = chosen.some((row) => row.skinId === NEW && existingNames.has(row.newName.trim().toLowerCase()));
  const needsHero = chosen.some((row) => row.skinId === NEW) && heroName.length < 2;
  const blocked = chosen.length === 0 || duplicated || clashesWithExisting || needsHero;

  const saveAll = async () => {
    const img = imageRef.current;
    if (!img || blocked) return;
    setPhase("saving");
    setMessage(null);
    let saved = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!chosen.includes(row)) continue;
      update(i, { status: "saving", note: undefined });

      // Same size as the skin pictures already added, else the card's own size.
      let outW = row.card.w;
      let outH = row.card.h;
      if (refSize) {
        outW = Math.min(900, refSize.w);
        outH = Math.round((outW * refSize.h) / refSize.w);
      } else {
        const k = Math.min(1, 900 / Math.max(outW, outH));
        outW = Math.round(outW * k);
        outH = Math.round(outH * k);
      }
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      canvas.getContext("2d")?.drawImage(img, row.card.x, row.card.y, row.card.w, row.card.h, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) {
        update(i, { status: "error", note: "ตัดรูปไม่สำเร็จ" });
        continue;
      }
      const form = new FormData();
      form.append("image", new File([blob], "skin.jpg", { type: "image/jpeg" }));
      try {
        if (row.skinId === NEW) {
          const result = await addSkinFromScreenshotAction(heroName, row.newName, replaceExisting, form);
          if (!result.ok) update(i, { status: "error", note: result.error });
          else if (result.status === "skipped") update(i, { status: "ok", note: "มีสกินชื่อนี้อยู่แล้ว ข้ามไป" });
          else {
            if (result.status === "created") saved++;
            update(i, { status: "ok", note: result.status === "updated" ? "เปลี่ยนรูปแล้ว" : "สร้างสกินใหม่แล้ว" });
          }
        } else {
          const result = await setSkinImageAction(row.skinId, form);
          if (result.error) update(i, { status: "error", note: result.error });
          else {
            saved++;
            update(i, { status: "ok", note: "ใส่รูปแล้ว" });
          }
        }
      } catch {
        update(i, { status: "error", note: "บันทึกไม่สำเร็จ" });
      }
    }
    setPhase("done");
    setMessage({ kind: saved > 0 ? "ok" : "error", text: saved > 0 ? `บันทึก ${saved} สกินแล้ว` : "ไม่ได้บันทึกสกินใหม่" });
    router.refresh();
  };

  return (
    <div className="card space-y-4 p-4">
      <input
        ref={chooserRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="auto-chooser"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void onPick(file);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">
            {fixedHeroName ? "แยกรูปสกินอัตโนมัติจากภาพเดียว" : "ส่งภาพเดียว สร้างฮีโร่ ชื่อสกิน และรูปให้เลย"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            เลือกภาพแคปที่มีการ์ดสกินหลายใบ ระบบจะแยกการ์ด อ่านชื่อใต้การ์ด{fixedHeroName ? "" : " และชื่อฮีโร่ที่หัวหน้าจอ"} สกินที่ยังไม่มีจะถูกสร้างใหม่ตามชื่อที่อ่านได้ พร้อมรูป
          </p>
        </div>
        {phase === "idle" || phase === "done" ? (
          <button type="button" onClick={() => chooserRef.current?.click()} className="btn-primary">
            {phase === "done" ? "เลือกภาพอื่น" : "เลือกภาพแคป"}
          </button>
        ) : null}
      </div>

      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {phase === "working" ? <p className="text-sm text-ink-muted">{progress}</p> : null}

      {phase === "review" || phase === "saving" || phase === "done" ? (
        <>
          {!fixedHeroName ? (
            <label className="block max-w-sm">
              <span className="mb-1 block text-sm text-ink-muted">ชื่อฮีโร่ (สร้างให้ถ้ายังไม่มี)</span>
              <input
                value={heroInput}
                onChange={(event) => setHeroInput(event.target.value)}
                disabled={phase !== "review"}
                maxLength={60}
                className="input"
                placeholder="เช่น Allain"
              />
            </label>
          ) : null}
          <p className="text-sm text-ink-muted">
            พบการ์ด {rows.length} ใบ ตรวจชื่อสกินก่อนกดบันทึก แก้ชื่อได้ในช่อง ถ้าชื่อที่อ่านผิดหรือไม่ต้องการใบไหน ให้เอาติ๊กออก
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((row, i) => {
              const skin = skinById.get(row.skinId);
              return (
                <li key={i} className="space-y-2 rounded-xl border border-border bg-bg-soft p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.preview} alt="" className="w-full rounded-lg" />
                  <p className="truncate text-[11px] text-ink-muted" title={row.read}>
                    อ่านได้: {row.read || "—"}
                  </p>
                  <select
                    value={row.skinId}
                    onChange={(event) => {
                      const value = event.target.value;
                      const next = skinById.get(value);
                      update(i, {
                        skinId: value,
                        include: value === NEW ? row.newName.trim().length >= 2 : Boolean(next) && !next?.hasImage ? true : row.include,
                      });
                    }}
                    disabled={phase !== "review"}
                    className="input py-1.5 text-xs"
                  >
                    <option value="">— ข้ามใบนี้ —</option>
                    <option value={NEW}>+ สกินใหม่</option>
                    {skins.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.hasImage ? " (มีรูปแล้ว)" : ""}
                      </option>
                    ))}
                  </select>
                  {row.skinId === NEW ? (
                    <input
                      value={row.newName}
                      onChange={(event) =>
                        update(i, { newName: event.target.value, include: event.target.value.trim().length >= 2 })
                      }
                      disabled={phase !== "review"}
                      maxLength={80}
                      className="input py-1.5 text-xs"
                      placeholder="ชื่อสกิน"
                    />
                  ) : null}
                  <label className="flex items-center gap-2 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={row.include && Boolean(row.skinId)}
                      disabled={!row.skinId || phase !== "review"}
                      onChange={(event) => update(i, { include: event.target.checked })}
                    />
                    {row.skinId === NEW ? "สร้างสกินนี้" : "ใส่รูปนี้"}
                    {skin?.hasImage ? " (แทนที่รูปเดิม)" : ""}
                  </label>
                  {row.status === "saving" ? <p className="text-xs text-ink-muted">กำลังบันทึก...</p> : null}
                  {row.status === "ok" ? <p className="text-xs text-emerald-300">{row.note}</p> : null}
                  {row.status === "error" ? <p className="text-xs text-rose-300">{row.note}</p> : null}
                </li>
              );
            })}
          </ul>

          {duplicated ? <p className="text-sm text-rose-300">มีสกินที่ถูกเลือกซ้ำกันหลายการ์ด ปรับให้การ์ดละสกินก่อน</p> : null}
          {clashesWithExisting ? (
            <p className="text-sm text-rose-300">มีชื่อสกินใหม่ที่ซ้ำกับสกินที่มีอยู่แล้ว ให้เลือกสกินนั้นจากช่องเลือกแทน</p>
          ) : null}
          {needsHero ? <p className="text-sm text-rose-300">ใส่ชื่อฮีโร่ก่อน</p> : null}

          {phase === "review" ? (
            <div className="space-y-3">
              {!fixedHeroName ? (
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={replaceExisting} onChange={(event) => setReplaceExisting(event.target.checked)} />
                  ถ้ามีสกินชื่อนี้อยู่แล้ว ให้เปลี่ยนรูปเดิม (ไม่ติ๊ก = ข้ามไป)
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={saveAll} disabled={blocked} className="btn-primary">
                  บันทึก {chosen.length} สกิน
                </button>
                <button type="button" onClick={reset} className="btn-secondary">
                  เลือกภาพใหม่
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
