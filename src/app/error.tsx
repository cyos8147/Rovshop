"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-xl font-semibold text-ink">เกิดข้อผิดพลาดบางอย่าง</h1>
      <p className="mt-2 text-ink-muted">กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาโปรดติดต่อทีมงาน</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-gold px-6 py-2.5 font-semibold text-bg transition hover:bg-gold-soft"
      >
        ลองใหม่อีกครั้ง
      </button>
    </div>
  );
}
