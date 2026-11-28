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
  const ref = shaped.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
  const cards = shaped.filter((r) => Math.abs(r.w - ref.w) / ref.w < 0.12 && Math.abs(r.h - ref.h) / ref.h < 0.12);

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
    // In these Title Case names a word that starts with a small "l" is an "I" (Idol, Ice ...)
    .replace(/(^|\s)l(?=[a-z]{3,})/g, "$1I")
    .replace(/\s+/g, " ")
    .replace(/^[\s:.'-]+|[\s:.'-]+$/g, "")
    .trim();
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

export async function readNames(
  strips: HTMLCanvasElement[],
  onProgress?: (done: number, total: number) => void,
  singleLine: boolean[] = []
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
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :'\u2019-.",
    });
    const reads: string[] = [];
    for (let i = 0; i < strips.length; i++) {
      await worker.setParameters({ tessedit_pageseg_mode: (singleLine[i] ? "7" : "6") as never });
      const { data } = await worker.recognize(strips[i], {}, { text: true, blocks: true });
      const all = (data.blocks ?? [])
        .flatMap((block) => block.paragraphs)
        .flatMap((paragraph) => paragraph.lines)
        .flatMap((line) => line.words);
      if (typeof localStorage !== "undefined" && localStorage.getItem("ocrDebug")) {
        console.log("OCR", i, all.map((word) => `${word.text}(${Math.round(word.confidence)})`).join(" "));
      }
      // Keep confident words. Short fragments (1-3 characters) must be very
      // confident: they are usually stray marks from the artwork behind the text.
      const words = all
        .filter((word) => {
          const letters = (word.text.match(/[A-Za-z0-9]/g) ?? []).length;
          if (letters === 0) return word.confidence >= 60;
          if (letters <= 3) return word.confidence >= 85;
          return word.confidence >= 20;
        })
        .map((word) => word.text);
      const text = words.length > 0 ? words.join(" ") : data.text;
      reads.push(text.replace(/\s+/g, " ").trim());
      onProgress?.(i + 1, strips.length);
    }
    return reads;
  } finally {
    await worker.terminate();
  }
}
