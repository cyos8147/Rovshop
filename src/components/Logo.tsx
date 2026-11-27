// Brand mark: "OSCAR" carries the brand; "Gaming images" is a quiet
// descriptor next to it.
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
