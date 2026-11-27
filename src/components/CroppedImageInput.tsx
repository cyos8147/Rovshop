"use client";

import { useEffect, useRef, useState } from "react";
import { ImageCropper } from "@/components/ImageCropper";

// Drop-in replacement for <input type="file" name="image"> inside a form:
// the admin picks a photo/screenshot, crops it to the skin-tile shape, and
// the cropped JPEG is placed into a hidden input of the given name, so the
// existing server actions receive it exactly like a normal upload.
export function CroppedImageInput({
  name = "image",
  label = "เลือกรูป",
  compact = false,
  aspect = 4 / 5,
}: {
  name?: string;
  label?: string;
  compact?: boolean;
  aspect?: number;
}) {
  const chooserRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Forget the preview when the surrounding form is reset after a save.
  useEffect(() => {
    const form = outRef.current?.form;
    if (!form) return;
    const onReset = () => setPreview(null);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const clear = () => {
    if (outRef.current) outRef.current.value = "";
    setPreview(null);
  };

  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-2"}>
      {/* Hidden, named input that actually carries the cropped file. */}
      <input ref={outRef} type="file" name={name} className="hidden" tabIndex={-1} aria-hidden />
      <input
        ref={chooserRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="crop-chooser"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) setPicked(file);
        }}
      />

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className={compact ? "h-14 w-11 rounded-lg object-cover" : "h-40 w-32 rounded-xl object-cover"} />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => chooserRef.current?.click()}
          className={compact ? "btn-secondary px-3 py-2 text-sm" : "btn-secondary"}
        >
          {preview ? "เลือกรูปใหม่" : label}
        </button>
        {preview ? (
          <>
            <span className="text-xs text-emerald-300">เลือกรูปแล้ว — กดบันทึก</span>
            <button type="button" onClick={clear} className="text-xs text-ink-muted underline">
              ล้าง
            </button>
          </>
        ) : null}
      </div>

      {picked ? (
        <ImageCropper
          file={picked}
          mode="free"
          aspect={aspect}
          onCancel={() => setPicked(null)}
          onDone={({ blob, dataUrl }) => {
            const file = new File([blob], "skin.jpg", { type: "image/jpeg" });
            const transfer = new DataTransfer();
            transfer.items.add(file);
            if (outRef.current) outRef.current.files = transfer.files;
            setPreview(dataUrl);
            setPicked(null);
          }}
        />
      ) : null}
    </div>
  );
}
