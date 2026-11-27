// Flat decorative background used behind the home-page hero: thin diagonal
// streaks, concentric arcs and a dot grid. No blur or glow, just lines.
export function BrandBackdrop() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMaxYMid slice"
    >
      <defs>
        <pattern id="bb-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#a58bff" fillOpacity="0.35" />
        </pattern>
      </defs>
      {/* soft diagonal bands */}
      <polygon points="520,600 880,0 1010,0 650,600" fill="#6d4df2" fillOpacity="0.07" />
      <polygon points="760,600 1100,0 1160,0 820,600" fill="#6d4df2" fillOpacity="0.07" />
      {/* thin streaks */}
      <g stroke="#a58bff" strokeLinecap="round" fill="none">
        <line x1="380" y1="600" x2="760" y2="0" strokeOpacity="0.18" />
        <line x1="640" y1="600" x2="1010" y2="0" stroke="#e8b64a" strokeOpacity="0.4" />
        <line x1="900" y1="600" x2="1200" y2="110" strokeOpacity="0.2" />
        <line x1="1030" y1="600" x2="1200" y2="320" strokeOpacity="0.2" />
      </g>
      {/* concentric arcs */}
      <g fill="none" stroke="#a58bff">
        <circle cx="980" cy="330" r="250" strokeOpacity="0.3" strokeWidth="1.5" />
        <circle cx="980" cy="330" r="190" strokeOpacity="0.16" />
        <path d="M730 330A250 250 0 0 1 980 80" stroke="#e8b64a" strokeOpacity="0.85" strokeWidth="2" />
      </g>
      <rect x="40" y="120" width="140" height="84" fill="url(#bb-dots)" />
      <rect x="1000" y="470" width="150" height="90" fill="url(#bb-dots)" />
    </svg>
  );
}
