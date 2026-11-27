"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CropSurface, useImageSize, type CropSurfaceHandle } from "@/components/ImageCropper";
import { setSkinImageAction } from "@/lib/actions/skins";

type CutterSkin = { id: string; name: string; hasImage: boolean };

// Admin tool: pick ONE screenshot with several skin cards, then cut each card
// out in turn. The crop box keeps its size between cards, so for a grid of
// same-sized cards you only move it and press "ตัดและบันทึก" again.
export function ScreenshotCutter({ skins, refUrl = null }: { skins: CutterSkin[]; refUrl?: string | null }) {
  const router = useRouter();
  const chooserRef = useRef<HTMLInputElement>(null);
  const surface = useRef<CropSurfaceHandle>(null);

  const [file, setFile] = useState<File | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [targetId, setTargetId] = useState<string>("");
  const refSize = useImageSize(refUrl);
  const [lock, setLock] = useState(false);
  // Start locked to the size of the skin pictures already added.
  useEffect(() => {
    if (refSize) setLock(true);
  }, [refSize]);
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const isDone = (skin: CutterSkin) => skin.hasImage || saved.has(skin.id);
  const nextTarget = (done: Set<string>, fromId?: string) => {
    const missing = skins.filter((s) => !s.hasImage && !done.has(s.id));
    if (fromId) {
      const index = skins.findIndex((s) => s.id === fromId);
      const after = skins.slice(index + 1).find((s) => missing.includes(s));
      if (after) return after.id;
    }
    return missing[0]?.id ?? skins[0]?.id ?? "";
  };

  const close = () => {
    setFile(null);
    setSaved(new Set());
    setMessage(null);
    router.refresh();
  };

  const save = async () => {
    if (!targetId) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await surface.current?.crop();
      if (!result) {
        setMessage({ kind: "error", text: "ตัดรูปไม่สำเร็จ ลองใหม่อีกครั้ง" });
        return;
      }
      const form = new FormData();
      form.append("image", new File([result.blob], "skin.jpg", { type: "image/jpeg" }));
      const response = await setSkinImageAction(targetId, form);
      if (response.error) {
        setMessage({ kind: "error", text: response.error });
        return;
      }
      const done = new Set(saved).add(targetId);
      setSaved(done);
      const remaining = skins.filter((s) => !s.hasImage && !done.has(s.id)).length;
      setMessage({
        kind: "ok",
        text: `${response.success} ${remaining > 0 ? `· เหลืออีก ${remaining} สกินที่ยังไม่มีรูป เลื่อนกรอบไปใบถัดไปได้เลย` : "· ครบทุกสกินแล้ว"}`,
      });
      setTargetId(nextTarget(done, targetId));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="font-semibold text-ink">ตัดเอง (ใช้ถ้าแยกอัตโนมัติไม่ได้)</h2>
          <p className="mt-1 text-sm text-ink-muted">
            เลือกภาพแคปที่มีการ์ดสกินหลายใบ แล้วลากกรอบไปทีละใบ — กรอบคงขนาดเดิม กดบันทึกได้ต่อเนื่องโดยไม่ต้องเลือกภาพใหม่
          </p>
        </div>
        <button
          type="button"
          onClick={() => chooserRef.current?.click()}
          disabled={skins.length === 0}
          className="btn-primary"
        >
          เลือกภาพแคป
        </button>
        <input
          ref={chooserRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="cutter-chooser"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            event.target.value = "";
            if (!picked) return;
            setFile(picked);
            setReady(false);
            setMessage(null);
            if (!targetId || isDone(skins.find((s) => s.id === targetId) ?? { id: "", name: "", hasImage: true })) {
              setTargetId(nextTarget(saved));
            }
          }}
        />
      </div>

      {file ? (
        <div role="dialog" aria-modal="true" aria-label="ตัดรูปจากภาพแคป" className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/85 p-3">
          <div className="card w-full max-w-6xl space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-ink">
                ตัดรูปจากภาพแคป{" "}
                <span className="text-xs font-normal text-ink-muted">
                  (ยังไม่มีรูป {skins.filter((s) => !s.hasImage && !saved.has(s.id)).length} สกิน)
                </span>
              </h2>
              <button type="button" onClick={close} className="btn-secondary px-4 py-1.5 text-sm">
                เสร็จ
              </button>
            </div>

            <CropSurface
              ref={surface}
              file={file}
              aspect={refSize ? refSize.w / refSize.h : 0.7}
              lock={lock}
              outWidth={refSize ? Math.min(900, refSize.w) : 480}
              zoom={zoom}
              onStatus={(status) => {
                setReady(status.ready);
                if (status.error) setMessage({ kind: "error", text: status.error });
              }}
            />

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="mb-1 block text-sm text-ink-muted">กรอบนี้คือสกิน</span>
                <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="input" data-testid="cutter-target">
                  {skins.map((skin) => (
                    <option key={skin.id} value={skin.id}>
                      {skin.name}
                      {isDone(skin) ? " ✓" : " — ยังไม่มีรูป"}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={save}
                disabled={!ready || busy || !targetId}
                className="btn-primary self-end"
              >
                {busy ? "กำลังบันทึก..." : "ตัดและบันทึกสกินนี้"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                ขยายภาพ
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  aria-label="ขยายภาพ"
                  className="w-40 accent-[#e8b64a]"
                />
              </label>
              {refSize ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={lock} onChange={(event) => setLock(event.target.checked)} />
                  ขนาดเท่ารูปสกินที่ใส่แล้ว ({refSize.w}×{refSize.h})
                </label>
              ) : null}
              <button type="button" onClick={() => chooserRef.current?.click()} className="text-sm text-gold hover:underline">
                เปลี่ยนภาพแคป
              </button>
            </div>
            <p className="text-xs text-ink-muted">
              ตัดเฉพาะส่วนรูป ไม่ต้องรวมแถบชื่อสกินที่อยู่ล่างการ์ด (ป้ายจะใส่ชื่อให้เอง) · ลากในกรอบเพื่อเลื่อน · ลากจุดสีทองเพื่อปรับขนาด
            </p>

            {message ? (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  message.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
                }`}
              >
                {message.text}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
