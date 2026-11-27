"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BACKGROUND_KEY, BackgroundStep, DetailsStep, PayStep, type SorterWallet } from "@/components/BannerBuilder";
import { loadUserImages } from "@/lib/user-images";
import {
  BANNER_THEMES,
  DEFAULT_DESIGN,
  EMPTY_INFO,
  type BannerDesign,
  type BannerSkin,
  type BannerWatermark,
} from "@/lib/banner";


export type SorterHero = {
  id: string;
  name: string;
  skins: { id: string; name: string; imageUrl: string | null }[];
};

type SortMode = "hero" | "manual";
type Tab = "pick" | "background" | "details" | "pay";
type PickView = "pick" | "order";

const STEPS: { key: Tab; label: string; short: string }[] = [
  { key: "pick", label: "1. เลือกสกิน", short: "พื้นหลัง" },
  { key: "background", label: "2. พื้นหลัง", short: "ข้อมูลไอดี" },
  { key: "details", label: "3. ข้อมูลไอดี", short: "ชำระเงิน" },
  { key: "pay", label: "4. ชำระเงิน", short: "" },
];

export type { SorterWallet };

const STORAGE_KEY = "rovshop:skin-sorter:v1";

type Saved = {
  selected: string[];
  sortMode: SortMode;
  info: Record<string, unknown>;
  theme: string;
  showNames: boolean;
  skinsPerRow: number;
};

function readSaved(): Partial<Saved> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Saved>) : null;
  } catch {
    return null;
  }
}

export function SkinSorter({
  heroes,
  watermark,
  wallet,
}: {
  heroes: SorterHero[];
  watermark: BannerWatermark;
  wallet: SorterWallet;
}) {
  // Flat lookup of every skin with its hero name attached.
  const skinById = useMemo(() => {
    const map = new Map<string, BannerSkin & { heroId: string }>();
    for (const hero of heroes) {
      for (const skin of hero.skins) {
        map.set(skin.id, { ...skin, heroName: hero.name, heroId: hero.id });
      }
    }
    return map;
  }, [heroes]);

  // The header background the visitor uploaded earlier is kept in this
  // browser only (IndexedDB); skin pictures come from the catalog.
  useEffect(() => {
    loadUserImages().then((all) => {
      const background = all[BACKGROUND_KEY];
      if (background) setDesign((d) => ({ ...d, background }));
    });
  }, []);

  const [tab, setTab] = useState<Tab>("pick");
  const [selected, setSelected] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("hero");
  const [pickView, setPickView] = useState<PickView>("pick");
  const [design, setDesign] = useState<BannerDesign>(DEFAULT_DESIGN);
  const [loaded, setLoaded] = useState(false);

  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);

  // Restore the previous session after mount (localStorage isn't available
  // during server render, and reading it there would break hydration).
  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      if (Array.isArray(saved.selected)) setSelected(saved.selected.filter((id) => typeof id === "string"));
      // (an older "by rarity" choice becomes "by hero name")
      if (saved.sortMode === "manual") setSortMode("manual");
      setDesign((d) => ({
        ...d,
        theme: saved.theme && saved.theme in BANNER_THEMES ? (saved.theme as BannerDesign["theme"]) : d.theme,
        showNames: typeof saved.showNames === "boolean" ? saved.showNames : d.showNames,
        skinsPerRow: typeof saved.skinsPerRow === "number" ? saved.skinsPerRow : d.skinsPerRow,
        // keep only fields the current form knows (older versions had others)
        info: saved.info
          ? { ...EMPTY_INFO, ...Object.fromEntries(Object.entries(saved.info).filter(([k]) => k in EMPTY_INFO)) }
          : d.info,
      }));
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      const data: Saved = {
        selected,
        sortMode,
        info: design.info,
        theme: design.theme,
        showNames: design.showNames,
        skinsPerRow: design.skinsPerRow,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Private mode / storage full: the sorter still works, it just won't
      // remember the selection.
    }
  }, [loaded, selected, sortMode, design.info, design.theme, design.showNames, design.skinsPerRow]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Skins in the order they'll appear on the banner. Ids of skins an admin
  // has since deleted are silently dropped.
  const ordered = useMemo(() => {
    const list = selected.map((id) => skinById.get(id)).filter((s): s is NonNullable<typeof s> => !!s);
    if (sortMode === "hero") {
      list.sort((a, b) => a.heroName.localeCompare(b.heroName) || a.name.localeCompare(b.name));
    }
    return list;
  }, [selected, skinById, sortMode]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleHero = (hero: SorterHero) => {
    const ids = hero.skins.map((s) => s.id);
    const allOn = ids.every((id) => selectedSet.has(id));
    setSelected((prev) =>
      allOn ? prev.filter((id) => !ids.includes(id)) : [...prev, ...ids.filter((id) => !prev.includes(id))]
    );
  };

  // Moving an item freezes the current automatic order into a manual one.
  const move = (index: number, delta: number) => {
    const ids = ordered.map((s) => s.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setSelected(ids);
    setSortMode("manual");
  };

  const applySort = (mode: SortMode) => {
    if (mode === "manual") setSelected(ordered.map((s) => s.id));
    setSortMode(mode);
  };

  const filteredHeroes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return heroes
      .map((hero) => {
        const heroMatch = q && hero.name.toLowerCase().includes(q);
        const skins = hero.skins
          .filter((skin) => !onlySelected || selectedSet.has(skin.id))
          .filter((skin) => !q || heroMatch || skin.name.toLowerCase().includes(q))
          .sort((a, b) => a.name.localeCompare(b.name));
        return { ...hero, skins };
      })
      .filter((hero) => hero.skins.length > 0);
  }, [heroes, query, onlySelected, selectedSet]);

  const totalSkins = skinById.size;
  const stepIndex = STEPS.findIndex((step) => step.key === tab);
  const goTo = (key: Tab) => {
    setTab(key);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="pb-28">
      {/* Steps */}
      <div className="sticky top-[57px] z-30 -mx-4 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-bg-soft p-1 text-xs sm:text-sm">
          {STEPS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => goTo(key)}
              aria-current={tab === key ? "step" : undefined}
              className={`rounded-lg px-1 py-2 font-medium transition ${
                tab === key ? "bg-gold text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "pick" ? (
        <div className="mt-3 flex gap-2 text-sm">
          {(
            [
              ["pick", "เลือกสกิน"],
              ["order", `จัดเรียง (${ordered.length})`],
            ] as [PickView, string][]
          ).map(([view, label]) => (
            <button
              key={view}
              type="button"
              onClick={() => setPickView(view)}
              className={`rounded-lg border px-3 py-1.5 transition ${
                pickView === view ? "border-gold bg-gold/10 text-gold" : "border-border text-ink-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "pick" && pickView === "pick" ? (
        <div className="mt-4 space-y-4">
          <div className="card space-y-3 p-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`ค้นหาฮีโร่หรือสกิน (${totalSkins.toLocaleString("th-TH")} สกิน)`}
              className="input"
            />
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-border px-3 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={onlySelected}
                  onChange={(e) => setOnlySelected(e.target.checked)}
                  className="accent-[#e8b64a]"
                />
                เฉพาะที่เลือก
              </label>
            </div>
          </div>

          {filteredHeroes.map((hero) => {
            const fullHero = heroes.find((h) => h.id === hero.id)!;
            const picked = fullHero.skins.filter((s) => selectedSet.has(s.id)).length;
            const allOn = picked === fullHero.skins.length;
            return (
              <section key={hero.id}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-ink">
                    {hero.name}{" "}
                    <span className="text-xs font-normal text-ink-muted">
                      {picked}/{fullHero.skins.length}
                    </span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => toggleHero(fullHero)}
                    className="rounded-lg px-2 py-1 text-xs text-gold hover:bg-bg-soft"
                  >
                    {allOn ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                  {hero.skins.map((skin) => (
                    <SkinTile
                      key={skin.id}
                      name={skin.name}
                      heroName={hero.name}
                      imageUrl={skin.imageUrl}
                      active={selectedSet.has(skin.id)}
                      onClick={() => toggle(skin.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          {filteredHeroes.length === 0 ? (
            <p className="py-12 text-center text-ink-muted">
              {totalSkins === 0 ? "ยังไม่มีสกินในคลัง" : "ไม่พบสกินที่ค้นหา"}
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "pick" && pickView === "order" ? (
        <div className="mt-4 space-y-4">
          <div className="card flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="text-ink-muted">เรียงตาม:</span>
            {(
              [
                ["hero", "ชื่อฮีโร่"],
                ["manual", "กำหนดเอง"],
              ] as [SortMode, string][]
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => applySort(mode)}
                className={`rounded-lg border px-3 py-1.5 transition ${
                  sortMode === mode ? "border-gold bg-gold/10 text-gold" : "border-border text-ink-muted"
                }`}
              >
                {label}
              </button>
            ))}
            {selected.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("ล้างสกินที่เลือกทั้งหมด?")) setSelected([]);
                }}
                className="ml-auto rounded-lg px-3 py-1.5 text-rose-300 hover:bg-rose-500/10"
              >
                ล้างทั้งหมด
              </button>
            ) : null}
          </div>
          <p className="text-xs text-ink-muted">กดลูกศรเพื่อสลับตำแหน่ง (ระบบจะเปลี่ยนเป็นโหมด “กำหนดเอง” ให้อัตโนมัติ)</p>
          <ol className="space-y-1.5">
            {ordered.map((skin, index) => (
              <li key={skin.id} className="card flex items-center gap-3 p-2">
                <span className="w-7 text-center text-xs text-ink-muted">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{skin.name}</p>
                  <p className="truncate text-xs text-ink-muted">{skin.heroName}</p>
                </div>
                <button
                  type="button"
                  aria-label="เลื่อนขึ้น"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded-lg px-2.5 py-1.5 text-ink-muted hover:bg-bg-soft disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="เลื่อนลง"
                  disabled={index === ordered.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded-lg px-2.5 py-1.5 text-ink-muted hover:bg-bg-soft disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="เอาออก"
                  onClick={() => toggle(skin.id)}
                  className="rounded-lg px-2.5 py-1.5 text-rose-300 hover:bg-rose-500/10"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          {ordered.length === 0 ? (
            <p className="py-12 text-center text-ink-muted">ยังไม่ได้เลือกสกิน — ไปที่แท็บ “เลือกสกิน” ก่อน</p>
          ) : null}
        </div>
      ) : null}

      {tab === "background" ? (
        <BackgroundStep design={design} setDesign={setDesign} skins={ordered} watermark={watermark} />
      ) : null}
      {tab === "details" ? (
        <DetailsStep design={design} setDesign={setDesign} skins={ordered} watermark={watermark} />
      ) : null}
      {tab === "pay" ? (
        <PayStep design={design} skins={ordered} watermark={watermark} wallet={wallet} />
      ) : null}

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-ink-muted">
            เลือกแล้ว <span className="text-lg font-bold text-gold">{ordered.length}</span> สกิน
          </p>
          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <button type="button" onClick={() => goTo(STEPS[stepIndex - 1].key)} className="btn-secondary px-4 py-2 text-sm">
                ← ย้อนกลับ
              </button>
            ) : null}
            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => goTo(STEPS[stepIndex + 1].key)}
                disabled={tab === "pick" && ordered.length === 0}
                className="btn-primary"
              >
                ถัดไป: {STEPS[stepIndex].short} →
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkinTile({
  name,
  heroName,
  imageUrl,
  active,
  onClick,
}: {
  name: string;
  heroName: string;
  imageUrl: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${heroName} — ${name}`}
      className={`group relative aspect-[4/5] overflow-hidden rounded-xl border-2 text-left transition ${
        active ? "scale-[0.97] border-gold" : "border-transparent opacity-80 hover:opacity-100"
      }`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet/40 to-bg-soft text-3xl font-bold text-white/20">
          {heroName.slice(0, 1)}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1 pt-6">
        <p className="truncate text-[11px] font-medium leading-tight text-white">{name}</p>
      </div>
      {active ? (
        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-white">
          ✓
        </span>
      ) : null}
    </button>
  );
}
