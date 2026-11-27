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
// order. Only cards of the usual size are returned (cut-off ones at the edge
// of the screenshot are left out).
export function detectCards(source: CanvasImageSource, naturalW: number, naturalH: number): Rect[] {
  const scale = Math.min(1, ANALYSIS_WIDTH / naturalW);
  const W = Math.max(1, Math.round(naturalW * scale));
  const H = Math.max(1, Math.round(naturalH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
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
  for (const [y0, y1] of runs(rowFlags, 3)) {
    if (y1 - y0 < H * 0.05) continue;
    const colFlags: boolean[] = [];
    for (let x = 0; x < W; x++) {
      let count = 0;
      for (let y = y0; y <= y1; y++) count += mask[y * W + x];
      colFlags.push(count / (y1 - y0 + 1) > 0.5);
    }
    for (const [x0, x1] of runs(colFlags, 3)) {
      rects.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
  }

  // Keep card-shaped rectangles of the biggest common size.
  const shaped = rects.filter((r) => r.w / r.h > 0.4 && r.w / r.h < 1.8 && r.w * r.h > W * H * 0.015);
  if (shaped.length === 0) return [];
  const ref = shaped.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
  const cards = shaped.filter((r) => Math.abs(r.w - ref.w) / ref.w < 0.12 && Math.abs(r.h - ref.h) / ref.h < 0.12);

  cards.sort((a, b) => (Math.abs(a.y - b.y) > ref.h * 0.4 ? a.y - b.y : a.x - b.x));
  const inset = Math.max(1, Math.round(ref.w * 0.006));
  return cards.map((r) => ({
    x: Math.round((r.x + inset) / scale),
    y: Math.round((r.y + inset) / scale),
    w: Math.round((r.w - inset * 2) / scale),
    h: Math.round((r.h - inset * 2) / scale),
  }));
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

// ---- 3. Match names --------------------------------------------------------

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "");

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

export async function readNames(
  strips: HTMLCanvasElement[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr/core",
    langPath: "/ocr/lang",
    gzip: true,
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: "6" as never,
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :'-.",
    });
    const reads: string[] = [];
    for (let i = 0; i < strips.length; i++) {
      const { data } = await worker.recognize(strips[i]);
      reads.push(data.text.replace(/\s+/g, " ").trim());
      onProgress?.(i + 1, strips.length);
    }
    return reads;
  } finally {
    await worker.terminate();
  }
}
