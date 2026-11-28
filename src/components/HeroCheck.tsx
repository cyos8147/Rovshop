"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { nameSimilarity } from "@/lib/screenshot-split";
import { normalizeSkinName } from "@/lib/skin-name";

type LibHero = { id: string; name: string; count: number; withPicture: number };
type Action = (heroId: string, name: string) => Promise<{ ok: boolean; error?: string }>;

// Heroes whose names start with A, with the number of skins, as listed on the source site.
const DEFAULT_LIST = `Airi | 17
Aleister | 12
Alice | 14
Allain | 9
Amily | 9
Annette | 12
Aoi | 9
Arduin | 10
Arum | 12
Astrid | 11
Ata | 8
Aya | 7
Azzen'ka | 7
Baldum | 7
Bijan | 6
Billow | 3
Biron | 3
Bolt Baron | 4
Bonnie | 5
Bright | 7
Butterfly | 29`;

const STORAGE_KEY = "hero-reference-list";

function parse(text: string) {
  const rows: { name: string; count: number | null }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const [name, rawCount] = line.split(/[|\t,]/).map((part) => part.trim());
    if (!name) continue;
    const count = rawCount && /^\d+$/.test(rawCount) ? Number(rawCount) : null;
    rows.push({ name, count });
  }
  return rows;
}

type PlanItem = {
  key: string;
  kind: "rename" | "merge" | "delete";
  hero: LibHero;
  target?: string;
  label: string;
  note: string;
  defaultOn: boolean;
};

export function HeroCheck({
  heroes,
  action,
  deleteAction,
}: {
  heroes: LibHero[];
  action: Action;
  deleteAction: (ids: string[]) => Promise<{ ok: boolean; deleted: number }>;
}) {
  const router = useRouter();
  const [text, setText] = useState(DEFAULT_LIST);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [fixing, setFixing] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setText(saved);
    } catch {
      /* storage can be unavailable */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {
      /* ignore */
    }
  }, [text]);

  const result = useMemo(() => {
    const refs = parse(text);
    const byNorm = new Map(heroes.map((h) => [normalizeSkinName(h.name), h]));
    const used = new Set<string>();
    const rows = refs.map((ref) => {
      const hero = byNorm.get(normalizeSkinName(ref.name)) ?? null;
      if (hero) used.add(hero.id);
      return { ref, hero };
    });
    const letters = new Set(refs.map((r) => normalizeSkinName(r.name).charAt(0)).filter(Boolean));
    const extras = heroes.filter((h) => !used.has(h.id) && letters.has(normalizeSkinName(h.name).charAt(0)));
    // Suggestions for a missing reference hero: any library hero (not already matched) with a similar name.
    const suggest = (name: string, expected: number | null) =>
      heroes
        .filter((h) => !used.has(h.id))
        .map((h) => ({ h, score: nameSimilarity(h.name, name) }))
        .filter(({ h, score }) => score >= 0.6 || (expected !== null && h.count === expected && score >= 0.5))
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(({ h }) => h);
    return { rows, extras, suggest };
  }, [text, heroes]);

  const run = async (hero: LibHero, newName: string) => {
    if (!window.confirm(`เปลี่ยน/รวม "${hero.name}" (${hero.count} สกิน) เป็น "${newName}"?`)) return;
    setBusyId(hero.id);
    setMessage(null);
    const outcome = await action(hero.id, newName);
    setBusyId(null);
    if (!outcome.ok) setMessage({ kind: "error", text: outcome.error ?? "ไม่สำเร็จ" });
    else {
      setMessage({ kind: "ok", text: `ทำแล้ว: ${hero.name} เป็น ${newName}` });
      router.refresh();
    }
  };

  // Plan: what would make the library match the list (names and extra heroes only).
  const plan = useMemo(() => {
    const items: PlanItem[] = [];
    const taken = new Set<string>();
    // 1. Missing reference heroes: rename the library hero that is clearly the same one.
    for (const { ref, hero } of result.rows) {
      if (hero) continue;
      const candidates = result.suggest(ref.name, ref.count).filter((c) => !taken.has(c.id));
      const pick =
        candidates.find((c) => ref.count !== null && c.count === ref.count) ??
        candidates.find((c) => nameSimilarity(c.name, ref.name) >= 0.8);
      if (!pick) continue;
      taken.add(pick.id);
      items.push({
        key: `rename:${pick.id}`,
        kind: "rename",
        hero: pick,
        target: ref.name,
        label: `เปลี่ยนชื่อ "${pick.name}" เป็น "${ref.name}"`,
        note: `${pick.count} สกิน${ref.count !== null && pick.count === ref.count ? " (จำนวนตรงกับรายการ)" : ""}`,
        defaultOn: true,
      });
    }
    // 2. Extra heroes: merge into the matching reference hero, or delete.
    for (const hero of result.extras) {
      if (taken.has(hero.id)) continue;
      const near = result.rows
        .map((r) => ({ r, score: nameSimilarity(hero.name, r.ref.name) }))
        .filter(({ score }) => score >= 0.8)
        .sort((a, b) => b.score - a.score)[0]?.r;
      if (near) {
        items.push({
          key: `merge:${hero.id}`,
          kind: "merge",
          hero,
          target: near.ref.name,
          label: `รวม "${hero.name}" เข้ากับ "${near.ref.name}"`,
          note: `${hero.count} สกิน (สกินชื่อซ้ำเก็บไว้ใบเดียว)`,
          defaultOn: true,
        });
      } else {
        items.push({
          key: `delete:${hero.id}`,
          kind: "delete",
          hero,
          label: `ลบฮีโร่ "${hero.name}"`,
          note: hero.count === 0 ? "ไม่มีสกิน" : `มี ${hero.count} สกินที่จะถูกลบด้วย (ส่งภาพแคปใหม่เพื่อเพิ่มกลับได้)`,
          defaultOn: hero.count === 0,
        });
      }
    }
    return items;
  }, [result]);

  const chosenPlan = plan.filter((item) => item.defaultOn !== off.has(item.key));

  const runPlan = async () => {
    if (!window.confirm(`ทำตามแผน ${chosenPlan.length} รายการ? การลบและการรวมย้อนกลับไม่ได้`)) return;
    setFixing(true);
    setMessage(null);
    let done = 0;
    const errors: string[] = [];
    for (const item of chosenPlan.filter((i) => i.kind !== "delete")) {
      const outcome = await action(item.hero.id, item.target ?? item.hero.name);
      if (outcome.ok) done++;
      else errors.push(`${item.hero.name}: ${outcome.error ?? "ไม่สำเร็จ"}`);
    }
    const deleteIds = chosenPlan.filter((i) => i.kind === "delete").map((i) => i.hero.id);
    if (deleteIds.length > 0) {
      const outcome = await deleteAction(deleteIds);
      done += outcome.deleted;
    }
    setFixing(false);
    setMessage(
      errors.length === 0
        ? { kind: "ok", text: `ทำตามแผนแล้ว ${done} รายการ` }
        : { kind: "error", text: `ทำแล้ว ${done} รายการ แต่มีที่ไม่สำเร็จ: ${errors.join(" · ")}` }
    );
    router.refresh();
  };

  const okCount = result.rows.filter((r) => r.hero && (r.ref.count === null || r.hero.count === r.ref.count)).length;

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-ink-muted">รายการอ้างอิง (ชื่อฮีโร่ | จำนวนสกิน)</span>
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={8} className="input font-mono" />
      </label>

      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <p className="text-sm text-ink-muted">
        ตรงตามรายการ {okCount} จาก {result.rows.length} ฮีโร่
        {result.extras.length > 0 ? ` · มีฮีโร่เกินหรือชื่อผิด ${result.extras.length}` : ""}
      </p>

      {plan.length > 0 ? (
        <div className="space-y-3 rounded-2xl border border-gold/40 bg-card p-4">
          <h2 className="font-semibold text-ink">แผนแก้ให้ตรงรายการ ({plan.length})</h2>
          <p className="text-xs text-ink-muted">
            ติ๊กอันที่ต้องการ แล้วกดทำตามแผน การลบที่มีสกินอยู่ในฮีโร่นั้นไม่ถูกติ๊กไว้ให้ ติ๊กเองถ้าแน่ใจว่าเป็นของผิด
          </p>
          <ul className="space-y-1.5">
            {plan.map((item) => (
              <li key={item.key}>
                <label className="flex items-start gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={item.defaultOn !== off.has(item.key)}
                    onChange={() =>
                      setOff((current) => {
                        const next = new Set(current);
                        if (next.has(item.key)) next.delete(item.key);
                        else next.add(item.key);
                        return next;
                      })
                    }
                  />
                  <span>
                    <span className={item.kind === "delete" ? "text-rose-300" : "text-ink"}>{item.label}</span>
                    <span className="ml-2 text-xs text-ink-muted">{item.note}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button type="button" onClick={runPlan} disabled={fixing || chosenPlan.length === 0} className="btn-primary">
            {fixing ? "กำลังทำ..." : `ทำตามแผน ${chosenPlan.length} รายการ`}
          </button>
        </div>
      ) : null}

      <ul className="space-y-2">
        {result.rows.map(({ ref, hero }) => {
          const countOk = hero && (ref.count === null || hero.count === ref.count);
          const diff = hero && ref.count !== null ? hero.count - ref.count : 0;
          const suggestions = hero ? [] : result.suggest(ref.name, ref.count);
          return (
            <li key={ref.name} className="card flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {ref.name}
                  {ref.count !== null ? <span className="ml-2 text-xs text-ink-muted">ควรมี {ref.count} สกิน</span> : null}
                </p>
                {!hero ? (
                  <p className="text-sm text-rose-300">ยังไม่มีฮีโร่นี้ในคลัง</p>
                ) : countOk ? (
                  <p className="text-sm text-emerald-300">
                    ถูกต้อง มี {hero.count} สกิน{hero.withPicture < hero.count ? ` (ยังไม่มีรูป ${hero.count - hero.withPicture})` : ""}
                  </p>
                ) : (
                  <p className="text-sm text-gold-soft">
                    มี {hero.count} สกิน {diff < 0 ? `ขาด ${-diff}` : `เกิน ${diff}`}
                    {hero.withPicture < hero.count ? ` · ยังไม่มีรูป ${hero.count - hero.withPicture}` : ""}
                  </p>
                )}
                {suggestions.length > 0 ? (
                  <p className="mt-1 text-xs text-ink-muted">
                    ในคลังมีชื่อใกล้เคียง:{" "}
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => run(s, ref.name)}
                        className="mr-2 rounded border border-border px-2 py-0.5 text-gold-soft hover:border-gold"
                      >
                        {s.name} ({s.count} สกิน) → เปลี่ยนชื่อเป็น {ref.name}
                      </button>
                    ))}
                  </p>
                ) : null}
              </div>
              {hero ? (
                <Link href={`/admin/skins/${hero.id}`} className="text-sm text-gold-soft hover:underline">
                  จัดการ
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>

      {result.extras.length > 0 ? (
        <div className="space-y-2">
          <h2 className="font-semibold text-ink">ในคลังแต่ไม่อยู่ในรายการอ้างอิง (เกินหรือชื่อผิด)</h2>
          <ul className="space-y-2">
            {result.extras.map((hero) => {
              const near = result.rows
                .map((r) => ({ r, score: nameSimilarity(hero.name, r.ref.name) }))
                .filter(({ score }) => score >= 0.6)
                .sort((a, b) => b.score - a.score)[0]?.r;
              return (
                <li key={hero.id} className="card flex flex-wrap items-center justify-between gap-3 p-3">
                  <p className="text-ink">
                    {hero.name} <span className="text-xs text-ink-muted">{hero.count} สกิน</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {near ? (
                      <button
                        type="button"
                        disabled={busyId === hero.id}
                        onClick={() => run(hero, near.ref.name)}
                        className="btn-secondary px-3 py-1.5 text-sm"
                      >
                        {near.hero ? "รวมเข้ากับ" : "เปลี่ยนชื่อเป็น"} {near.ref.name}
                      </button>
                    ) : null}
                    <Link href={`/admin/skins/${hero.id}`} className="text-sm text-gold-soft hover:underline">
                      จัดการ / รวม / ลบ
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
