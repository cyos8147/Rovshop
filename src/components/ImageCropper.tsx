"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Full-screen crop dialog: drag to move, slider / mouse wheel / two-finger
// pinch to zoom. Everything happens in the browser; the result is a
// fixed-size JPEG (default 480x600, ratio 4:5) so uploads stay small and
// every skin tile has the same shape no matter what screenshot it came from.

type CropResult = { blob: Blob; dataUrl: string };

const MAX_ZOOM = 5;

export function ImageCropper({
  file,
  aspect = 4 / 5,
  outWidth = 480,
  title = "ครอปรูป",
  onCancel,
  onDone,
}: {
  file: File;
  aspect?: number;
  outWidth?: number;
  title?: string;
  onCancel: () => void;
  onDone: (result: CropResult) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const offset = useRef({ x: 0, y: 0 }); // image centre relative to frame centre, in frame px
  const zoomRef = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frame] = useState(() => {
    const maxW = Math.min(aspect > 1.2 ? 560 : 360, window.innerWidth - 48);
    const maxH = Math.max(200, window.innerHeight - 280);
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    return { w: Math.round(w), h: Math.round(h) };
  });

  // Geometry of the image at the current zoom ("cover" fit × zoom).
  const geometry = useCallback(() => {
    const img = imgRef.current;
    if (!img) return null;
    const base = Math.max(frame.w / img.naturalWidth, frame.h / img.naturalHeight);
    const scale = base * zoomRef.current;
    return { dw: img.naturalWidth * scale, dh: img.naturalHeight * scale };
  }, [frame]);

  const clampOffset = useCallback(() => {
    const g = geometry();
    if (!g) return;
    const maxX = Math.max(0, (g.dw - frame.w) / 2);
    const maxY = Math.max(0, (g.dh - frame.h) / 2);
    offset.current.x = Math.min(maxX, Math.max(-maxX, offset.current.x));
    offset.current.y = Math.min(maxY, Math.max(-maxY, offset.current.y));
  }, [frame, geometry]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const g = geometry();
    if (!canvas || !img || !g) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = frame.w * dpr;
    canvas.height = frame.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, frame.w, frame.h);
    ctx.drawImage(img, frame.w / 2 + offset.current.x - g.dw / 2, frame.h / 2 + offset.current.y - g.dh / 2, g.dw, g.dh);
  }, [frame, geometry]);

  const applyZoom = useCallback(
    (value: number) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, value));
      zoomRef.current = z;
      setZoom(z);
      clampOffset();
      draw();
    },
    [clampOffset, draw]
  );

  // Load the picked file. An <img> element is used (not createImageBitmap)
  // so the browser applies the photo's EXIF rotation and decodes HEIC.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    let cancelled = false;
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      setReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setError("เปิดรูปนี้ไม่ได้ ลองรูปอื่น (JPG, PNG หรือ HEIC)");
    };
    img.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (ready) draw();
  }, [ready, draw]);

  // Wheel zoom needs a non-passive listener so the page doesn't scroll.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      applyZoom(zoomRef.current * (event.deltaY < 0 ? 1.08 : 1 / 1.08));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: zoomRef.current };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, current);

    if (pointers.current.size === 1) {
      offset.current.x += current.x - previous.x;
      offset.current.y += current.y - previous.y;
      clampOffset();
      draw();
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      applyZoom(pinch.current.zoom * (dist / pinch.current.dist));
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const confirm = () => {
    const img = imgRef.current;
    const g = geometry();
    if (!img || !g) return;
    const outW = outWidth;
    const outH = Math.round(outWidth / aspect);
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    const k = outW / frame.w;
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(
      img,
      (frame.w / 2 + offset.current.x - g.dw / 2) * k,
      (frame.h / 2 + offset.current.y - g.dh / 2) * k,
      g.dw * k,
      g.dh * k
    );
    out.toBlob(
      (blob) => {
        if (!blob) return setError("สร้างรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
        onDone({ blob, dataUrl: out.toDataURL("image/jpeg", 0.88) });
      },
      "image/jpeg",
      0.88
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
    >
      <div className={`card w-full space-y-3 p-4 ${aspect > 1.2 ? "max-w-xl" : "max-w-md"}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onCancel} className="rounded-lg px-2 py-1 text-sm text-ink-muted hover:text-ink">
            ยกเลิก
          </button>
        </div>

        {error ? (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
        ) : (
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              data-testid="crop-canvas"
              style={{ width: frame.w, height: frame.h, touchAction: "none" }}
              className="cursor-grab rounded-xl border border-border active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-muted">ซูม</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!ready}
            onChange={(event) => applyZoom(Number(event.target.value))}
            aria-label="ซูมรูป"
            className="w-full accent-[#e8b64a]"
          />
        </div>
        <p className="text-xs text-ink-muted">ลากเพื่อเลื่อนรูป · ซูมด้วยแถบ หรือบีบสองนิ้ว · ตัดเป็นสัดส่วน {aspect === 4 / 5 ? "4:5" : "ตามช่อง"}</p>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            ยกเลิก
          </button>
          <button type="button" onClick={confirm} disabled={!ready || Boolean(error)} className="btn-primary">
            ใช้รูปนี้
          </button>
        </div>
      </div>
    </div>
  );
}
