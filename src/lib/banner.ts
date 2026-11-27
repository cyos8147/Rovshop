// Client-side banner renderer for the skin sorter. Everything is drawn on a
// <canvas> in the visitor's browser, so generating a banner costs the server
// nothing beyond serving the skin images.


export type BannerSkin = {
  id: string;
  name: string;
  heroName: string;
  imageUrl: string | null;
};

export type BannerInfo = {
  // product / account details
  code: string;
  heroCount: string;
  skinCount: string; // blank = number of selected skins
  winRate: string;
  matches: string;
  // price
  price: string;
  priceOnly: boolean; // show just the number, without "ราคา" / "บาท"
  installment: string;
  detail: string;
  // rank & extras
  rank: string;
  vip: string;
  nameCards: string;
  coupons: string;
  extraItem: string;
  // footer
  contact: string;
  note: string;
};

export const EMPTY_INFO: BannerInfo = {
  code: "",
  heroCount: "",
  skinCount: "",
  winRate: "",
  matches: "",
  price: "",
  priceOnly: false,
  installment: "",
  detail: "",
  rank: "",
  vip: "",
  nameCards: "",
  coupons: "",
  extraItem: "",
  contact: "",
  note: "",
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

// Everything the visitor can design (as opposed to what is being sold).
export type BannerDesign = {
  info: BannerInfo;
  theme: BannerThemeKey;
  showNames: boolean;
  // Header picture the visitor uploaded (cropped data URL), or null.
  background: string | null;
  // Skins per row; 0 = choose automatically from the number of skins.
  skinsPerRow: number;
};

export const DEFAULT_DESIGN: BannerDesign = {
  info: EMPTY_INFO,
  theme: "royal",
  showNames: true,
  background: null,
  skinsPerRow: 0,
};

export type BannerOptions = {
  design: BannerDesign;
  skins: BannerSkin[];
  fontFamily: string;
  watermark: BannerWatermark | null;
  // Until a banner is paid for, the on-screen copy gets a tiled "ตัวอย่าง"
  // overlay so the preview can't simply be screenshotted instead of paying.
  preview: boolean;
};

export type BannerWatermark = { text: string; brand: string; suffix: string };

export const BANNER_WIDTH = 1080;
// Header is a fixed 1080x600 so the background cropper can match it exactly.
export const BANNER_HEADER_HEIGHT = 600;
const WIDTH = BANNER_WIDTH;
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

// --- Header helpers ----------------------------------------------------------

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, "");

// "1290" -> "1,290"; non-numeric text is left as typed (never "NaN").
function fmtNum(value: string): string {
  const d = digitsOnly(value);
  if (!d || d.length > 12) return value.trim();
  return Number(d).toLocaleString("en-US");
}

type Run = { text: string; color: string; scale?: number };

// Draws coloured pieces on one baseline with a soft shadow so the text stays
// readable over any picture; shrinks the size until the line fits maxW.
function drawRuns(
  ctx: CanvasRenderingContext2D,
  runs: Run[],
  x: number,
  y: number,
  size: number,
  maxW: number,
  font: string,
  weight = 700
) {
  let s = size;
  const measure = () => {
    let w = 0;
    for (const r of runs) {
      ctx.font = `${weight} ${Math.round(s * (r.scale ?? 1))}px ${font}`;
      w += ctx.measureText(r.text).width;
    }
    return w;
  };
  while (s > 22 && measure() > maxW) s -= 2;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  let cx = x;
  for (const r of runs) {
    ctx.font = `${weight} ${Math.round(s * (r.scale ?? 1))}px ${font}`;
    ctx.fillStyle = r.color;
    ctx.fillText(r.text, cx, y);
    cx += ctx.measureText(r.text).width;
  }
  ctx.restore();
  return cx;
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  design: BannerDesign,
  skins: BannerSkin[],
  bg: HTMLImageElement | null,
  font: string
) {
  const { info } = design;
  const theme = BANNER_THEMES[design.theme] ?? BANNER_THEMES.royal;
  const H = BANNER_HEADER_HEIGHT;
  const innerW = WIDTH - PAD * 2;

  // Background: the visitor's picture, or a themed gradient with soft glows.
  if (bg) {
    drawCover(ctx, bg, 0, 0, WIDTH, H);
    const shade = ctx.createLinearGradient(0, 0, WIDTH, 0);
    shade.addColorStop(0, "rgba(0,0,0,0.72)");
    shade.addColorStop(0.55, "rgba(0,0,0,0.35)");
    shade.addColorStop(1, "rgba(0,0,0,0.05)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, WIDTH, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, WIDTH, H);
    g.addColorStop(0, theme.bgTop);
    g.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, H);
    const glow = ctx.createRadialGradient(WIDTH * 0.85, H * 0.25, 0, WIDTH * 0.85, H * 0.25, 520);
    glow.addColorStop(0, theme.accent2 + "66");
    glow.addColorStop(1, theme.accent2 + "00");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, H);
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    for (let i = -H; i < WIDTH; i += 46) {
      ctx.beginPath();
      ctx.moveTo(i, H);
      ctx.lineTo(i + H, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Fade the bottom into the page so the skin grid joins smoothly.
  const fade = ctx.createLinearGradient(0, H - 170, 0, H);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = fade;
  ctx.fillRect(0, H - 170, WIDTH, 170);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Product code
  if (info.code.trim()) {
    drawRuns(ctx, [{ text: info.code.trim(), color: theme.accent }], PAD, 70, 36, innerW, font, 700);
  }

  // Big line: heroes & skins
  const skinTotal = info.skinCount.trim() ? fmtNum(info.skinCount) : String(skins.length);
  const bigRuns: Run[] = [];
  if (info.heroCount.trim()) {
    bigRuns.push({ text: "ฮีโร่ ", color: "#ffffff" }, { text: `${fmtNum(info.heroCount)}  `, color: theme.accent });
  }
  bigRuns.push({ text: "สกิน ", color: "#ffffff" }, { text: skinTotal, color: theme.accent });
  drawRuns(ctx, bigRuns, PAD, 160, 88, innerW, font, 800);

  // Win rate & matches
  const statRuns: Run[] = [];
  if (info.winRate.trim()) {
    statRuns.push(
      { text: "อัตราชนะ ", color: "#ffffff" },
      { text: `${info.winRate.replace(/%/g, "").trim()}%`, color: theme.accent },
      { text: "   ", color: "#ffffff" }
    );
  }
  if (info.matches.trim()) {
    statRuns.push({ text: "จำนวนเล่น ", color: "#ffffff" }, { text: fmtNum(info.matches), color: theme.accent });
  }
  if (statRuns.length) drawRuns(ctx, statRuns, PAD, 216, 40, innerW, font, 600);

  // Rank / VIP / items as chips, wrapping onto a second row if needed
  const chips: [string, string][] = [];
  if (info.rank.trim()) chips.push(["แรงค์", info.rank.trim()]);
  if (info.vip.trim()) chips.push(["VIP", info.vip.trim()]);
  if (info.nameCards.trim()) chips.push(["บัตรเปลี่ยนชื่อ", `${fmtNum(info.nameCards)} ใบ`]);
  if (info.coupons.trim()) chips.push(["คูปอง", `${fmtNum(info.coupons)} ใบ`]);
  if (info.extraItem.trim()) chips.push(["", info.extraItem.trim()]);
  let cx = PAD;
  let cy = 250;
  for (const [label, value] of chips) {
    ctx.font = `400 22px ${font}`;
    const labelW = label ? ctx.measureText(label).width : 0;
    ctx.font = `600 26px ${font}`;
    const w = labelW + ctx.measureText(value).width + 44;
    if (cx + w > WIDTH - PAD && cx > PAD) {
      cx = PAD;
      cy += 58;
    }
    cx += drawChip(ctx, cx, cy, label, value, theme.accent, "#ffffff", font) + 12;
  }

  // Price block (bottom-left of the header)
  if (info.installment.trim()) {
    drawRuns(ctx, [{ text: info.installment.trim(), color: "#ffffff" }], PAD, H - 150, 32, innerW, font, 600);
  }
  if (info.price.trim()) {
    const num = fmtNum(info.price);
    const runs: Run[] = info.priceOnly
      ? [{ text: num, color: theme.accent }]
      : [
          { text: "ราคา ", color: "#ffffff", scale: 0.6 },
          { text: num, color: theme.accent },
          { text: " บาท", color: "#ffffff", scale: 0.6 },
        ];
    drawRuns(ctx, runs, PAD, H - 62, 104, innerW, font, 800);
  }
  if (info.detail.trim()) {
    drawRuns(ctx, [{ text: info.detail.trim(), color: theme.muted }], PAD, H - 18, 28, innerW, font, 500);
  }
}

// --- Main entry ------------------------------------------------------------

export async function renderBanner(canvas: HTMLCanvasElement, options: BannerOptions) {
  const { design, skins, fontFamily: font, watermark } = options;
  const { info, showNames } = design;
  const theme = BANNER_THEMES[design.theme] ?? BANNER_THEMES.royal;

  const cols = design.skinsPerRow > 0 ? Math.min(12, Math.max(3, design.skinsPerRow)) : columnsFor(skins.length);
  const tileW = (WIDTH - PAD * 2 - GAP * (cols - 1)) / cols;
  const tileH = Math.round(tileW * 1.25);
  const rows = Math.max(1, Math.ceil(skins.length / cols));

  const headerH = BANNER_HEADER_HEIGHT;
  const gridH = rows * tileH + (rows - 1) * GAP;
  const footerH = info.contact || info.note ? 170 : 110;
  const height = headerH + gridH + footerH;

  // Load all pictures before touching the canvas so the visible preview
  // never flashes half-drawn.
  const [bgImage, ...images] = await Promise.all([
    design.background ? loadImage(design.background) : null,
    ...skins.map((skin) => (skin.imageUrl ? loadImage(skin.imageUrl) : null)),
  ]);

  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Page background below the header
  ctx.fillStyle = theme.bgBottom;
  ctx.fillRect(0, 0, WIDTH, height);

  drawHeader(ctx, design, skins, bgImage, font);

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

    // Border (outside the clip so the stroke isn't halved)
    roundRect(ctx, x, y, tileW, tileH, radius);
    ctx.strokeStyle = theme.accent + "99";
    ctx.lineWidth = 2;
    ctx.stroke();
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
    // Drawn right-aligned, piece by piece: "ทำป้ายฟรีที่ OSCAR Gaming images"
    // with OSCAR bold in the accent colour.
    const parts: [string, string, string][] = [
      [`${watermark.text} `, `400 20px ${font}`, theme.muted],
      [watermark.brand, `900 26px ${font}`, theme.accent],
      [` ${watermark.suffix}`, `400 16px ${font}`, theme.muted],
    ];
    const widths = parts.map(([text, f]) => {
      ctx.font = f;
      return ctx.measureText(text).width;
    });
    let wx = WIDTH - PAD - widths.reduce((a, b) => a + b, 0);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    parts.forEach(([text, f, color], i) => {
      ctx.font = f;
      ctx.fillStyle = color;
      ctx.fillText(text, wx, height - 28);
      wx += widths[i];
    });
  }

  if (options.preview) {
    ctx.save();
    ctx.translate(WIDTH / 2, height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.font = `900 64px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    const span = Math.hypot(WIDTH, height);
    for (let y = -span / 2; y < span / 2; y += 170) {
      for (let x = -span / 2; x < span / 2; x += 560) {
        const offset = (Math.round(y / 170) % 2) * 280;
        ctx.strokeText("ตัวอย่าง · OSCAR", x + offset, y);
        ctx.fillText("ตัวอย่าง · OSCAR", x + offset, y);
      }
    }
    ctx.restore();
  }
}
