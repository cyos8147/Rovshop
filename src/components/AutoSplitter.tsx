"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useImageSize } from "@/components/ImageCropper";
import {
  addSkinFromScreenshotAction,
  deleteSkinsAction,
  fixSkinAction,
  saveSkinHashesAction,
  setSkinImageAction,
} from "@/lib/actions/skins";
import { normalizeSkinName } from "@/lib/skin-name";
import { ROV_HERO_NAMES } from "@/lib/rov-heroes";
import {
  cardHash,
  cleanName,
  detectCards,
  hashDistance,
  heroStripCanvas,
  matchCards,
  nameScore,
  nameSimilarity,
  nameStripCanvas,
  readNames,
  type Rect,
} from "@/lib/screenshot-split";

type SplitSkin = { id: string; name: string; hasImage: boolean };
// A skin that already has a picture: a new screenshot is compared with it, and
// when the pictures match, its name and hero are corrected from the screenshot.
export type LibrarySkin = { id: string; name: string; heroName: string; imageUrl: string | null; imageHash: string | null };

const NEW = "__new__";
const MAX_FILES = 12;

type Row = {
  imageIndex: number;
  card: Rect;
  preview: string;
  read: string;
  // "" = skip, NEW = create a skin named newName, otherwise an existing skin id
  skinId: string;
  hash: string;
  // Set when the card's picture is the picture of a skin already in the library.
  libId: string | null;
  newName: string;
  include: boolean;
  // Index of an earlier card (over all the pictures) that is the same skin.
  duplicateOf: number | null;
  duplicateKind: "picture" | "name" | null;
  status: "idle" | "saving" | "ok" | "error";
  note?: string;
};

// Admin tool: pick one or several screenshots that show grids of skin cards.
// The cards are found automatically and the name under each card is read. A
// card whose name matches an existing skin of the hero gets its picture; any
// other card becomes a NEW skin with the name that was read. Without a fixed
// hero, each screenshot's hero name is read from its header and the hero is
// created if needed. A skin keeps one picture only: nothing is overwritten and
// the same picture or name is never used twice.
export function AutoSplitter({
  heroName: fixedHeroName,
  skins,
  refUrl = null,
  heroNames = [],
  library = [],
}: {
  heroName?: string;
  skins: SplitSkin[];
  refUrl?: string | null;
  library?: LibrarySkin[];
  // Heroes that already exist, to correct and suggest hero names.
  heroNames?: string[];
}) {
  const router = useRouter();
  const chooserRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const refSize = useImageSize(refUrl);

  const [phase, setPhase] = useState<"idle" | "working" | "review" | "saving" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [heroInputs, setHeroInputs] = useState<string[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const libById = new Map(library.map((l) => [l.id, l]));
  const heroFor = (imageIndex: number) => (fixedHeroName ?? heroInputs[imageIndex] ?? "").trim();
  // Every skin we know of (the hero's own list, and the whole library with its hero).
  const skinById = new Map<string, { id: string; name: string; hasImage: boolean }>([
    ...skins.map((s) => [s.id, s] as const),
    ...library.map((l) => [l.id, { id: l.id, name: l.name, hasImage: Boolean(l.imageUrl) }] as const),
  ]);
  const [deleteIds, setDeleteIds] = useState<Set<string>>(new Set());
  const existingNames = new Set(skins.map((s) => normalizeSkinName(s.name)));

  const reset = () => {
    for (const img of imagesRef.current) if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
    imagesRef.current = [];
    setRows([]);
    setHeroInputs([]);
    setDeleteIds(new Set());
    setPhase("idle");
    setProgress("");
  };

  const onPick = async (picked: File[]) => {
    const files = picked.slice(0, MAX_FILES);
    setMessage(null);
    setPhase("working");
    try {
      // 1. Open every picture and find its cards.
      const loaded: { img: HTMLImageElement; cards: Rect[]; gridTop: number | null }[] = [];
      const noCards: number[] = [];
      for (let f = 0; f < files.length; f++) {
        setProgress(`กำลังหาการ์ดสกินในภาพ ${f + 1}/${files.length}`);
        await new Promise((resolve) => setTimeout(resolve, 20));
        const img = new Image();
        img.src = URL.createObjectURL(files[f]);
        try {
          await img.decode();
        } catch {
          noCards.push(f + 1);
          continue;
        }
        const { cards, gridTop } = detectCards(img, img.naturalWidth, img.naturalHeight);
        if (cards.length === 0) {
          URL.revokeObjectURL(img.src);
          noCards.push(f + 1);
          continue;
        }
        loaded.push({ img, cards, gridTop });
      }
      imagesRef.current = loaded.map((l) => l.img);
      if (loaded.length === 0) {
        reset();
        setMessage({ kind: "error", text: "ไม่พบการ์ดสกินในภาพ ลองใช้ \"ตัดเอง\" ด้านล่างแทน" });
        return;
      }

      // 2. Read all the names in one OCR run (hero name first, then the cards).
      const strips: HTMLCanvasElement[] = [];
      const plan = loaded.map(({ img, cards, gridTop }) => {
        const heroStrip = fixedHeroName ? null : heroStripCanvas(img, img.naturalWidth, img.naturalHeight, gridTop);
        const heroAt = heroStrip ? strips.push(heroStrip) - 1 : -1;
        const cardAt = cards.map((card) => strips.push(nameStripCanvas(img, card)) - 1);
        return { heroAt, cardAt };
      });
      let reads: string[] = strips.map(() => "");
      let readFailed = false;
      try {
        setProgress(`กำลังอ่านชื่อ 0/${strips.length}`);
        const singleLine = strips.map((_, k) => plan.some((p) => p.heroAt === k));
        reads = await readNames(strips, (done, total) => setProgress(`กำลังอ่านชื่อ ${done}/${total}`), singleLine);
      } catch {
        readFailed = true;
      }

      // 2b. Fingerprints of the pictures already in the library (stored ones, or
      // computed now by opening the picture; new ones are saved for next time).
      const libHashes = new Map<string, string>();
      const toSave: { id: string; hash: string }[] = [];
      const missing = library.filter((l) => l.imageUrl && !l.imageHash);
      library.forEach((l) => l.imageUrl && l.imageHash && libHashes.set(l.id, l.imageHash));
      let doneLib = 0;
      const queue = [...missing];
      const worker = async () => {
        for (let l = queue.shift(); l; l = queue.shift()) {
          try {
            const pic = new Image();
            pic.crossOrigin = "anonymous";
            pic.src = l.imageUrl ?? "";
            await pic.decode();
            const hash = cardHash(pic, { x: 0, y: 0, w: pic.naturalWidth, h: pic.naturalHeight });
            if (hash) {
              libHashes.set(l.id, hash);
              toSave.push({ id: l.id, hash });
            }
          } catch {
            /* a picture that cannot be read is simply not compared */
          }
          doneLib++;
          setProgress(`กำลังเทียบกับรูปที่มีอยู่ ${doneLib}/${missing.length}`);
        }
      };
      if (missing.length > 0) await Promise.all([worker(), worker(), worker(), worker()]);
      if (toSave.length > 0) void saveSkinHashesAction(toSave).catch(() => undefined);

      // 3. Build one row per card.
      // A hero name read from the header is snapped to a hero that already
      // exists when it is close enough (so "Alri" becomes "Airi").
      const closest = (guess: string, names: string[]) => {
        let bestName = "";
        let bestScore = 0.8;
        for (const name of names) {
          const score = nameSimilarity(guess, name);
          // Short names are corrected only for look-alike letters (l/i, 0/o), never by
          // adding or dropping a letter: "Ata" and "Zata" are different heroes.
          const longEnough = Math.max(guess.length, name.length) >= 6;
          if ((score === 1 || (score >= 0.8 && longEnough)) && score >= bestScore) {
            bestScore = score;
            bestName = name;
          }
        }
        return bestName;
      };
      // The known game heroes come first: a hero entered wrongly earlier must not win.
      const snap = (guess: string) => closest(guess, ROV_HERO_NAMES) || closest(guess, heroNames) || guess;
      // A reading that looks like a skin name (several words, or the same as a card's
      // name) is not a hero name: the strip was cut from the wrong place.
      const rawGuesses = plan.map((p) => {
        const guess = p.heroAt >= 0 ? cleanName(reads[p.heroAt] ?? "") : "";
        const cardNames = p.cardAt.map((at) => reads[at] ?? "");
        const looksLikeSkin = guess.split(" ").length > 2 || cardNames.some((name) => nameScore(guess, name) >= 0.6);
        return looksLikeSkin ? "" : guess;
      });
      // A picture whose header could not be read takes the most common reading of the others.
      const common = rawGuesses
        .filter((g) => g.length >= 3)
        .sort((a, b) => rawGuesses.filter((g) => g === b).length - rawGuesses.filter((g) => g === a).length)[0];
      const heroGuesses = rawGuesses.map((g) => snap(g.length >= 3 ? g : (common ?? g)));
      const built: Row[] = [];
      const hashes: string[] = [];
      loaded.forEach(({ img, cards }, imageIndex) => {
        const cardReads = plan[imageIndex].cardAt.map((at) => reads[at] ?? "");
        const matches = matchCards(
          cardReads,
          skins.map((s) => s.name)
        );
        cards.forEach((card, i) => {
          const hash = cardHash(img, card);
          const pictureDup = hashes.findIndex((h) => h && hash && hashDistance(h, hash) <= 4);
          hashes.push(hash);

          const preview = document.createElement("canvas");
          preview.width = 240;
          preview.height = Math.max(1, Math.round((card.h / card.w) * 240));
          preview.getContext("2d")?.drawImage(img, card.x, card.y, card.w, card.h, 0, 0, preview.width, preview.height);

          // Same picture as a skin already in the library? (clearly the closest one)
          let libId: string | null = null;
          if (hash) {
            const scored = [...libHashes.entries()]
              .map(([id, h]) => ({ id, d: hashDistance(h, hash) }))
              .sort((a, b) => a.d - b.d);
            if (typeof localStorage !== "undefined" && localStorage.getItem("ocrDebug")) {
              console.log("HASH", built.length, `best ${scored[0]?.d} second ${scored[1]?.d}`);
            }
            if (scored[0] && scored[0].d <= 8 && (!scored[1] || scored[1].d - scored[0].d >= 6)) libId = scored[0].id;
          }

          let matched: { id: string; name: string; hasImage: boolean } | null = !libId && matches[i] >= 0 ? skins[matches[i]] : null;
          let newName = matched ? "" : cleanName(cardReads[i]);
          // A skin of this hero with the same name already exists: this card replaces its picture.
          if (!libId && !matched && newName.length >= 2) {
            const sameName = library.find(
              (l) =>
                normalizeSkinName(l.heroName) === normalizeSkinName(fixedHeroName ?? heroGuesses[imageIndex]) &&
                normalizeSkinName(l.name) === normalizeSkinName(newName)
            );
            if (sameName) {
              matched = { id: sameName.id, name: sameName.name, hasImage: Boolean(sameName.imageUrl) };
              newName = "";
            }
          }
          const skinId = libId ? "" : matched ? matched.id : newName.length >= 2 ? NEW : "";

          // Same skin as an earlier card of this batch (same hero and name)?
          const nameKey = `${normalizeSkinName(heroGuesses[imageIndex])}:${normalizeSkinName(newName)}`;
          const nameDup =
            skinId === NEW
              ? built.findIndex(
                  (r) =>
                    r.skinId === NEW &&
                    `${normalizeSkinName(heroGuesses[r.imageIndex])}:${normalizeSkinName(r.newName)}` === nameKey
                )
              : libId
                ? built.findIndex((r) => r.libId === libId)
                : skinId
                  ? built.findIndex((r) => r.skinId === skinId)
                  : -1;
          const duplicateOf = pictureDup >= 0 ? pictureDup : nameDup;
          const lib = libId ? libById.get(libId) : undefined;
          const heroGuess = fixedHeroName ?? heroGuesses[imageIndex];
          const fixNeeded =
            Boolean(lib) &&
            newName.length >= 2 &&
            (normalizeSkinName(lib?.heroName ?? "") !== normalizeSkinName(heroGuess) ||
              normalizeSkinName(lib?.name ?? "") !== normalizeSkinName(newName));
          built.push({
            imageIndex,
            card,
            preview: preview.toDataURL("image/jpeg", 0.8),
            read: cardReads[i],
            skinId,
            hash,
            libId,
            newName,
            include: duplicateOf < 0 && (libId ? fixNeeded : matched ? true : newName.length >= 2),
            duplicateOf: duplicateOf >= 0 ? duplicateOf : null,
            duplicateKind: duplicateOf < 0 ? null : pictureDup >= 0 ? "picture" : "name",
            status: "idle",
          });
        });
      });
      // A card that is the same picture as an earlier card but is read better (a card
      // that was selected on the site is dimmed and its name cannot be read) takes over.
      built.forEach((row, i) => {
        const j = row.duplicateOf;
        if (j === null || row.duplicateKind !== "picture") return;
        const earlier = built[j];
        if (earlier.skinId === "" && !earlier.libId && row.skinId !== "") {
          earlier.duplicateOf = i;
          earlier.duplicateKind = "picture";
          earlier.include = false;
          row.duplicateOf = null;
          row.duplicateKind = null;
          row.include = row.skinId === NEW ? row.newName.trim().length >= 2 : true;
        }
      });
      setHeroInputs(heroGuesses);
      setRows(built);
      setPhase("review");
      const warnings: string[] = [];
      if (readFailed) warnings.push("อ่านชื่อไม่ได้ กรุณาใส่ชื่อสกินให้แต่ละการ์ดเอง");
      if (noCards.length > 0) warnings.push(`ไม่พบการ์ดในภาพที่ ${noCards.join(", ")} (ข้ามไป)`);
      if (picked.length > MAX_FILES) warnings.push(`เลือกได้ครั้งละไม่เกิน ${MAX_FILES} ภาพ (ใช้ ${MAX_FILES} ภาพแรก)`);
      if (warnings.length > 0) setMessage({ kind: "error", text: warnings.join(" · ") });
    } catch {
      reset();
      setMessage({ kind: "error", text: "เปิดภาพไม่สำเร็จ ลองเลือกภาพใหม่" });
    }
  };

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const needsFix = (row: Row) => {
    const lib = row.libId ? libById.get(row.libId) : undefined;
    return (
      Boolean(lib) &&
      row.newName.trim().length >= 2 &&
      (normalizeSkinName(lib?.heroName ?? "") !== normalizeSkinName(heroFor(row.imageIndex)) ||
        normalizeSkinName(lib?.name ?? "") !== normalizeSkinName(row.newName))
    );
  };
  const chosen = rows.filter(
    (row) =>
      row.include &&
      row.duplicateOf === null &&
      (row.libId
        ? needsFix(row)
        : row.skinId && (row.skinId !== NEW || row.newName.trim().length >= 2))
  );
  const keyOf = (row: Row) =>
    row.libId
      ? `fix:${row.libId}`
      : row.skinId === NEW
        ? `new:${normalizeSkinName(heroFor(row.imageIndex))}:${normalizeSkinName(row.newName)}`
        : `id:${row.skinId}`;
  const keys = chosen.map(keyOf);
  const duplicated = keys.some((key, i) => keys.indexOf(key) !== i);
  const clashesWithExisting = chosen.some((row) => row.skinId === NEW && existingNames.has(normalizeSkinName(row.newName)));
  const needsHero = chosen.some((row) => (row.skinId === NEW || row.libId) && heroFor(row.imageIndex).length < 2);
  const blocked = (chosen.length === 0 && deleteIds.size === 0) || duplicated || clashesWithExisting || needsHero;

  // Skins of the heroes in this batch that none of the cards refers to: possibly wrong entries.
  const referenced = new Set(rows.flatMap((row) => [row.libId, row.skinId].filter((v): v is string => Boolean(v) && v !== NEW)));
  const batchHeroes = new Set(
    Array.from({ length: imagesRef.current.length }, (_, k) => normalizeSkinName(heroFor(k))).filter(Boolean)
  );
  const leftovers = rows.length
    ? library.filter((l) => batchHeroes.has(normalizeSkinName(l.heroName)) && !referenced.has(l.id))
    : [];

  const saveAll = async () => {
    if (blocked) return;
    setPhase("saving");
    setMessage(null);
    let saved = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!chosen.includes(row)) continue;
      const img = imagesRef.current[row.imageIndex];
      update(i, { status: "saving", note: undefined });

      // A skin found again by its picture: only its name / hero is corrected.
      if (row.libId) {
        try {
          const result = await fixSkinAction(row.libId, heroFor(row.imageIndex), row.newName);
          if (!result.ok) update(i, { status: "error", note: result.error });
          else if (result.status === "same") update(i, { status: "ok", note: "ชื่อถูกต้องอยู่แล้ว" });
          else {
            saved++;
            update(i, { status: "ok", note: result.heroRemoved ? "แก้ชื่อแล้ว (ลบฮีโร่ชื่อผิดที่ว่างแล้ว)" : "แก้ชื่อรายการเดิมแล้ว" });
          }
        } catch {
          update(i, { status: "error", note: "บันทึกไม่สำเร็จ" });
        }
        continue;
      }

      // Same size as the skin pictures already added, else the card's own size.
      let outW = row.card.w;
      let outH = row.card.h;
      if (refSize) {
        outW = Math.min(900, refSize.w);
        outH = Math.round((outW * refSize.h) / refSize.w);
      } else {
        const k = Math.min(1, 900 / Math.max(outW, outH));
        outW = Math.round(outW * k);
        outH = Math.round(outH * k);
      }
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      canvas.getContext("2d")?.drawImage(img, row.card.x, row.card.y, row.card.w, row.card.h, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) {
        update(i, { status: "error", note: "ตัดรูปไม่สำเร็จ" });
        continue;
      }
      const form = new FormData();
      form.append("image", new File([blob], "skin.jpg", { type: "image/jpeg" }));
      try {
        if (row.skinId === NEW) {
          const result = await addSkinFromScreenshotAction(heroFor(row.imageIndex), row.newName, form, row.hash);
          if (!result.ok) update(i, { status: "error", note: result.error });
          else if (result.status === "skipped") update(i, { status: "ok", note: "มีสกินชื่อนี้อยู่แล้ว ข้ามไป" });
          else {
            saved++;
            update(i, { status: "ok", note: "สร้างสกินใหม่แล้ว" });
          }
        } else {
          const result = await setSkinImageAction(row.skinId, form, row.hash);
          if (result.error) update(i, { status: "error", note: result.error });
          else {
            saved++;
            update(i, { status: "ok", note: "ใส่รูปแล้ว" });
          }
        }
      } catch {
        update(i, { status: "error", note: "บันทึกไม่สำเร็จ" });
      }
    }
    let deletedCount = 0;
    if (deleteIds.size > 0) {
      try {
        const result = await deleteSkinsAction([...deleteIds]);
        deletedCount = result.deleted;
      } catch {
        /* reported below */
      }
    }
    setPhase("done");
    setMessage({
      kind: saved > 0 || deletedCount > 0 ? "ok" : "error",
      text:
        saved > 0 || deletedCount > 0
          ? `บันทึก ${saved} สกิน${deletedCount > 0 ? ` · ลบรายการผิด ${deletedCount}` : ""} แล้ว`
          : "ไม่ได้บันทึกสกินใหม่",
    });
    router.refresh();
  };

  const imageCount = imagesRef.current.length;

  return (
    <div className="card space-y-4 p-4">
      <input
        ref={chooserRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        data-testid="auto-chooser"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) void onPick(files);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">
            {fixedHeroName ? "แยกรูปสกินอัตโนมัติจากภาพแคป" : "ส่งภาพแคป สร้างฮีโร่ ชื่อสกิน และรูปให้เลย"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            เลือกภาพแคปที่มีการ์ดสกินได้หลายภาพพร้อมกัน ระบบจะแยกการ์ด อ่านชื่อใต้การ์ด{fixedHeroName ? "" : " และชื่อฮีโร่ที่หัวหน้าจอ"} สกินที่ยังไม่มีจะถูกสร้างใหม่ตามชื่อที่อ่านได้ พร้อมรูป ไม่ทับรูปเดิม และไม่ใส่ซ้ำ
          </p>
        </div>
        {phase === "idle" || phase === "done" ? (
          <button type="button" onClick={() => chooserRef.current?.click()} className="btn-primary">
            {phase === "done" ? "เลือกภาพอื่น" : "เลือกภาพแคป (หลายภาพได้)"}
          </button>
        ) : null}
      </div>

      <datalist id="auto-hero-names">
        {heroNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {phase === "working" ? <p className="text-sm text-ink-muted">{progress}</p> : null}

      {phase === "review" || phase === "saving" || phase === "done" ? (
        <>
          <p className="text-sm text-ink-muted">
            {imageCount} ภาพ พบการ์ดรวม {rows.length} ใบ ตรวจชื่อสกินก่อนกดบันทึก แก้ชื่อได้ในช่อง ถ้าชื่อที่อ่านผิดหรือไม่ต้องการใบไหน ให้เอาติ๊กออก
          </p>

          {Array.from({ length: imageCount }, (_, imageIndex) => {
            const group = rows.map((row, i) => ({ row, i })).filter(({ row }) => row.imageIndex === imageIndex);
            return (
              <section key={imageIndex} className="space-y-3">
                <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
                  <h3 className="text-sm font-semibold text-ink">
                    ภาพที่ {imageIndex + 1} <span className="font-normal text-ink-muted">({group.length} ใบ)</span>
                  </h3>
                  {!fixedHeroName ? (
                    <label className="block w-56">
                      <span className="mb-1 block text-xs text-ink-muted">ชื่อฮีโร่ของภาพนี้ (สร้างให้ถ้ายังไม่มี)</span>
                      <input
                        value={heroInputs[imageIndex] ?? ""}
                        onChange={(event) =>
                          setHeroInputs((current) => current.map((v, k) => (k === imageIndex ? event.target.value : v)))
                        }
                        disabled={phase !== "review"}
                        maxLength={60}
                        className="input py-1.5 text-sm"
                        placeholder="เช่น Allain"
                        list="auto-hero-names"
                      />
                    </label>
                  ) : null}
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {group.map(({ row, i }) => {
                    const skin = skinById.get(row.skinId);
                    return (
                      <li key={i} className="space-y-2 rounded-xl border border-border bg-bg-soft p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={row.preview} alt="" className="w-full rounded-lg" />
                        <p className="truncate text-[11px] text-ink-muted" title={row.read}>
                          อ่านได้: {row.read || "—"}
                        </p>
                        {row.libId ? (
                          <div className="space-y-1.5 rounded-lg bg-card p-2 text-xs">
                            <p className="text-ink-muted">
                              ตรงกับรูปของสกินเดิม: <span className="text-ink">{libById.get(row.libId)?.heroName} / {libById.get(row.libId)?.name}</span>
                            </p>
                            <input
                              value={row.newName}
                              onChange={(event) => update(i, { newName: event.target.value, include: true })}
                              disabled={phase !== "review"}
                              maxLength={80}
                              className="input py-1.5 text-xs"
                              placeholder="ชื่อสกินที่ถูกต้อง"
                            />
                            {needsFix(row) ? (
                              row.duplicateOf === null ? (
                                <label className="flex items-center gap-2 text-ink">
                                  <input
                                    type="checkbox"
                                    checked={row.include}
                                    disabled={phase !== "review"}
                                    onChange={(event) => update(i, { include: event.target.checked })}
                                  />
                                  แก้ชื่อรายการเดิมเป็นชื่อนี้
                                </label>
                              ) : null
                            ) : (
                              <p className="text-emerald-300">ชื่อและฮีโร่ถูกต้องอยู่แล้ว (ไม่ต้องแก้)</p>
                            )}
                          </div>
                        ) : (
                        <select
                          value={row.skinId}
                          onChange={(event) => {
                            const value = event.target.value;
                            const next = skinById.get(value);
                            update(i, {
                              skinId: value,
                              include: value === NEW ? row.newName.trim().length >= 2 : Boolean(next) ? true : row.include,
                            });
                          }}
                          disabled={phase !== "review"}
                          className="input py-1.5 text-xs"
                        >
                          <option value="">— ข้ามใบนี้ —</option>
                          <option value={NEW}>+ สกินใหม่</option>
                          {skins.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                              {s.hasImage ? " (มีรูปแล้ว: จะเปลี่ยนรูป)" : ""}
                            </option>
                          ))}
                        </select>
                        )}
                        {row.skinId === NEW ? (
                          <input
                            value={row.newName}
                            onChange={(event) =>
                              update(i, { newName: event.target.value, include: event.target.value.trim().length >= 2 })
                            }
                            disabled={phase !== "review"}
                            maxLength={80}
                            className="input py-1.5 text-xs"
                            placeholder="ชื่อสกิน"
                          />
                        ) : null}
                        {row.duplicateOf !== null ? (
                          <p className="text-xs text-rose-300">
                            {row.duplicateKind === "picture" ? "รูปซ้ำ" : "สกินซ้ำ"}กับใบที่ {row.duplicateOf + 1} (ไม่ใส่ซ้ำ)
                          </p>
                        ) : row.libId ? null : (
                          <label className="flex items-center gap-2 text-xs text-ink">
                            <input
                              type="checkbox"
                              checked={row.include && Boolean(row.skinId)}
                              disabled={!row.skinId || phase !== "review"}
                              onChange={(event) => update(i, { include: event.target.checked })}
                            />
                            {row.skinId === NEW ? "สร้างสกินนี้" : skin?.hasImage ? "เปลี่ยนรูปเดิมเป็นรูปนี้" : "ใส่รูปนี้"}
                          </label>
                        )}
                        {row.status === "saving" ? <p className="text-xs text-ink-muted">กำลังบันทึก...</p> : null}
                        {row.status === "ok" ? <p className="text-xs text-emerald-300">{row.note}</p> : null}
                        {row.status === "error" ? <p className="text-xs text-rose-300">{row.note}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {duplicated ? <p className="text-sm text-rose-300">มีสกินที่ถูกเลือกซ้ำกันหลายการ์ด ปรับให้การ์ดละสกินก่อน</p> : null}
          {clashesWithExisting ? (
            <p className="text-sm text-rose-300">มีชื่อสกินใหม่ที่ซ้ำกับสกินที่มีอยู่แล้ว ให้เลือกสกินนั้นจากช่องเลือกแทน</p>
          ) : null}
          {needsHero ? <p className="text-sm text-rose-300">ใส่ชื่อฮีโร่ให้ครบทุกภาพก่อน</p> : null}

          {leftovers.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-border bg-bg-soft p-3">
              <h3 className="text-sm font-semibold text-ink">สกินของฮีโร่เหล่านี้ที่ไม่อยู่ในภาพที่ส่ง ({leftovers.length})</h3>
              <p className="text-xs text-ink-muted">
                อาจเป็นรายการที่สร้างผิดไว้ ติ๊กเฉพาะอันที่ผิดจริงเพื่อลบตอนกดบันทึก ถ้าเพียงแต่ไม่ได้แคปมาให้ครบ อย่าติ๊ก
              </p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {leftovers.map((l) => (
                  <li key={l.id}>
                    <label className="flex items-center gap-2 text-xs text-ink">
                      <input
                        type="checkbox"
                        checked={deleteIds.has(l.id)}
                        disabled={phase !== "review"}
                        onChange={(event) =>
                          setDeleteIds((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(l.id);
                            else next.delete(l.id);
                            return next;
                          })
                        }
                      />
                      {l.heroName} / {l.name}
                      {l.imageUrl ? "" : " (ไม่มีรูป)"}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {phase === "review" ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveAll} disabled={blocked} className="btn-primary">
                บันทึก {chosen.length} สกิน{deleteIds.size > 0 ? ` · ลบ ${deleteIds.size}` : ""}
              </button>
              <button type="button" onClick={reset} className="btn-secondary">
                เลือกภาพใหม่
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
