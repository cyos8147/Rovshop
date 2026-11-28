"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  badgeHash,
  cardHash,
  cleanName,
  createNameReader,
  evoLevel,
  hashDistance,
  nameStripCanvas,
  type NameReading,
} from "@/lib/screenshot-split";
import type { FixSkinResult } from "@/lib/actions/skins";

type AuditSkin = { id: string; name: string; imageUrl: string; heroId: string; heroName: string };
type Status = "ok" | "duplicate" | "different" | "evo" | "lookalike" | "unclear" | "unreadable" | "noimage";
// dupOf: the skin of the same hero that has the same picture (for "duplicate").
type Result = { status: Status; read: string; evo: string; suggestion: string; dupOf?: string };

const LABELS: Record<Exclude<Status, "ok">, string> = {
  duplicate: "รูปซ้ำกับสกินอื่นของฮีโร่นี้",
  different: "ชื่อไม่ตรงกับรูป",
  evo: "เลเวล EVO ไม่ตรงกับป้าย",
  lookalike: "ต่างแค่ตัวอักษรหน้าตาคล้ายกัน (I/l, O/0)",
  unclear: "อ่านชื่อในรูปไม่ชัด ตรวจด้วยตา",
  unreadable: "อ่านชื่อในรูปไม่ได้",
  noimage: "เปิดรูปไม่ได้",
};
const ORDER: Status[] = ["duplicate", "different", "evo", "lookalike", "unclear"];

const NUMBER = /\s+\(\d+\)$/;
const EVO_SUFFIX = /\s+(EVO(?:\s+(?:I|II|III|IV|V))?)(\s+\(\d+\))?$/i;

// "Cybercore EVO IV" -> base "Cybercore", evo "EVO IV"; "Dragoness Evosuit (3)" -> numbered.
function savedParts(name: string) {
  const m = name.match(EVO_SUFFIX);
  const evo = m ? m[1].toUpperCase().replace(/\s+/g, " ") : "";
  const base = name.replace(EVO_SUFFIX, "").replace(NUMBER, "").trim();
  const number = name.match(NUMBER)?.[0].trim() ?? "";
  return { base, evo, number };
}
const plain = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "");
const lookalike = (t: string) => plain(t).replace(/[l1]/g, "i").replace(/0/g, "o");

function classify(name: string, reading: NameReading, evoRead: string, hasVersions: boolean): Result {
  const { base, evo, number } = savedParts(name);
  const read = cleanName(reading.text);
  if (read.length < 2) return { status: "unreadable", read, evo: evoRead, suggestion: name };

  let status: Status = "ok";
  let newBase = base;
  if (plain(read) !== plain(base)) {
    status = lookalike(read) === lookalike(base) ? "lookalike" : "different";
    newBase = read;
  } else if (reading.unsure || reading.minConfidence < 85) {
    status = "unclear";
  }
  // Level: only for names that carry one (or a number given when it could not be read).
  // A level is checked for names that carry one (or a number), and for a plain name
  // when the hero has other versions of it (then the level is missing from the name).
  const levelWrong = Boolean(evoRead && (evo || number ? evoRead !== evo : hasVersions));
  if (levelWrong && (status === "ok" || status === "unclear")) status = "evo";
  const level = levelWrong ? evoRead : evo;
  const suggestion = [newBase, level, levelWrong ? "" : number].filter(Boolean).join(" ");
  return { status, read, evo: evoRead, suggestion };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function SkinAudit({
  skins,
  fixAction,
  deleteAction,
}: {
  skins: AuditSkin[];
  fixAction: (skinId: string, heroName: string, skinName: string) => Promise<FixSkinResult>;
  deleteAction: (skinId: string) => Promise<void>;
}) {
  const [scope, setScope] = useState("all");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const stopRef = useRef(false);

  const letters = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of skins) {
      const l = /[A-Z]/i.test(s.heroName.charAt(0)) ? s.heroName.charAt(0).toUpperCase() : "#";
      map.set(l, (map.get(l) ?? 0) + 1);
    }
    return [...map].sort(([a], [b]) => a.localeCompare(b));
  }, [skins]);
  const heroes = useMemo(() => {
    const map = new Map<string, { name: string; n: number }>();
    for (const s of skins) map.set(s.heroId, { name: s.heroName, n: (map.get(s.heroId)?.n ?? 0) + 1 });
    return [...map];
  }, [skins]);

  const inScope = (s: AuditSkin) => {
    if (scope === "all") return true;
    if (scope.startsWith("L:")) {
      const l = /[A-Z]/i.test(s.heroName.charAt(0)) ? s.heroName.charAt(0).toUpperCase() : "#";
      return l === scope.slice(2);
    }
    return s.heroId === scope.slice(2);
  };

  const run = async () => {
    const list = skins.filter(inScope);
    stopRef.current = false;
    setRunning(true);
    setResults({});
    setNotes({});
    setDone(0);
    setTotal(list.length);
    const reader = await createNameReader();
    // Pictures are fetched a few ahead while the previous one is being read.
    const pending = new Map<number, Promise<HTMLImageElement | null>>();
    const fetchAt = (i: number) => {
      if (i < list.length && !pending.has(i)) pending.set(i, loadImage(list[i].imageUrl));
    };
    for (let i = 0; i < 6; i++) fetchAt(i);
    let batch: Record<string, Result> = {};
    // Names that occur more than once per hero once the level / number is taken off.
    const baseCount = new Map<string, number>();
    for (const s of skins) {
      const key = `${s.heroId}:${savedParts(s.name).base.toLowerCase()}`;
      baseCount.set(key, (baseCount.get(key) ?? 0) + 1);
    }
    // Pictures already checked, per hero, to find the same picture saved twice.
    const seen: { id: string; heroId: string; name: string; hash: string; badge: string; result: Result }[] = [];
    // The better-named of two copies is kept: a name with a level beats a plain one or a "(n)".
    const nameRank = (name: string) => {
      const { evo, number } = savedParts(name);
      return (evo ? 2 : 0) - (number ? 1 : 0);
    };
    try {
      for (let i = 0; i < list.length && !stopRef.current; i++) {
        fetchAt(i + 6);
        const img = await pending.get(i)!;
        pending.delete(i);
        const skin = list[i];
        if (!img || !img.naturalWidth) {
          batch[skin.id] = { status: "noimage", read: "", evo: "", suggestion: skin.name };
        } else {
          const rect = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
          try {
            const reading = await reader.read(nameStripCanvas(img, rect));
            const hasVersions = (baseCount.get(`${skin.heroId}:${savedParts(skin.name).base.toLowerCase()}`) ?? 0) > 1;
            const evoRead = evoLevel(img, rect);
            const result = classify(skin.name, reading, evoRead, hasVersions);
            batch[skin.id] = result;
            const hash = cardHash(img, rect);
            const badge = badgeHash(img, rect);
            const twin = seen.find(
              (o) => o.heroId === skin.heroId && hashDistance(o.hash, hash) <= 4 && hashDistance(o.badge, badge) <= 22
            );
            if (twin) {
              // Flag the worse-named copy (the later one when equal).
              const flagNew = nameRank(skin.name) <= nameRank(twin.name);
              const target = flagNew ? result : twin.result;
              target.status = "duplicate";
              target.dupOf = flagNew ? twin.id : skin.id;
              if (!flagNew) batch[twin.id] = { ...twin.result };
            }
            seen.push({ id: skin.id, heroId: skin.heroId, name: skin.name, hash, badge, result });
          } catch {
            // A picture served without permission to read its pixels.
            batch[skin.id] = { status: "noimage", read: "", evo: "", suggestion: skin.name };
          }
        }
        if (i % 10 === 9 || i === list.length - 1 || stopRef.current) {
          const flush = batch;
          batch = {};
          setResults((r) => ({ ...r, ...flush }));
          setDone(i + 1);
        }
      }
      if (Object.keys(batch).length) {
        const flush = batch;
        setResults((r) => ({ ...r, ...flush }));
      }
    } finally {
      await reader.close();
      setRunning(false);
    }
  };

  const remove = async (skin: AuditSkin) => {
    if (!window.confirm(`ลบ "${names[skin.id] ?? skin.name}" ของ ${skin.heroName}?`)) return;
    setBusy(skin.id);
    try {
      await deleteAction(skin.id);
      setNotes((n) => ({ ...n, [skin.id]: { ok: true, text: "ลบแล้ว" } }));
    } catch {
      setNotes((n) => ({ ...n, [skin.id]: { ok: false, text: "ลบไม่สำเร็จ" } }));
    }
    setBusy(null);
  };

  const fix = async (skin: AuditSkin) => {
    const value = (edits[skin.id] ?? results[skin.id]?.suggestion ?? "").trim();
    if (!value) return;
    setBusy(skin.id);
    const outcome = await fixAction(skin.id, skin.heroName, value);
    setBusy(null);
    if (!outcome.ok) {
      setNotes((n) => ({ ...n, [skin.id]: { ok: false, text: outcome.error ?? "ไม่สำเร็จ" } }));
      return;
    }
    setNames((n) => ({ ...n, [skin.id]: value }));
    setNotes((n) => ({ ...n, [skin.id]: { ok: true, text: "แก้ชื่อแล้ว" } }));
  };

  const byId = new Map(skins.map((s) => [s.id, s]));
  const entries = Object.entries(results);
  const count = (status: Status) => entries.filter(([, r]) => r.status === status).length;
  const issues = entries
    .filter(([, r]) => ORDER.includes(r.status))
    .sort(([, a], [, b]) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const unread = entries.filter(([, r]) => r.status === "unreadable" || r.status === "noimage");

  const row = (id: string, r: Result) => {
    const skin = byId.get(id);
    if (!skin) return null;
    const current = names[id] ?? skin.name;
    return (
      <li key={id} className="card flex flex-wrap items-center gap-3 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={skin.imageUrl} alt="" className="h-24 w-[68px] rounded-md object-cover" />
        <div className="min-w-48 flex-1 space-y-1 text-sm">
          <p className="text-ink">
            <span className="text-ink-muted">{skin.heroName} /</span> {current}
          </p>
          <p className="text-xs text-ink-muted">
            อ่านจากรูป: <span className="text-ink">{r.read || "—"}</span>
            {r.evo ? ` · ป้าย ${r.evo}` : ""}
          </p>
          {r.status === "duplicate" && r.dupOf ? (
            <p className="text-xs text-ink-muted">
              ซ้ำกับ: <span className="text-ink">{names[r.dupOf] ?? byId.get(r.dupOf)?.name}</span>
            </p>
          ) : null}
          {notes[id]?.ok ? (
            <p className="text-xs text-emerald-300">{notes[id].text}</p>
          ) : (
            <p className={`text-xs ${r.status === "unclear" || r.status === "lookalike" ? "text-gold-soft" : "text-rose-300"}`}>
              {LABELS[r.status as Exclude<Status, "ok">]}
            </p>
          )}
        </div>
        {r.status === "duplicate" && !notes[id]?.ok ? (
          <button type="button" onClick={() => remove(skin)} disabled={busy === id} className="btn-danger px-3 py-1.5 text-sm">
            {busy === id ? "..." : "ลบรายการนี้"}
          </button>
        ) : null}
        {r.status !== "noimage" && !notes[id]?.ok ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={edits[id] ?? (names[id] ? current : r.suggestion)}
              onChange={(event) => setEdits((e) => ({ ...e, [id]: event.target.value }))}
              maxLength={80}
              className="input w-60 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => fix(skin)}
              disabled={busy === id || (edits[id] ?? r.suggestion).trim() === current}
              className="btn-secondary px-3 py-1.5 text-sm"
            >
              {busy === id ? "..." : "บันทึกชื่อ"}
            </button>
          </div>
        ) : null}
        <Link href={`/admin/skins/${skin.heroId}`} className="text-xs text-gold-soft hover:underline">
          หน้าฮีโร่
        </Link>
        {notes[id] && !notes[id].ok ? <p className="w-full text-xs text-rose-300">{notes[id].text}</p> : null}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">ตรวจ</span>
          <select value={scope} onChange={(event) => setScope(event.target.value)} disabled={running} className="input w-64">
            <option value="all">ทั้งหมด ({skins.length} รูป)</option>
            <optgroup label="ตามตัวอักษร">
              {letters.map(([l, n]) => (
                <option key={l} value={`L:${l}`}>
                  {l} ({n} รูป)
                </option>
              ))}
            </optgroup>
            <optgroup label="ตามฮีโร่">
              {heroes.map(([id, h]) => (
                <option key={id} value={`H:${id}`}>
                  {h.name} ({h.n} รูป)
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {running ? (
          <button type="button" onClick={() => (stopRef.current = true)} className="btn-secondary">
            หยุด
          </button>
        ) : (
          <button type="button" onClick={run} disabled={skins.length === 0} className="btn-primary">
            เริ่มตรวจ
          </button>
        )}
        {total > 0 ? (
          <p className="text-sm text-ink-muted">
            {running ? "กำลังตรวจ" : "ตรวจแล้ว"} {done}/{total}
          </p>
        ) : null}
      </div>

      {entries.length > 0 ? (
        <p className="text-sm text-ink-muted">
          ตรง {count("ok")} · ไม่ตรง {count("different")} · เลเวล EVO ไม่ตรง {count("evo")} · ตัวอักษรคล้าย {count("lookalike")} ·
          อ่านไม่ชัด {count("unclear")} · อ่านไม่ได้ {count("unreadable") + count("noimage")}
        </p>
      ) : null}

      {issues.length > 0 ? (
        <ul className="space-y-2">{issues.map(([id, r]) => row(id, r))}</ul>
      ) : entries.length > 0 && !running ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">ไม่พบชื่อที่ไม่ตรงกับรูป</p>
      ) : null}

      {unread.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-muted">
            อ่านชื่อในรูปไม่ได้ {unread.length} รายการ (รูปอาจไม่ใช่การ์ดเต็มใบ ตรวจด้วยตา)
          </summary>
          <ul className="mt-2 space-y-2">{unread.map(([id, r]) => row(id, r))}</ul>
        </details>
      ) : null}
    </div>
  );
}
