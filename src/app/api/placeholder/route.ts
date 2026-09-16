import { NextRequest } from "next/server";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

// Generates a themed placeholder image on the fly (used for seed/demo
// screenshots so the repo doesn't need to ship binary sample images).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = escapeXml((searchParams.get("text") ?? "RoV Shop").slice(0, 60));
  const hue = clamp(Number(searchParams.get("hue") ?? 260), 0, 360);
  const width = clamp(Number(searchParams.get("w") ?? 800), 50, 2000);
  const height = clamp(Number(searchParams.get("h") ?? 500), 50, 2000);
  const fontSize = Math.round(Math.min(width, height) / 14);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue},70%,16%)" />
      <stop offset="100%" stop-color="hsl(${(hue + 60) % 360},65%,9%)" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)" />
  <rect x="6" y="6" width="${width - 12}" height="${height - 12}" fill="none" stroke="hsl(${hue},80%,60%)" stroke-opacity="0.35" stroke-width="2" />
  <text x="50%" y="50%" font-family="'Segoe UI', sans-serif" font-size="${fontSize}" fill="#f2f2f7" fill-opacity="0.9" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
