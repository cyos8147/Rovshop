"use client";

import { useState } from "react";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const shown = images.length > 0 ? images : ["/api/placeholder?text=RoVShop&hue=260"];

  return (
    <div>
      <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-bg-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shown[active]} alt={title} className="h-full w-full object-cover" />
      </div>
      {shown.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {shown.map((src, index) => (
            <button
              key={src + index}
              type="button"
              onClick={() => setActive(index)}
              className={`aspect-[16/10] overflow-hidden rounded-lg border-2 transition ${
                index === active ? "border-gold" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title} ${index + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
