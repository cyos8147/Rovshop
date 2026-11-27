"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

// Crop-box image cropper. The whole picture is shown; a crop rectangle can
// be moved by dragging inside it and resized with the handles on its corners
// (and edges when the ratio is free). Everything happens in the browser and
// the result is a JPEG.

type Rect = { x: number; y: number; w: number; h: number }; // natural-pixel coordinates
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export type CropResult = { blob: Blob; dataUrl: string };
export type CropSurfaceHandle = { crop: () => Promise<CropResult | null> };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Handle positions (percent of the box) and cursors.
const HANDLES: { id: Handle; left: string; top: string; cursor: string }[] = [
  { id: "nw", left: "0%", top: "0%", cursor: "nwse-resize" },
  { id: "n", left: "50%", top: "0%", cursor: "ns-resize" },
  { id: "ne", left: "100%", top: "0%", cursor: "nesw-resize" },
  { id: "e", left: "100%", top: "50%", cursor: "ew-resize" },
  { id: "se", left: "100%", top: "100%", cursor: "nwse-resize" },
  { id: "s", left: "50%", top: "100%", cursor: "ns-resize" },
  { id: "sw", left: "0%", top: "100%", cursor: "nesw-resize" },
  { id: "w", left: "0%", top: "50%", cursor: "ew-resize" },
];

// Start card-sized and near the top, so every handle is visible at once even
// on a tall phone screenshot.
function initialRect(nat: { w: number; h: number }, aspect: number): Rect {
  const w = Math.min(nat.w * 0.4, nat.h * 0.4 * aspect, 460);
  const h = w / aspect;
  return { x: (nat.w - w) / 2, y: Math.min(nat.h * 0.05, nat.h - h), w, h };
}

// Reshape to the ratio, keeping the centre, and stay inside the picture.
function fitToAspect(r: Rect, nat: { w: number; h: number }, aspect: number): Rect {
  let w = r.w;
  let h = w / aspect;
  if (h > nat.h) {
    h = nat.h;
    w = h * aspect;
  }
  if (w > nat.w) {
    w = nat.w;
    h = w / aspect;
  }
  return {
    x: clamp(r.x + r.w / 2 - w / 2, 0, nat.w - w),
    y: clamp(r.y + r.h / 2 - h / 2, 0, nat.h - h),
    w,
    h,
  };
}

function applyDrag(
  handle: Handle | "move",
  r0: Rect,
  dx: number,
  dy: number,
  nat: { w: number; h: number },
  aspect: number,
  lock: boolean,
  minSize: number
): Rect {
  if (handle === "move") {
    return { ...r0, x: clamp(r0.x + dx, 0, nat.w - r0.w), y: clamp(r0.y + dy, 0, nat.h - r0.h) };
  }

  const west = handle.includes("w");
  const east = handle.includes("e");
  const north = handle.includes("n");
  const south = handle.includes("s");

  if (lock) {
    // Corners only: the opposite corner stays put, ratio stays fixed.
    const anchorX = west ? r0.x + r0.w : r0.x;
    const anchorY = north ? r0.y + r0.h : r0.y;
    const fromX = (west ? -dx : dx) + r0.w;
    const fromY = ((north ? -dy : dy) + r0.h) * aspect;
    // follow whichever direction the finger moved further
    let w = Math.abs(fromX - r0.w) >= Math.abs(fromY - r0.w) ? fromX : fromY;
    const maxW = Math.min(west ? anchorX : nat.w - anchorX, (north ? anchorY : nat.h - anchorY) * aspect);
    w = clamp(w, minSize, Math.max(minSize, maxW));
    const h = w / aspect;
    return { x: west ? anchorX - w : anchorX, y: north ? anchorY - h : anchorY, w, h };
  }

  let left = r0.x;
  let right = r0.x + r0.w;
  let top = r0.y;
  let bottom = r0.y + r0.h;
  if (west) left = clamp(r0.x + dx, 0, right - minSize);
  if (east) right = clamp(r0.x + r0.w + dx, left + minSize, nat.w);
  if (north) top = clamp(r0.y + dy, 0, bottom - minSize);
  if (south) bottom = clamp(r0.y + r0.h + dy, top + minSize, nat.h);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export const CropSurface = forwardRef<
  CropSurfaceHandle,
  {
    file: File;
    // Ratio (width / height) used when `lock` is on, and for the first box.
    aspect: number;
    lock: boolean;
    // Output size: the locked ratio uses outWidth; a free box keeps its own
    // shape, capped so the longer side is at most maxOut.
    outWidth?: number;
    maxOut?: number;
    zoom?: number;
    onStatus?: (status: { ready: boolean; error: string | null }) => void;
  }
>(function CropSurface({ file, aspect, lock, outWidth = 480, maxOut = 900, zoom = 1, onStatus }, ref) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(0); // display px per natural px
  const [rect, setRect] = useState<Rect | null>(null);
  const drag = useRef<{ handle: Handle | "move"; x: number; y: number; rect: Rect } | null>(null);

  // Load the picked file. An <img> is used so the browser applies the
  // photo's rotation and decodes HEIC from an iPad.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setNat(null);
    setRect(null);
    onStatus?.({ ready: false, error: null });
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const measure = useCallback(() => {
    const img = imgRef.current;
    if (img && img.naturalWidth) setScale(img.clientWidth / img.naturalWidth);
  }, []);

  // Keep the on-screen scale correct when the zoom or the window changes.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const observer = new ResizeObserver(measure);
    observer.observe(img);
    return () => observer.disconnect();
  }, [measure, src]);

  // Locking to the ratio reshapes the existing box.
  useEffect(() => {
    if (!nat) return;
    setRect((r) => (r ? (lock ? fitToAspect(r, nat, aspect) : r) : initialRect(nat, aspect)));
  }, [nat, lock, aspect]);

  const begin = (handle: Handle | "move") => (event: React.PointerEvent<HTMLElement>) => {
    if (!rect) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { handle, x: event.clientX, y: event.clientY, rect };
  };

  const move = (event: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || !nat || !scale) return;
    const dx = (event.clientX - d.x) / scale;
    const dy = (event.clientY - d.y) / scale;
    setRect(applyDrag(d.handle, d.rect, dx, dy, nat, aspect, lock, 24 / scale));
  };

  const end = () => {
    drag.current = null;
  };

  useImperativeHandle(ref, () => ({
    crop: async () => {
      const img = imgRef.current;
      if (!img || !rect) return null;
      let outW: number;
      let outH: number;
      if (lock) {
        outW = outWidth;
        outH = Math.round(outWidth / aspect);
      } else {
        const k = Math.min(1, maxOut / Math.max(rect.w, rect.h));
        outW = Math.max(1, Math.round(rect.w * k));
        outH = Math.max(1, Math.round(rect.h * k));
      }
      const out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;
      const ctx = out.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) return null;
      return { blob, dataUrl: out.toDataURL("image/jpeg", 0.88) };
    },
  }));

  const showBox = Boolean(rect && scale);

  return (
    <div className="max-h-[72vh] overflow-auto rounded-xl border border-border bg-black/40">
      <div className="relative mx-auto select-none" style={{ width: `${zoom * 100}%` }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(event) => {
              const img = event.currentTarget;
              setNat({ w: img.naturalWidth, h: img.naturalHeight });
              measure();
              onStatus?.({ ready: true, error: null });
            }}
            onError={() => onStatus?.({ ready: false, error: "เปิดรูปนี้ไม่ได้ ลองรูปอื่น (JPG, PNG หรือ HEIC)" })}
            className="block h-auto w-full"
          />
        ) : null}

        {showBox && rect ? (
          <div
            data-testid="crop-box"
            onPointerDown={begin("move")}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="absolute cursor-move touch-none border-2 border-gold"
            style={{
              left: rect.x * scale,
              top: rect.y * scale,
              width: rect.w * scale,
              height: rect.h * scale,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            }}
          >
            {HANDLES.filter((h) => !lock || h.id.length === 2).map((h) => (
              <span
                key={h.id}
                data-testid={`crop-handle-${h.id}`}
                onPointerDown={begin(h.id)}
                className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center"
                style={{ left: h.left, top: h.top, cursor: h.cursor }}
              >
                <span className="h-4 w-4 rounded-full border-2 border-bg bg-gold shadow" />
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
});

// Natural size of a picture already on the site (e.g. a skin that has an
// image), so new crops can match it. null while loading or when there is none.
export function useImageSize(url: string | null | undefined) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!url) {
      setSize(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled && img.naturalWidth > 0) setSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);
  return size;
}

// Modal around the surface: zoom, optional ratio lock, confirm / cancel.
export function ImageCropper({
  file,
  aspect: aspectProp = 0.7,
  outWidth: outWidthProp = 480,
  refSize = null,
  mode = "fixed",
  title = "ตัดรูป",
  onCancel,
  onDone,
}: {
  file: File;
  aspect?: number;
  outWidth?: number;
  // Size of a skin picture that already exists. The box can be locked to its
  // shape and the result is saved at that same size.
  refSize?: { w: number; h: number } | null;
  // "fixed": the box always keeps `aspect`. "free": starts free, with a
  // checkbox to lock it to `aspect`.
  mode?: "fixed" | "free";
  title?: string;
  onCancel: () => void;
  onDone: (result: CropResult) => void;
}) {
  const surface = useRef<CropSurfaceHandle>(null);
  const aspect = refSize ? refSize.w / refSize.h : aspectProp;
  const outWidth = refSize ? Math.min(900, refSize.w) : outWidthProp;
  const [lock, setLock] = useState(mode === "fixed" || Boolean(refSize));
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<{ ready: boolean; error: string | null }>({ ready: false, error: null });
  const [busy, setBusy] = useState(false);

  const ratioLabel = Math.abs(aspect - 1.8) < 0.01 ? "1080:600" : aspect.toFixed(2);

  const confirm = async () => {
    setBusy(true);
    const result = await surface.current?.crop();
    setBusy(false);
    if (result) onDone(result);
    else setStatus((s) => ({ ...s, error: "ตัดรูปไม่สำเร็จ ลองใหม่อีกครั้ง" }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/85 p-3"
    >
      <div className="card w-full max-w-5xl space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onCancel} className="rounded-lg px-2 py-1 text-sm text-ink-muted hover:text-ink">
            ยกเลิก
          </button>
        </div>

        {status.error ? (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{status.error}</p>
        ) : (
          <CropSurface
            ref={surface}
            file={file}
            aspect={aspect}
            lock={lock}
            outWidth={outWidth}
            zoom={zoom}
            onStatus={setStatus}
          />
        )}

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
          {mode === "free" && refSize ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={lock} onChange={(event) => setLock(event.target.checked)} />
              ขนาดเท่ารูปสกินที่ใส่แล้ว ({refSize.w}×{refSize.h})
            </label>
          ) : mode === "free" ? null : (
            <span className="text-xs text-ink-muted">สัดส่วนคงที่ {ratioLabel}</span>
          )}
        </div>
        <p className="text-xs text-ink-muted">
          ลากในกรอบเพื่อเลื่อน · ลากจุดสีทองที่มุม{mode === "free" && !lock ? "และขอบ" : ""}เพื่อปรับขนาด · เลื่อนภาพได้ถ้าภาพยาว
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            ยกเลิก
          </button>
          <button type="button" onClick={confirm} disabled={!status.ready || busy || Boolean(status.error)} className="btn-primary">
            {busy ? "กำลังตัด..." : "ใช้รูปนี้"}
          </button>
        </div>
      </div>
    </div>
  );
}
