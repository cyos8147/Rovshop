"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useImageSize } from "@/components/ImageCropper";
import { setSkinImageAction } from "@/lib/actions/skins";
import { detectCards, matchCards, nameStripCanvas, readNames, type Rect } from "@/lib/screenshot-split";

type SplitSkin = { id: string; name: string; hasImage: boolean };

type Row = {
  card: Rect;
  preview: string;
  read: string;
  skinId: string;
  include: boolean;
  status: "idle" | "saving" | "ok" | "error";
  error?: string;
};

// Admin tool: pick ONE screenshot that shows a grid of skin cards. The cards
// are found automatically, the name under each card is read and matched to
// this hero's skins, and after a quick check every picture is saved to its skin.
export function AutoSplitter({ skins, refUrl = null }: { skins: SplitSkin[]; refUrl?: string | null }) {
  const router = useRouter();
  const chooserRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const refSize = useImageSize(refUrl);

  const [phase, setPhase] = useState<"idle" | "working" | "review" | "saving" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const skinById = new Map(skins.map((s) => [s.id, s]));

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
      const cards = detectCards(img, img.naturalWidth, img.naturalHeight);
      if (cards.length === 0) {
        reset();
        setMessage({ kind: "error", text: "ไม่พบการ์ดสกินในภาพ ลองใช้ \"ตัดเอง\" ด้านล่างแทน" });
        return;
      }

      let reads: string[] = cards.map(() => "");
      let readFailed = false;
      try {
        setProgress(`กำลังอ่านชื่อสกิน 0/${cards.length}`);
        reads = await readNames(
          cards.map((card) => nameStripCanvas(img, card)),
          (done, total) => setProgress(`กำลังอ่านชื่อสกิน ${done}/${total}`)
        );
      } catch {
        readFailed = true;
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
        return {
          card,
          preview: preview.toDataURL("image/jpeg", 0.8),
          read: reads[i],
          skinId: matched?.id ?? "",
          include: Boolean(matched && !matched.hasImage),
          status: "idle",
        };
      });
      setRows(built);
      setPhase("review");
      if (readFailed) {
        setMessage({ kind: "error", text: "อ่านชื่อสกินไม่ได้ กรุณาเลือกสกินให้แต่ละการ์ดเอง" });
      }
    } catch {
      reset();
      setMessage({ kind: "error", text: "เปิดภาพไม่สำเร็จ ลองเลือกภาพใหม่" });
    }
  };

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const chosen = rows.filter((row) => row.include && row.skinId);
  const duplicated = new Set(
    chosen.map((row) => row.skinId).filter((id, i, all) => all.indexOf(id) !== i)
  );

  const saveAll = async () => {
    const img = imageRef.current;
    if (!img || chosen.length === 0 || duplicated.size > 0) return;
    setPhase("saving");
    setMessage(null);
    let saved = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.include || !row.skinId) continue;
      update(i, { status: "saving", error: undefined });

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
        update(i, { status: "error", error: "ตัดรูปไม่สำเร็จ" });
        continue;
      }
      const form = new FormData();
      form.append("image", new File([blob], "skin.jpg", { type: "image/jpeg" }));
      try {
        const result = await setSkinImageAction(row.skinId, form);
        if (result.error) update(i, { status: "error", error: result.error });
        else {
          saved++;
          update(i, { status: "ok" });
        }
      } catch {
        update(i, { status: "error", error: "บันทึกไม่สำเร็จ" });
      }
    }
    setPhase("done");
    setMessage({ kind: saved > 0 ? "ok" : "error", text: saved > 0 ? `บันทึกรูป ${saved} สกินแล้ว` : "บันทึกไม่สำเร็จ" });
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
          <h2 className="font-semibold text-ink">แยกรูปสกินอัตโนมัติจากภาพเดียว</h2>
          <p className="mt-1 text-sm text-ink-muted">
            เลือกภาพแคปที่มีการ์ดสกินหลายใบ ระบบจะแยกการ์ดให้ อ่านชื่อสกินใต้การ์ด แล้วใส่รูปให้ตรงกับชื่อสกินของฮีโร่นี้
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
          <p className="text-sm text-ink-muted">
            พบการ์ด {rows.length} ใบ ตรวจชื่อสกินที่จับคู่ให้ถูกก่อนกดบันทึก (แก้ได้ที่ช่องเลือกสกิน) สกินที่มีรูปอยู่แล้วจะไม่ถูกติ๊กไว้ให้
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
                      const next = skinById.get(event.target.value);
                      update(i, { skinId: event.target.value, include: Boolean(next) && !next?.hasImage ? true : row.include });
                    }}
                    disabled={phase !== "review"}
                    className="input py-1.5 text-xs"
                  >
                    <option value="">— เลือกสกิน —</option>
                    {skins.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.hasImage ? " (มีรูปแล้ว)" : ""}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={row.include && Boolean(row.skinId)}
                      disabled={!row.skinId || phase !== "review"}
                      onChange={(event) => update(i, { include: event.target.checked })}
                    />
                    ใส่รูปนี้{skin?.hasImage ? " (แทนที่รูปเดิม)" : ""}
                  </label>
                  {row.status === "ok" ? <p className="text-xs text-emerald-300">บันทึกแล้ว</p> : null}
                  {row.status === "saving" ? <p className="text-xs text-ink-muted">กำลังบันทึก...</p> : null}
                  {row.status === "error" ? <p className="text-xs text-rose-300">{row.error}</p> : null}
                </li>
              );
            })}
          </ul>

          {duplicated.size > 0 ? (
            <p className="text-sm text-rose-300">มีสกินที่ถูกเลือกซ้ำกันหลายการ์ด ปรับให้การ์ดละสกินก่อน</p>
          ) : null}

          {phase === "review" ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveAll} disabled={chosen.length === 0 || duplicated.size > 0} className="btn-primary">
                บันทึก {chosen.length} สกิน
              </button>
              <button type="button" onClick={reset} className="btn-secondary">
                เลือกภาพใหม่
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
