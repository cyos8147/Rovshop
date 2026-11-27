// Client-side banner renderer for the skin sorter. Everything is drawn on a
// <canvas> in the visitor's browser, so generating a banner costs the server
// nothing beyond serving the skin images.

import { SKIN_TIER_COLORS, SKIN_TIER_LABELS, SKIN_TIERS, type SkinTier } from "@/lib/types";

export type BannerSkin = {
  id: string;
  name: string;
  heroName: string;
  tier: string;
  imageUrl: string | null;
};

export type BannerInfo = {
  title: string;
  rank: string;
  heroCount: string;
  price: string;
  contact: string;
  note: string;
};

export const BANNER_THEMES = {
  royal: {
    label: "Royal",
    bgTop: "#1a1033",
    bgBottom: "#07070f",
    accent: "#e8b64a",
    accent2: "#7c5cff",
    text: "#f2f2f7",
    muted: "#a5a5c0",
    tile: "#181828",
  },
  inferno: {
    label: "Inferno",
    bgTop: "#2a0a08",
    bgBottom: "#0a0505",
    accent: "#ff7a1a",
    accent2: "#ff3d3d",
    text: "#fff4ec",
    muted: "#c9a896",
    tile: "#221212",
  },
  frost: {
    label: "Frost",
    bgTop: "#06223a",
    bgBottom: "#030b14",
    accent: "#4fd8ff",
    accent2: "#7c9bff",
    text: "#eef8ff",
    muted: "#93b3c9",
    tile: "#0d1d2c",
  },
  mono: {
    label: "Mono",
    bgTop: "#1c1c1c",
    bgBottom: "#050505",
    accent: "#ffffff",
    accent2: "#8a8a8a",
    text: "#ffffff",
    muted: "#a3a3a3",
    tile: "#161616",
  },
} as const;

export type BannerThemeKey = keyof typeof BANNER_THEMES;

export type BannerOptions = {
  info: BannerInfo;
  skins: BannerSkin[];
  theme: BannerThemeKey;
  showNames: boolean;
  fontFamily: string;
  watermark: string;
};

const WIDTH = 1080;
const PAD = 48;
const GAP = 12;

function columnsFor(count: number) {
  if (count <= 8) return 4;
  if (count <= 20) return 5;
  if (count <= 42) return 6;
  if (count <= 80) return 8;
  if (count <= 150) return 10;
  return 12;
}

function tierColor(tier: string) {
  return SKIN_TIER_COLORS[tier as SkinTier] ?? SKIN_TIER_COLORS.NORMAL;
}

function tierLabel(tier: string) {
  return SKIN_TIER_LABELS[tier as SkinTier] ?? tier;
}

function hashHue(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash % 360;
}

// --- Image loading (cached across re-renders) ------------------------------

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(url);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    // Needed so images from Supabase Storage (another origin, served with
    // CORS headers) don't taint the canvas and block the PNG export.
    img.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => resolve(null), 10_000);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
  imageCache.set(url, promise);
  return promise;
}

// --- Drawing helpers -------------------------------------------------------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + "…").width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + "…";
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  // Bias the crop upward: skin art usually has the face near the top.
  const sx = (img.naturalWidth - sw) / 2;
  const sy = Math.max(0, (img.naturalHeight - sh) * 0.3);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  color: string,
  textColor: string,
  font: string
) {
  ctx.font = `400 22px ${font}`;
  const labelW = ctx.measureText(label).width;
  ctx.font = `600 26px ${font}`;
  const valueW = ctx.measureText(value).width;
  const w = labelW + valueW + 44;
  const h = 48;

  roundRect(ctx, x, y, w, h, 24);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textBaseline = "middle";
  ctx.font = `400 22px ${font}`;
  ctx.fillStyle = textColor;
  ctx.globalAlpha = 0.7;
  ctx.fillText(label, x + 18, y + h / 2 + 1);
  ctx.globalAlpha = 1;
  ctx.font = `600 26px ${font}`;
  ctx.fillStyle = color;
  ctx.fillText(value, x + 26 + labelW, y + h / 2 + 1);
  return w;
}

// --- Main entry ------------------------------------------------------------

export async function renderBanner(canvas: HTMLCanvasElement, options: BannerOptions) {
  const { info, skins, showNames, fontFamily: font, watermark } = options;
  const theme = BANNER_THEMES[options.theme] ?? BANNER_THEMES.royal;

  const cols = columnsFor(skins.length);
  const tileW = (WIDTH - PAD * 2 - GAP * (cols - 1)) / cols;
  const tileH = Math.round(tileW * 1.25);
  const rows = Math.max(1, Math.ceil(skins.length / cols));

  const headerH = 300;
  const gridH = rows * tileH + (rows - 1) * GAP;
  const footerH = info.contact || info.note ? 170 : 110;
  const height = headerH + gridH + footerH;

  // Load all pictures before touching the canvas so the visible preview
  // never flashes half-drawn.
  const images = await Promise.all(skins.map((skin) => (skin.imageUrl ? loadImage(skin.imageUrl) : null)));

  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, theme.bgTop);
  bg.addColorStop(Math.min(1, 600 / height), theme.bgBottom);
  bg.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, height);

  const glow = ctx.createRadialGradient(WIDTH * 0.85, 0, 0, WIDTH * 0.85, 0, 520);
  glow.addColorStop(0, theme.accent2 + "55");
  glow.addColorStop(1, theme.accent2 + "00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, 600);

  // Header: title + price
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const priceText = info.price.trim() ? `฿${info.price.trim()}` : "";
  ctx.font = `700 72px ${font}`;
  const priceW = priceText ? ctx.measureText(priceText).width : 0;

  ctx.font = `700 60px ${font}`;
  ctx.fillStyle = theme.text;
  const title = info.title.trim() || "ขายไอดี RoV";
  ctx.fillText(fitText(ctx, title, WIDTH - PAD * 2 - priceW - 40), PAD, PAD + 60);

  if (priceText) {
    ctx.font = `700 72px ${font}`;
    ctx.textAlign = "right";
    ctx.fillStyle = theme.accent;
    ctx.fillText(priceText, WIDTH - PAD, PAD + 64);
    ctx.textAlign = "left";
  }

  // Stat chips
  let chipX = PAD;
  const chipY = PAD + 100;
  const chips: [string, string][] = [];
  if (info.rank.trim()) chips.push(["แรงค์", info.rank.trim()]);
  if (info.heroCount.trim()) chips.push(["ฮีโร่", info.heroCount.trim()]);
  chips.push(["สกิน", String(skins.length)]);
  for (const [label, value] of chips) {
    chipX += drawChip(ctx, chipX, chipY, label, value, theme.accent, theme.text, font) + 12;
  }

  // Tier summary
  const counts = new Map<string, number>();
  for (const skin of skins) counts.set(skin.tier, (counts.get(skin.tier) ?? 0) + 1);
  let tx = PAD;
  const ty = chipY + 100;
  ctx.font = `500 24px ${font}`;
  ctx.textBaseline = "middle";
  for (const tier of SKIN_TIERS) {
    const n = counts.get(tier);
    if (!n) continue;
    const text = `${tierLabel(tier)} ×${n}`;
    const w = ctx.measureText(text).width;
    if (tx + w + 30 > WIDTH - PAD) break;
    ctx.fillStyle = tierColor(tier);
    ctx.beginPath();
    ctx.arc(tx + 7, ty, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.text;
    ctx.fillText(text, tx + 22, ty + 1);
    tx += w + 50;
  }

  // Divider
  const divider = ctx.createLinearGradient(PAD, 0, WIDTH - PAD, 0);
  divider.addColorStop(0, theme.accent);
  divider.addColorStop(1, theme.accent + "00");
  ctx.fillStyle = divider;
  ctx.fillRect(PAD, headerH - 26, WIDTH - PAD * 2, 3);

  // Skin grid
  const radius = Math.max(6, tileW * 0.08);
  const nameSize = Math.max(11, Math.round(tileW * 0.12));
  const heroSize = Math.max(9, Math.round(tileW * 0.095));
  const badgeSize = Math.max(10, Math.round(tileW * 0.11));

  skins.forEach((skin, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = PAD + col * (tileW + GAP);
    const y = headerH + row * (tileH + GAP);
    const color = tierColor(skin.tier);

    ctx.save();
    roundRect(ctx, x, y, tileW, tileH, radius);
    ctx.clip();

    const img = images[index];
    if (img) {
      drawCover(ctx, img, x, y, tileW, tileH);
    } else {
      const hue = hashHue(skin.heroName + skin.name);
      const fill = ctx.createLinearGradient(x, y, x + tileW, y + tileH);
      fill.addColorStop(0, `hsl(${hue},55%,28%)`);
      fill.addColorStop(1, `hsl(${(hue + 50) % 360},55%,12%)`);
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, tileW, tileH);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.font = `700 ${Math.round(tileW * 0.42)}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(skin.heroName.slice(0, 1).toUpperCase(), x + tileW / 2, y + tileH * 0.42);
      ctx.textAlign = "left";
    }

    if (showNames) {
      const shade = ctx.createLinearGradient(0, y + tileH * 0.5, 0, y + tileH);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,0.88)");
      ctx.fillStyle = shade;
      ctx.fillRect(x, y + tileH * 0.5, tileW, tileH * 0.5);

      const inner = tileW - 12;
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#ffffff";
      ctx.font = `600 ${nameSize}px ${font}`;
      ctx.fillText(fitText(ctx, skin.name, inner), x + 6, y + tileH - heroSize - 10);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `400 ${heroSize}px ${font}`;
      ctx.fillText(fitText(ctx, skin.heroName, inner), x + 6, y + tileH - 6);
    }
    ctx.restore();

    // Tier badge + border (outside the clip so the stroke isn't halved)
    roundRect(ctx, x, y, tileW, tileH, radius);
    ctx.strokeStyle = color;
    ctx.lineWidth = skin.tier === "NORMAL" ? 1 : 2.5;
    ctx.stroke();

    if (skin.tier !== "NORMAL") {
      ctx.font = `700 ${badgeSize}px ${font}`;
      const label = tierLabel(skin.tier);
      const bw = ctx.measureText(label).width + badgeSize * 0.9;
      const bh = badgeSize * 1.5;
      roundRect(ctx, x + 4, y + 4, bw, bh, bh / 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = "#0a0a14";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + 4 + badgeSize * 0.45, y + 4 + bh / 2 + 1);
    }
  });

  if (skins.length === 0) {
    ctx.fillStyle = theme.muted;
    ctx.font = `400 32px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ยังไม่ได้เลือกสกิน", WIDTH / 2, headerH + tileH / 2);
    ctx.textAlign = "left";
  }

  // Footer
  let fy = headerH + gridH + 50;
  ctx.textBaseline = "alphabetic";
  if (info.contact.trim()) {
    ctx.font = `600 32px ${font}`;
    ctx.fillStyle = theme.accent;
    ctx.fillText(fitText(ctx, `ติดต่อ: ${info.contact.trim()}`, WIDTH - PAD * 2), PAD, fy + 10);
    fy += 46;
  }
  if (info.note.trim()) {
    ctx.font = `400 26px ${font}`;
    ctx.fillStyle = theme.text;
    ctx.fillText(fitText(ctx, info.note.trim(), WIDTH - PAD * 2), PAD, fy + 6);
  }

  if (watermark) {
    ctx.font = `400 20px ${font}`;
    ctx.fillStyle = theme.muted;
    ctx.textAlign = "right";
    ctx.fillText(watermark, WIDTH - PAD, height - 28);
    ctx.textAlign = "left";
  }
}
