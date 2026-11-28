"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useImageSize } from "@/components/ImageCropper";
import { addSkinFromScreenshotAction, setSkinImageAction } from "@/lib/actions/skins";
import { normalizeSkinName } from "@/lib/skin-name";
import {
  cardHash,
  cleanName,
  detectCards,
  hashDistance,
  heroStripCanvas,
  matchCards,
  nameStripCanvas,
  readNames,
  type Rect,
} from "@/lib/screenshot-split";

type SplitSkin = { id: string; name: string; hasImage: boolean };

const NEW = "__new__";
const MAX_FILES = 12;

type Row = {
  imageIndex: number;
  card: Rect;
  preview: string;
  read: string;
  // "" = skip, NEW = create a skin named newName, otherwise an existing skin id
  skinId: string;
  newName: string;
  include: boolean;
  // Index of an earlier card (over all the pictures) that is the same skin.
  duplicateOf: number | null;
  duplicateKind: "picture" | "name" | null;
  status: "idle" | "saving" | "ok" | "error";
  note?: string;
};

// Admin tool: pick one or several screenshots that show grids of skin cards.
// The cards are found automatically and the name under each card is read. A
// card whose name matches an existing skin of the hero gets its picture; any
// other card becomes a NEW skin with the name that was read. Without a fixed
// hero, each screenshot's hero name is read from its header and the hero is
// created if needed. A skin keeps one picture only: nothing is overwritten and
// the same picture or name is never used twice.
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
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const refSize = useImageSize(refUrl);

  const [phase, setPhase] = useState<"idle" | "working" | "review" | "saving" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [heroInputs, setHeroInputs] = useState<string[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const heroFor = (imageIndex: number) => (fixedHeroName ?? heroInputs[imageIndex] ?? "").trim();
  const skinById = new Map(skins.map((s) => [s.id, s]));
  const existingNames = new Set(skins.map((s) => normalizeSkinName(s.name)));

  const reset = () => {
    for (const img of imagesRef.current) if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
    imagesRef.current = [];
    setRows([]);
    setHeroInputs([]);
    setPhase("idle");
    setProgress("");
  };

  const onPick = async (picked: File[]) => {
    const files = picked.slice(0, MAX_FILES);
    setMessage(null);
    setPhase("working");
    try {
      // 1. Open every picture and find its cards.
      const loaded: { img: HTMLImageElement; cards: Rect[]; gridTop: number | null }[] = [];
      const noCards: number[] = [];
      for (let f = 0; f < files.length; f++) {
        setProgress(`กำลังหาการ์ดสกินในภาพ ${f + 1}/${files.length}`);
        await new Promise((resolve) => setTimeout(resolve, 20));
        const img = new Image();
        img.src = URL.createObjectURL(files[f]);
        try {
          await img.decode();
        } catch {
          noCards.push(f + 1);
          continue;
        }
        const { cards, gridTop } = detectCards(img, img.naturalWidth, img.naturalHeight);
        if (cards.length === 0) {
          URL.revokeObjectURL(img.src);
          noCards.push(f + 1);
          continue;
        }
        loaded.push({ img, cards, gridTop });
      }
      imagesRef.current = loaded.map((l) => l.img);
      if (loaded.length === 0) {
        reset();
        setMessage({ kind: "error", text: "ไม่พบการ์ดสกินในภาพ ลองใช้ \"ตัดเอง\" ด้านล่างแทน" });
        return;
      }

      // 2. Read all the names in one OCR run (hero name first, then the cards).
      const strips: HTMLCanvasElement[] = [];
      const plan = loaded.map(({ img, cards, gridTop }) => {
        const heroStrip = fixedHeroName ? null : heroStripCanvas(img, img.naturalWidth, img.naturalHeight, gridTop);
        const heroAt = heroStrip ? strips.push(heroStrip) - 1 : -1;
        const cardAt = cards.map((card) => strips.push(nameStripCanvas(img, card)) - 1);
        return { heroAt, cardAt };
      });
      let reads: string[] = strips.map(() => "");
      let readFailed = false;
      try {
        setProgress(`กำลังอ่านชื่อ 0/${strips.length}`);
        reads = await readNames(strips, (done, total) => setProgress(`กำลังอ่านชื่อ ${done}/${total}`));
      } catch {
        readFailed = true;
      }

      // 3. Build one row per card.
      const heroGuesses = plan.map((p) => (p.heroAt >= 0 ? cleanName(reads[p.heroAt] ?? "") : ""));
      const built: Row[] = [];
      const hashes: string[] = [];
      loaded.forEach(({ img, cards }, imageIndex) => {
        const cardReads = plan[imageIndex].cardAt.map((at) => reads[at] ?? "");
        const matches = matchCards(
          cardReads,
          skins.map((s) => s.name)
        );
        cards.forEach((card, i) => {
          const hash = cardHash(img, card);
          const pictureDup = hashes.findIndex((h) => h && hash && hashDistance(h, hash) <= 4);
          hashes.push(hash);

          const preview = document.createElement("canvas");
          preview.width = 240;
          preview.height = Math.max(1, Math.round((card.h / card.w) * 240));
          preview.getContext("2d")?.drawImage(img, card.x, card.y, card.w, card.h, 0, 0, preview.width, preview.height);

          const matched = matches[i] >= 0 ? skins[matches[i]] : null;
          const newName = matched ? "" : cleanName(cardReads[i]);
          const skinId = matched ? matched.id : newName.length >= 2 ? NEW : "";

          // Same skin as an earlier card of this batch (same hero and name)?
          const nameKey = `${normalizeSkinName(heroGuesses[imageIndex])}:${normalizeSkinName(newName)}`;
          const nameDup =
            skinId === NEW
              ? built.findIndex(
                  (r) =>
                    r.skinId === NEW &&
                    `${normalizeSkinName(heroGuesses[r.imageIndex])}:${normalizeSkinName(r.newName)}` === nameKey
                )
              : built.findIndex((r) => r.skinId === skinId);
          const duplicateOf = pictureDup >= 0 ? pictureDup : nameDup;
          built.push({
            imageIndex,
            card,
            preview: preview.toDataURL("image/jpeg", 0.8),
            read: cardReads[i],
            skinId,
            newName,
            include: duplicateOf < 0 && (matched ? !matched.hasImage : newName.length >= 2),
            duplicateOf: duplicateOf >= 0 ? duplicateOf : null,
            duplicateKind: duplicateOf < 0 ? null : pictureDup >= 0 ? "picture" : "name",
            status: "idle",
          });
        });
      });
      setHeroInputs(heroGuesses);
      setRows(built);
      setPhase("review");
      const warnings: string[] = [];
      if (readFailed) warnings.push("อ่านชื่อไม่ได้ กรุณาใส่ชื่อสกินให้แต่ละการ์ดเอง");
      if (noCards.length > 0) warnings.push(`ไม่พบการ์ดในภาพที่ ${noCards.join(", ")} (ข้ามไป)`);
      if (picked.length > MAX_FILES) warnings.push(`เลือกได้ครั้งละไม่เกิน ${MAX_FILES} ภาพ (ใช้ ${MAX_FILES} ภาพแรก)`);
      if (warnings.length > 0) setMessage({ kind: "error", text: warnings.join(" · ") });
    } catch {
      reset();
      setMessage({ kind: "error", text: "เปิดภาพไม่สำเร็จ ลองเลือกภาพใหม่" });
    }
  };

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const chosen = rows.filter(
    (row) =>
      row.include &&
      row.duplicateOf === null &&
      row.skinId &&
      !skinById.get(row.skinId)?.hasImage &&
      (row.skinId !== NEW || row.newName.trim().length >= 2)
  );
  const keyOf = (row: Row) =>
    row.skinId === NEW ? `new:${normalizeSkinName(heroFor(row.imageIndex))}:${normalizeSkinName(row.newName)}` : `id:${row.skinId}`;
  const keys = chosen.map(keyOf);
  const duplicated = keys.some((key, i) => keys.indexOf(key) !== i);
  const clashesWithExisting = chosen.some((row) => row.skinId === NEW && existingNames.has(normalizeSkinName(row.newName)));
  const needsHero = chosen.some((row) => row.skinId === NEW && heroFor(row.imageIndex).length < 2);
  const blocked = chosen.length === 0 || duplicated || clashesWithExisting || needsHero;

  const saveAll = async () => {
    if (blocked) return;
    setPhase("saving");
    setMessage(null);
    let saved = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!chosen.includes(row)) continue;
      const img = imagesRef.current[row.imageIndex];
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
          const result = await addSkinFromScreenshotAction(heroFor(row.imageIndex), row.newName, form);
          if (!result.ok) update(i, { status: "error", note: result.error });
          else if (result.status === "skipped") update(i, { status: "ok", note: "มีสกินชื่อนี้อยู่แล้ว ข้ามไป" });
          else {
            saved++;
            update(i, { status: "ok", note: "สร้างสกินใหม่แล้ว" });
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

  const imageCount = imagesRef.current.length;

  return (
    <div className="card space-y-4 p-4">
      <input
        ref={chooserRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        data-testid="auto-chooser"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) void onPick(files);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">
            {fixedHeroName ? "แยกรูปสกินอัตโนมัติจากภาพแคป" : "ส่งภาพแคป สร้างฮีโร่ ชื่อสกิน และรูปให้เลย"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            เลือกภาพแคปที่มีการ์ดสกินได้หลายภาพพร้อมกัน ระบบจะแยกการ์ด อ่านชื่อใต้การ์ด{fixedHeroName ? "" : " และชื่อฮีโร่ที่หัวหน้าจอ"} สกินที่ยังไม่มีจะถูกสร้างใหม่ตามชื่อที่อ่านได้ พร้อมรูป ไม่ทับรูปเดิม และไม่ใส่ซ้ำ
          </p>
        </div>
        {phase === "idle" || phase === "done" ? (
          <button type="button" onClick={() => chooserRef.current?.click()} className="btn-primary">
            {phase === "done" ? "เลือกภาพอื่น" : "เลือกภาพแคป (หลายภาพได้)"}
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
            {imageCount} ภาพ พบการ์ดรวม {rows.length} ใบ ตรวจชื่อสกินก่อนกดบันทึก แก้ชื่อได้ในช่อง ถ้าชื่อที่อ่านผิดหรือไม่ต้องการใบไหน ให้เอาติ๊กออก
          </p>

          {Array.from({ length: imageCount }, (_, imageIndex) => {
            const group = rows.map((row, i) => ({ row, i })).filter(({ row }) => row.imageIndex === imageIndex);
            return (
              <section key={imageIndex} className="space-y-3">
                <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
                  <h3 className="text-sm font-semibold text-ink">
                    ภาพที่ {imageIndex + 1} <span className="font-normal text-ink-muted">({group.length} ใบ)</span>
                  </h3>
                  {!fixedHeroName ? (
                    <label className="block w-56">
                      <span className="mb-1 block text-xs text-ink-muted">ชื่อฮีโร่ของภาพนี้ (สร้างให้ถ้ายังไม่มี)</span>
                      <input
                        value={heroInputs[imageIndex] ?? ""}
                        onChange={(event) =>
                          setHeroInputs((current) => current.map((v, k) => (k === imageIndex ? event.target.value : v)))
                        }
                        disabled={phase !== "review"}
                        maxLength={60}
                        className="input py-1.5 text-sm"
                        placeholder="เช่น Allain"
                      />
                    </label>
                  ) : null}
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {group.map(({ row, i }) => {
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
                              include:
                                value === NEW ? row.newName.trim().length >= 2 : Boolean(next) && !next?.hasImage ? true : row.include,
                            });
                          }}
                          disabled={phase !== "review"}
                          className="input py-1.5 text-xs"
                        >
                          <option value="">— ข้ามใบนี้ —</option>
                          <option value={NEW}>+ สกินใหม่</option>
                          {skins.map((s) => (
                            <option key={s.id} value={s.id} disabled={s.hasImage}>
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
                        {row.duplicateOf !== null ? (
                          <p className="text-xs text-rose-300">
                            {row.duplicateKind === "picture" ? "รูปซ้ำ" : "สกินซ้ำ"}กับใบที่ {row.duplicateOf + 1} (ไม่ใส่ซ้ำ)
                          </p>
                        ) : skin?.hasImage ? (
                          <p className="text-xs text-ink-muted">สกินนี้มีรูปแล้ว (ไม่ทับรูปเดิม)</p>
                        ) : (
                          <label className="flex items-center gap-2 text-xs text-ink">
                            <input
                              type="checkbox"
                              checked={row.include && Boolean(row.skinId)}
                              disabled={!row.skinId || phase !== "review"}
                              onChange={(event) => update(i, { include: event.target.checked })}
                            />
                            {row.skinId === NEW ? "สร้างสกินนี้" : "ใส่รูปนี้"}
                          </label>
                        )}
                        {row.status === "saving" ? <p className="text-xs text-ink-muted">กำลังบันทึก...</p> : null}
                        {row.status === "ok" ? <p className="text-xs text-emerald-300">{row.note}</p> : null}
                        {row.status === "error" ? <p className="text-xs text-rose-300">{row.note}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {duplicated ? <p className="text-sm text-rose-300">มีสกินที่ถูกเลือกซ้ำกันหลายการ์ด ปรับให้การ์ดละสกินก่อน</p> : null}
          {clashesWithExisting ? (
            <p className="text-sm text-rose-300">มีชื่อสกินใหม่ที่ซ้ำกับสกินที่มีอยู่แล้ว ให้เลือกสกินนั้นจากช่องเลือกแทน</p>
          ) : null}
          {needsHero ? <p className="text-sm text-rose-300">ใส่ชื่อฮีโร่ให้ครบทุกภาพก่อน</p> : null}

          {phase === "review" ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveAll} disabled={blocked} className="btn-primary">
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
