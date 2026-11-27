// Brand mark: "OSCAR" carries the brand; "Gaming images" is a quiet
// descriptor next to it. Used in the header.
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const big = size === "lg" ? "text-3xl" : "text-2xl";
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap leading-none">
      <span
        className={`${big} font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gold-soft via-gold to-gold`}
      >
        Oscar
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">Gaming images</span>
    </span>
  );
}

// The picture logo (public/logo.png). Its background is near-black, so
// `mix-blend-lighten` lets the page colour show through around the lettering.
export function LogoImage({ className = "h-28 sm:h-36" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="OSCAR Gaming images"
      width={900}
      height={630}
      className={`${className} w-auto select-none mix-blend-lighten`}
    />
  );
}
