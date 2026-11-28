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
Azzen'ka | 7`;

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

export function HeroCheck({ heroes, action }: { heroes: LibHero[]; action: Action }) {
  const router = useRouter();
  const [text, setText] = useState(DEFAULT_LIST);
  const [busyId, setBusyId] = useState<string | null>(null);
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
