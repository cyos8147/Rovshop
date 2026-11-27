// OSCAR brand: the emblem (public/logo-mark.png, transparent background)
// next to the wide-spaced wordmark.
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-mark.png" alt="" width={187} height={187} className={`${className} select-none object-contain`} />
  );
}

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const small = size === "sm";
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap leading-none">
      <LogoMark className={small ? "h-8 w-8" : "h-10 w-10"} />
      <span className="h-7 w-px bg-border" />
      <span className="flex flex-col gap-1">
        <span
          className={`font-display font-extrabold uppercase tracking-[0.22em] text-ink ${small ? "text-base" : "text-xl"}`}
        >
          Oscar
        </span>
        <span className="font-display text-[9px] font-medium uppercase tracking-[0.34em] text-ink-muted">
          Gaming Images
        </span>
      </span>
    </span>
  );
}
