// Brand logo (public/logo.png). The picture has a near-black background, so
// `mix-blend-lighten` lets the page colour show through around the lettering.
const SIZES = { sm: "h-11", md: "h-14", lg: "h-28 sm:h-36" } as const;

export function Logo({ size = "md" }: { size?: keyof typeof SIZES }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="OSCAR Gaming images"
      width={900}
      height={630}
      className={`${SIZES[size]} w-auto select-none mix-blend-lighten`}
    />
  );
}
