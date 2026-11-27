// OSCAR brand: an emblem (a bolt inside two looping arrows) next to the
// wide-spaced wordmark. The emblem is plain SVG so it stays sharp at any size.
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="oscar-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4b3ff" />
          <stop offset="0.55" stopColor="#8f6bff" />
          <stop offset="1" stopColor="#5b2fe0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#oscar-mark)" strokeWidth="5.2" strokeLinecap="round">
        <path d="M11.72 37.44A21 21 0 0 1 48.09 18.5" />
        <path d="M52.28 37.44A21 21 0 0 1 12.27 39.18" />
      </g>
      <g fill="url(#oscar-mark)">
        <polygon points="53.54,13.92 52.91,24.25 42.63,23.08" />
        <polygon points="5.57,41.62 9.7,32.13 18.96,36.75" />
        <polygon points="36.5,12 21.5,35.5 30.5,35.5 26.5,52 43,28 33.5,28" />
      </g>
    </svg>
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
          className={`font-display font-extrabold uppercase tracking-[0.22em] text-white ${small ? "text-base" : "text-xl"}`}
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
