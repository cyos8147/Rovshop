// Finds a grid of equal-sized cards in a screenshot, reads the skin name at
// the bottom of each card (OCR in the browser) and matches it to a list of
// skin names. Everything here runs in the browser (canvas + tesseract.js).

export type Rect = { x: number; y: number; w: number; h: number };

const ANALYSIS_WIDTH = 600;

// ---- 1. Find the cards -----------------------------------------------------

function runs(flags: boolean[], maxHole: number): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  let hole = 0;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i]) {
      if (start < 0) start = i;
      hole = 0;
    } else if (start >= 0) {
      hole++;
      if (hole > maxHole) {
        out.push([start, i - hole]);
        start = -1;
        hole = 0;
      }
    }
  }
  if (start >= 0) out.push([start, flags.length - 1 - hole]);
  return out;
}

// Returns the card rectangles in the image's own pixel coordinates, in reading
// order, plus where the card area starts (gridTop, or null). Only cards of the
// usual size are returned (cut-off ones at the edge of the screenshot are left out).
export function detectCards(
  source: CanvasImageSource,
  naturalW: number,
  naturalH: number
): { cards: Rect[]; gridTop: number | null } {
  const scale = Math.min(1, ANALYSIS_WIDTH / naturalW);
  const W = Math.max(1, Math.round(naturalW * scale));
  const H = Math.max(1, Math.round(naturalH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { cards: [], gridTop: null };
  ctx.drawImage(source, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;

  // Page background = the most common colour in the left and right edge strips.
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  const addPixel = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    const key = (data[i] >> 4) * 256 + (data[i + 1] >> 4) * 16 + (data[i + 2] >> 4);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n++;
    bin.r += data[i];
    bin.g += data[i + 1];
    bin.b += data[i + 2];
    bins.set(key, bin);
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < 3; x++) {
      addPixel(x, y);
      addPixel(W - 1 - x, y);
    }
  }
  let best = { n: 0, r: 0, g: 0, b: 0 };
  bins.forEach((bin) => {
    if (bin.n > best.n) best = bin;
  });
  const bg = [best.r / best.n, best.g / best.n, best.b / best.n];

  const mask = new Uint8Array(W * H);
  for (let i = 0, p = 0; p < W * H; i += 4, p++) {
    const d = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
    mask[p] = d > 40 ? 1 : 0;
  }

  // Rows that are mostly card, then columns inside each band of rows.
  const rowFlags: boolean[] = [];
  for (let y = 0; y < H; y++) {
    let count = 0;
    for (let x = 0; x < W; x++) count += mask[y * W + x];
    rowFlags.push(count / W > 0.3);
  }
  const rects: Rect[] = [];
  let gridTopScaled: number | null = null;
  for (const [y0, y1] of runs(rowFlags, 3)) {
    if (y1 - y0 < H * 0.02) continue;
    const colFlags: boolean[] = [];
    for (let x = 0; x < W; x++) {
      let count = 0;
      for (let y = y0; y <= y1; y++) count += mask[y * W + x];
      colFlags.push(count / (y1 - y0 + 1) > 0.5);
    }
    const band = runs(colFlags, 3).map(([x0, x1]) => ({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }));
    if (typeof localStorage !== "undefined" && localStorage.getItem("ocrDebug")) {
      console.log("OCR-ROW", y0, y1, JSON.stringify(band.map((r) => [r.x, r.w])), "bg", bg.map(Math.round).join(","));
    }
    rects.push(...band);
    // A row of cards = two or more blocks of about the same width.
    // (thin slivers such as a scroll bar at the edge of the screen are ignored)
    const wide = band.filter((r) => r.w > W * 0.05);
    if (gridTopScaled === null && wide.length >= 2) {
      const first = wide[0].w;
      if (first > W * 0.1 && wide.every((r) => Math.abs(r.w - first) / first < 0.15)) gridTopScaled = y0;
    }
  }

  // Keep card-shaped rectangles of the biggest common size.
  const shaped = rects.filter((r) => r.w / r.h > 0.4 && r.w / r.h < 1.8 && r.w * r.h > W * H * 0.015);
  const gridTop = gridTopScaled === null ? null : Math.round(gridTopScaled / scale);
  if (shaped.length === 0) return { cards: [], gridTop };
  const biggest = shaped.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
  const picked = shaped.filter(
    (r) => Math.abs(r.w - biggest.w) / biggest.w < 0.12 && Math.abs(r.h - biggest.h) / biggest.h < 0.12
  );
  // Snap every card to the grid: all cards share one size (the lower median, so a
  // scroll bar or a shadow stuck to one card does not make it wider) and the
  // column / row positions of the cards around it.
  const lowerMedian = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) / 2)];
  const cw = lowerMedian(picked.map((c) => c.w));
  const ch = lowerMedian(picked.map((c) => c.h));
  const ref = { x: biggest.x, y: biggest.y, w: cw, h: ch };
  const cards = picked.map((c) => ({
    x: lowerMedian(picked.filter((o) => Math.abs(o.x - c.x) < cw * 0.2).map((o) => o.x)),
    y: lowerMedian(picked.filter((o) => Math.abs(o.y - c.y) < ch * 0.3).map((o) => o.y)),
    w: cw,
    h: ch,
  }));

  cards.sort((a, b) => (Math.abs(a.y - b.y) > ref.h * 0.4 ? a.y - b.y : a.x - b.x));

  // Rows after the last full row: a single card, or a card with very dark artwork, can
  // look "not full" in the row scan. Use the column positions, card size and gap of the
  // rows above to look for more cards below, and keep a position when most of it has content.
  const colXs: number[] = [];
  for (const c of cards) if (!colXs.some((x) => Math.abs(x - c.x) < ref.w * 0.2)) colXs.push(c.x);
  colXs.sort((a, b) => a - b);
  const rowYs: number[] = [];
  for (const c of cards) if (!rowYs.some((y) => Math.abs(y - c.y) < ref.h * 0.3)) rowYs.push(c.y);
  rowYs.sort((a, b) => a - b);
  const gap =
    colXs.length >= 2 ? Math.max(2, colXs[1] - colXs[0] - ref.w) : rowYs.length >= 2 ? Math.max(2, rowYs[1] - rowYs[0] - ref.h) : 6;
  // The button bar at the bottom of the screen (a block spanning nearly the whole width) ends the card area.
  const bar = rects.filter((r) => r.w > W * 0.9 && r.y > ref.y).map((r) => r.y);
  const limit = bar.length ? Math.min(...bar) : H;
  const coverage = (x: number, y: number) => {
    let hit = 0;
    let total = 0;
    for (let yy = y; yy < Math.min(H, y + ref.h); yy += 2) {
      for (let xx = x; xx < Math.min(W, x + ref.w); xx += 2) {
        total++;
        hit += mask[yy * W + xx];
      }
    }
    return total ? hit / total : 0;
  };
  let nextY = rowYs.length ? rowYs[rowYs.length - 1] + ref.h + gap : 0;
  while (rowYs.length && nextY + ref.h <= limit + 1) {
    let added = 0;
    for (const x of colXs) {
      const taken = cards.some((c) => Math.abs(c.x - x) < ref.w * 0.3 && Math.abs(c.y - nextY) < ref.h * 0.5);
      if (!taken && coverage(x, nextY) > 0.6) {
        cards.push({ x, y: nextY, w: ref.w, h: ref.h });
        added++;
      }
    }
    if (added === 0) break;
    nextY += ref.h + gap;
  }
  cards.sort((a, b) => (Math.abs(a.y - b.y) > ref.h * 0.4 ? a.y - b.y : a.x - b.x));
  const inset = Math.max(1, Math.round(ref.w * 0.006));
  return {
    gridTop,
    cards: cards.map((r) => ({
      x: Math.round((r.x + inset) / scale),
      y: Math.round((r.y + inset) / scale),
      w: Math.round((r.w - inset * 2) / scale),
      h: Math.round((r.h - inset * 2) / scale),
    })),
  };
}

// ---- 2. Read the name ------------------------------------------------------

// Draws the bottom part of a card (where the skin name is) as black text on
// white, keeping only near-white pixels, which suits OCR.
export function nameStripCanvas(source: CanvasImageSource, card: Rect): HTMLCanvasElement {
  const sy = card.y + card.h * 0.66;
  const sh = card.h * 0.34;
  const outW = 720;
  const outH = Math.max(1, Math.round((sh / card.w) * outW));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(source, card.x, sy, card.w, sh, 0, 0, outW, outH);
  const img = ctx.getImageData(0, 0, outW, outH);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    const min = Math.min(d[i], d[i + 1], d[i + 2]);
    const text = min > 190 && max - min < 70;
    const v = text ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// The hero's name sits in the bar just above the card area (left of the page
// counter). Returns that strip as black text on white, or null.
export function heroStripCanvas(source: CanvasImageSource, naturalW: number, naturalH: number, gridTop: number | null) {
  if (gridTop === null) return null;
  const y0 = Math.max(0, gridTop - naturalH * 0.058);
  const h = naturalH * 0.046;
  const x0 = naturalW * 0.11;
  const w = naturalW * 0.55;
  if (h < 10 || w < 10) return null;
  const outW = 800;
  const outH = Math.max(1, Math.round((h / w) * outW));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, x0, y0, w, h, 0, 0, outW, outH);
  const img = ctx.getImageData(0, 0, outW, outH);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(d[i], d[i + 1], d[i + 2]) > 150 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // Crop to the text itself and scale it to a fixed line height.
  let minX = outW, maxX = -1, minY = outH, maxY = -1;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      if (d[(y * outW + x) * 4] === 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || maxY - minY < 6) return null;
  const pad = 14;
  const textH = maxY - minY + 1;
  const k = 90 / textH;
  const line = document.createElement("canvas");
  line.width = Math.min(1400, Math.round((maxX - minX + 1) * k) + pad * 2);
  line.height = 90 + pad * 2;
  const lctx = line.getContext("2d");
  if (!lctx) return null;
  lctx.fillStyle = "#fff";
  lctx.fillRect(0, 0, line.width, line.height);
  lctx.drawImage(canvas, minX, minY, maxX - minX + 1, textH, pad, pad, line.width - pad * 2, 90);
  return line;
}

// Tidies OCR output into a usable name: letters, digits, space and : ' - .
export function cleanName(read: string): string {
  return read
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^A-Za-z0-9 :'.-]+/g, " ")
    // The curly apostrophe is sometimes read as two marks (X''mas): keep one.
    .replace(/'{2,}/g, "'")
    // In these Title Case names a word that starts with a small "l" is an "I" (Idol, Ice ...)
    .replace(/(^|\s)l(?=[a-z]{3,})/g, "$1I")
    .replace(/\s+/g, " ")
    .replace(/^[\s:.'-]+|[\s:.'-]+$/g, "")
    .trim();
}

// ---- EVO badge ------------------------------------------------------------

// The badge in the top-right corner of a card ("EVO" and a level I-V for
// evolving skins), as black text on white for OCR.
export function badgeStripCanvas(source: CanvasImageSource, card: Rect): HTMLCanvasElement {
  const sx = card.x + card.w * 0.4;
  const sw = card.w * 0.6;
  const sh = card.h * 0.24;
  const outW = 600;
  const outH = Math.max(1, Math.round((sh / sw) * outW));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(source, sx, card.y, sw, sh, 0, 0, outW, outH);
  const img = ctx.getImageData(0, 0, outW, outH);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    const min = Math.min(d[i], d[i + 1], d[i + 2]);
    const text = min > 165 && max - min < 95;
    const v = text ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// "EVO" with its level from a badge reading: "EVO IV", "EVO", or "" when the
// badge is not an EVO badge.
export function parseEvo(read: string): string {
  const text = read.replace(/[|!1l]/g, "I").toUpperCase();
  const m = text.match(/EV[O0Q]\s*([IVX]{1,4})?/);
  if (!m) return "";
  const level = (m[1] ?? "").replace(/[^IV]/g, "");
  const valid = ["I", "II", "III", "IV", "V"];
  return valid.includes(level) ? `EVO ${level}` : "EVO";
}

// A finer fingerprint of the badge corner only (32x12), to tell apart cards whose
// artwork is the same and only the EVO level differs.
export function badgeHash(source: CanvasImageSource, card: Rect): string {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 12;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, card.x + card.w * 0.4, card.y, card.w * 0.6, card.h * 0.24, 0, 0, 32, 12);
  const d = ctx.getImageData(0, 0, 32, 12).data;
  const grey: number[] = [];
  for (let i = 0; i < d.length; i += 4) grey.push(0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]);
  const mean = grey.reduce((x, y) => x + y, 0) / grey.length;
  return grey.map((v) => (v > mean ? "1" : "0")).join("");
}

// The EVO level of a card from its badge, or "" when it cannot be told.
// Each level has its own badge: I light blue, II-IV dark teal with a numeral
// below "EVO" (told apart by how much numeral there is), V dark brown, and the
// base form a flat salmon badge with no numeral.
export function evoLevel(source: CanvasImageSource, card: Rect): string {
  const W = 360;
  const sw = card.w * 0.6;
  const sh = card.h * 0.3;
  const H = Math.max(1, Math.round((sh / sw) * W));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  ctx.drawImage(source, card.x + card.w * 0.4, card.y, sw, sh, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const bright = new Uint8Array(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += 4) bright[p] = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2] > 175 ? 1 : 0;

  // Connected bright blobs.
  type Blob = { x0: number; x1: number; y0: number; y1: number; n: number };
  const label = new Int32Array(W * H).fill(-1);
  const blobs: Blob[] = [];
  const queue: number[] = [];
  for (let start = 0; start < W * H; start++) {
    if (!bright[start] || label[start] >= 0) continue;
    const b: Blob = { x0: W, x1: 0, y0: H, y1: 0, n: 0 };
    label[start] = blobs.length;
    queue.length = 0;
    queue.push(start);
    while (queue.length) {
      const p = queue.pop()!;
      const x = p % W;
      const y = (p - x) / W;
      b.n++;
      if (x < b.x0) b.x0 = x;
      if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y;
      if (y > b.y1) b.y1 = y;
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (q < 0 || q >= W * H) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue;
        if (bright[q] && label[q] < 0) {
          label[q] = blobs.length;
          queue.push(q);
        }
      }
    }
    blobs.push(b);
  }
  const letters = blobs
    .filter((b) => b.n > 25)
    .map((b) => ({ ...b, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 }))
    .filter((b) => b.h >= H * 0.18 && b.h <= H * 0.5 && b.w <= b.h * 1.4 && b.w >= b.h * 0.35);

  // The three letters E V O: same height, on one line, side by side.
  let best: { score: number; E: (typeof letters)[number]; V: (typeof letters)[number]; O: (typeof letters)[number] } | null = null;
  for (const E of letters)
    for (const V of letters) {
      if (V.cx <= E.cx) continue;
      for (const O of letters) {
        if (O.cx <= V.cx) continue;
        const hs = [E.h, V.h, O.h];
        if (Math.max(...hs) > 1.3 * Math.min(...hs)) continue;
        if (Math.max(Math.abs(E.cy - V.cy), Math.abs(V.cy - O.cy)) > 0.2 * Math.min(...hs)) continue;
        const g1 = V.x0 - E.x1;
        const g2 = O.x0 - V.x1;
        if (g1 < -3 || g2 < -3 || g1 > 0.4 * E.h || g2 > 0.4 * E.h || O.w < 0.6 * O.h) continue;
        const score = E.h + V.h + O.h;
        if (!best || score > best.score) best = { score, E, V, O };
      }
    }
  if (!best) return "";
  const { E, V, O } = best;
  const th = (E.h + V.h + O.h) / 3;

  // Badge colour, just outside the E and the O.
  const samples: number[][] = [];
  for (const x of [Math.round(E.x0 - 0.25 * th), Math.round(O.x1 + 0.25 * th)])
    for (const dy of [-2, 0, 2]) {
      const y = Math.round(E.cy) + dy;
      if (x >= 0 && x < W && y >= 0 && y < H) {
        const i = (y * W + x) * 4;
        samples.push([d[i], d[i + 1], d[i + 2]]);
      }
    }
  if (samples.length === 0) return "";
  const med = [0, 1, 2].map((c) => samples.map((s) => s[c]).sort((a, b) => a - b)[Math.floor(samples.length / 2)]);
  const [r, g, b] = med;
  const lightBlue = b > 135 && b > r + 50 && r > 40 && r < 110;
  const teal = r < 40 && b > 60 && b > r + 40;
  const brown = r > 70 && r < 125 && g < 55 && b < 35;
  const salmon = r > 125 && r < 185 && g > 45 && g < 85 && b > 45 && b < 85;
  if (lightBlue) return "EVO I";
  if (brown) return "EVO V";
  if (salmon) return "EVO";
  if (!teal) return "";

  // II, III or IV: the amount of numeral under the V of "EVO".
  let numeral = 0;
  const yTop = Math.round(Math.max(E.y1, V.y1, O.y1) + 0.04 * th);
  const yBottom = Math.round(Math.min(H, Math.max(E.y1, V.y1, O.y1) + 0.9 * th));
  for (let y = yTop; y < yBottom; y++)
    for (let x = Math.max(0, Math.round(V.cx - th)); x < Math.min(W, Math.round(V.cx + th)); x++) numeral += bright[y * W + x];
  const k = numeral / (th * th);
  if (typeof localStorage !== "undefined" && localStorage.getItem("ocrDebug")) console.log("EVOK", k.toFixed(3), Math.round(th));
  if (k < 0.08) return "";
  return k < 0.14 ? "EVO II" : k < 0.175 ? "EVO IV" : "EVO III";
}

// ---- Same picture twice -----------------------------------------------------

// A tiny fingerprint of a card's picture (8x8 grey, above / below its average),
// so two cards showing the same artwork can be told apart from different ones.
export function cardHash(source: CanvasImageSource, card: Rect): string {
  // Two smooth steps (to 64x64, then 8x8), so a big screenshot and a small saved
  // picture of the same card give nearly the same fingerprint.
  const mid = document.createElement("canvas");
  mid.width = 64;
  mid.height = 64;
  const mctx = mid.getContext("2d");
  if (!mctx) return "";
  mctx.imageSmoothingQuality = "high";
  // Upper part only: the name at the bottom differs between cards of one hero.
  mctx.drawImage(source, card.x, card.y, card.w, card.h * 0.6, 0, 0, 64, 64);
  const small = document.createElement("canvas");
  small.width = 8;
  small.height = 8;
  const ctx = small.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(mid, 0, 0, 64, 64, 0, 0, 8, 8);
  const d = ctx.getImageData(0, 0, 8, 8).data;
  const grey: number[] = [];
  for (let i = 0; i < d.length; i += 4) grey.push(0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]);
  const mean = grey.reduce((x, y) => x + y, 0) / grey.length;
  return grey.map((v) => (v > mean ? "1" : "0")).join("");
}

export function hashDistance(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) n++;
  return n;
}

// ---- 3. Match names --------------------------------------------------------

// Letters that the OCR mixes up are treated as the same when comparing ("Aol" ~ "Aoi").
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/[l1]/g, "i")
    .replace(/0/g, "o");

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

// 0..1, how alike two whole names are (no partial matching), for hero names.
export function nameSimilarity(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  return 1 - distance(x, y) / Math.max(x.length, y.length);
}

// 0..1, how well the read text contains the skin name (extra stray text around
// the name is fine).
export function nameScore(read: string, skinName: string): number {
  const t = normalize(read);
  const n = normalize(skinName);
  if (!t || !n) return 0;
  const whole = 1 - distance(t, n) / Math.max(t.length, n.length);
  let windowed = 0;
  for (const len of [n.length - 1, n.length, n.length + 1]) {
    if (len < 1 || len > t.length) continue;
    for (let s = 0; s + len <= t.length; s++) {
      windowed = Math.max(windowed, 1 - distance(t.slice(s, s + len), n) / n.length);
    }
  }
  return Math.max(whole, windowed);
}

// For each card, the index of the best skin (or -1). A skin is used once.
export function matchCards(reads: string[], skinNames: string[], minScore = 0.55): number[] {
  const pairs: { card: number; skin: number; score: number }[] = [];
  reads.forEach((read, card) => {
    skinNames.forEach((name, skin) => pairs.push({ card, skin, score: nameScore(read, name) }));
  });
  pairs.sort((a, b) => b.score - a.score);
  const result = reads.map(() => -1);
  const usedSkins = new Set<number>();
  for (const pair of pairs) {
    if (pair.score < minScore) break;
    if (result[pair.card] !== -1 || usedSkins.has(pair.skin)) continue;
    result[pair.card] = pair.skin;
    usedSkins.add(pair.skin);
  }
  return result;
}

// ---- 4. OCR worker ---------------------------------------------------------

export type NameReading = {
  text: string;
  // A word was too unclear to keep, or the name ends in a colon: it may be incomplete.
  unsure: boolean;
  // Lowest confidence (0-100) of the words that were kept; 0 when nothing was kept.
  minConfidence: number;
};

// One OCR worker that can read many strips (create once, read, then close).
export async function createNameReader() {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr/core",
    langPath: "/ocr/lang",
    gzip: true,
  });
  await worker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :'\u2019-.",
  });
  let mode = "";
  let count = 0;
  return {
    async read(strip: HTMLCanvasElement, singleLine = false): Promise<NameReading> {
      const want = singleLine ? "7" : "6";
      if (mode !== want) {
        await worker.setParameters({ tessedit_pageseg_mode: want as never });
        mode = want;
      }
      const { data } = await worker.recognize(strip, {}, { text: true, blocks: true });
      const all = (data.blocks ?? [])
        .flatMap((block) => block.paragraphs)
        .flatMap((paragraph) => paragraph.lines)
        .flatMap((line) => line.words);
      if (typeof localStorage !== "undefined" && localStorage.getItem("ocrDebug")) {
        console.log("OCR", count, all.map((word) => `${word.text}(${Math.round(word.confidence)})`).join(" "));
      }
      count++;
      // Keep confident words. Short fragments (1-3 characters) must be very
      // confident: they are usually stray marks from the artwork behind the text.
      const kept = all.filter((word) => {
        const letters = (word.text.match(/[A-Za-z0-9]/g) ?? []).length;
        if (letters === 0) return word.confidence >= 60;
        if (letters <= 3) return word.confidence >= 85;
        return word.confidence >= 20;
      });
      const words = kept.map((word) => word.text);
      const unsure =
        all.some((word) => {
          const letters = (word.text.match(/[A-Za-z]/g) ?? []).length;
          return letters >= 3 && word.confidence < 20;
        }) || /:\s*$/.test(words.join(" "));
      const text = (words.length > 0 ? words.join(" ") : data.text).replace(/\s+/g, " ").trim();
      // When nothing passed the filter, the fallback text is the whole (unclear) reading.
      const confidences = (kept.length > 0 ? kept : all).map((word) => word.confidence);
      return { text, unsure, minConfidence: confidences.length ? Math.min(...confidences) : 0 };
    },
    close: () => worker.terminate(),
  };
}

export async function readNames(
  strips: HTMLCanvasElement[],
  onProgress?: (done: number, total: number) => void,
  singleLine: boolean[] = [],
  // Filled with true for a reading that may be incomplete (a word was too unclear to keep).
  unsure: boolean[] = []
): Promise<string[]> {
  const reader = await createNameReader();
  try {
    const reads: string[] = [];
    for (let i = 0; i < strips.length; i++) {
      const reading = await reader.read(strips[i], singleLine[i]);
      unsure[i] = reading.unsure;
      reads.push(reading.text);
      onProgress?.(i + 1, strips.length);
    }
    return reads;
  } finally {
    await reader.close();
  }
}
