"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BANNER_THEMES,
  renderBanner,
  type BannerInfo,
  type BannerSkin,
  type BannerThemeKey,
  type BannerWatermark,
} from "@/lib/banner";
import {
  HERO_ROLES,
  HERO_ROLE_LABELS,
  RANK_TIERS,
  SKIN_TIERS,
  SKIN_TIER_COLORS,
  SKIN_TIER_LABELS,
  skinTierRank,
  type HeroRole,
  type SkinTier,
} from "@/lib/types";

export type SorterHero = {
  id: string;
  name: string;
  role: string;
  skins: { id: string; name: string; tier: string; imageUrl: string | null }[];
};

type SortMode = "tier" | "hero" | "manual";
type Tab = "pick" | "order" | "banner";

const STORAGE_KEY = "rovshop:skin-sorter:v1";

const EMPTY_INFO: BannerInfo = { title: "", rank: "", heroCount: "", price: "", contact: "", note: "" };

type Saved = {
  selected: string[];
  sortMode: SortMode;
  info: BannerInfo;
  theme: BannerThemeKey;
  showNames: boolean;
};

function readSaved(): Partial<Saved> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Saved>) : null;
  } catch {
    return null;
  }
}

function tierColor(tier: string) {
  return SKIN_TIER_COLORS[tier as SkinTier] ?? SKIN_TIER_COLORS.NORMAL;
}

export function SkinSorter({
  heroes,
  initialInfo,
  watermark,
}: {
  heroes: SorterHero[];
  initialInfo?: Partial<BannerInfo>;
  watermark: BannerWatermark;
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

  const [tab, setTab] = useState<Tab>("pick");
  const [selected, setSelected] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("tier");
  const [info, setInfo] = useState<BannerInfo>({ ...EMPTY_INFO, ...initialInfo });
  const [theme, setTheme] = useState<BannerThemeKey>("royal");
  const [showNames, setShowNames] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [onlySelected, setOnlySelected] = useState(false);

  // Restore the previous session after mount (localStorage isn't available
  // during server render, and reading it there would break hydration).
  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      if (Array.isArray(saved.selected)) setSelected(saved.selected.filter((id) => typeof id === "string"));
      if (saved.sortMode) setSortMode(saved.sortMode);
      if (saved.theme && saved.theme in BANNER_THEMES) setTheme(saved.theme);
      if (typeof saved.showNames === "boolean") setShowNames(saved.showNames);
      // Details from a "make a banner for this ID" link win over saved ones.
      if (saved.info) setInfo({ ...EMPTY_INFO, ...saved.info, ...initialInfo });
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      const data: Saved = { selected, sortMode, info, theme, showNames };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Private mode / storage full: the sorter still works, it just won't
      // remember the selection.
    }
  }, [loaded, selected, sortMode, info, theme, showNames]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Skins in the order they'll appear on the banner. Ids of skins an admin
  // has since deleted are silently dropped.
  const ordered = useMemo(() => {
    const list = selected.map((id) => skinById.get(id)).filter((s): s is NonNullable<typeof s> => !!s);
    if (sortMode === "tier") {
      list.sort(
        (a, b) =>
          skinTierRank(a.tier) - skinTierRank(b.tier) ||
          a.heroName.localeCompare(b.heroName) ||
          a.name.localeCompare(b.name)
      );
    } else if (sortMode === "hero") {
      list.sort(
        (a, b) => a.heroName.localeCompare(b.heroName) || skinTierRank(a.tier) - skinTierRank(b.tier)
      );
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
      .filter((hero) => !roleFilter || hero.role === roleFilter)
      .map((hero) => {
        const heroMatch = q && hero.name.toLowerCase().includes(q);
        const skins = hero.skins
          .filter((skin) => !tierFilter || skin.tier === tierFilter)
          .filter((skin) => !onlySelected || selectedSet.has(skin.id))
          .filter((skin) => !q || heroMatch || skin.name.toLowerCase().includes(q))
          .sort((a, b) => skinTierRank(a.tier) - skinTierRank(b.tier) || a.name.localeCompare(b.name));
        return { ...hero, skins };
      })
      .filter((hero) => hero.skins.length > 0);
  }, [heroes, query, tierFilter, roleFilter, onlySelected, selectedSet]);

  const totalSkins = skinById.size;

  return (
    <div className="pb-28">
      {/* Tabs */}
      <div className="sticky top-[57px] z-30 -mx-4 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-bg-soft p-1 text-sm">
          {(
            [
              ["pick", "1. เลือกสกิน"],
              ["order", "2. จัดเรียง"],
              ["banner", "3. ทำป้าย"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-2 py-2 font-medium transition ${
                tab === key ? "bg-gold text-bg" : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "pick" ? (
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
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input w-auto">
                <option value="">ทุกตำแหน่ง</option>
                {HERO_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {HERO_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="input w-auto">
                <option value="">ทุกระดับ</option>
                {SKIN_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {SKIN_TIER_LABELS[tier]}
                  </option>
                ))}
              </select>
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
                      {HERO_ROLE_LABELS[hero.role as HeroRole] ?? hero.role} · {picked}/{fullHero.skins.length}
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
                      tier={skin.tier}
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
              {totalSkins === 0 ? "ยังไม่มีสกินในคลัง — แอดมินเพิ่มได้ที่เมนูคลังสกิน" : "ไม่พบสกินที่ค้นหา"}
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "order" ? (
        <div className="mt-4 space-y-4">
          <div className="card flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="text-ink-muted">เรียงตาม:</span>
            {(
              [
                ["tier", "ระดับความหายาก"],
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
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold text-bg"
                  style={{ backgroundColor: tierColor(skin.tier) }}
                >
                  {SKIN_TIER_LABELS[skin.tier as SkinTier] ?? skin.tier}
                </span>
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

      {tab === "banner" ? (
        <BannerStep
          info={info}
          setInfo={setInfo}
          theme={theme}
          setTheme={setTheme}
          showNames={showNames}
          setShowNames={setShowNames}
          skins={ordered}
          watermark={watermark}
        />
      ) : null}

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-ink-muted">
            เลือกแล้ว <span className="text-lg font-bold text-gold">{ordered.length}</span> สกิน
          </p>
          {tab !== "banner" ? (
            <button
              type="button"
              onClick={() => {
                setTab(tab === "pick" ? "order" : "banner");
                window.scrollTo({ top: 0 });
              }}
              className="btn-primary"
            >
              {tab === "pick" ? "ถัดไป: จัดเรียง →" : "ถัดไป: ทำป้าย →"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SkinTile({
  name,
  heroName,
  tier,
  imageUrl,
  active,
  onClick,
}: {
  name: string;
  heroName: string;
  tier: string;
  imageUrl: string | null;
  active: boolean;
  onClick: () => void;
}) {
  const color = tierColor(tier);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${heroName} — ${name}`}
      className={`group relative aspect-[4/5] overflow-hidden rounded-xl border-2 text-left transition ${
        active ? "scale-[0.97]" : "opacity-80 hover:opacity-100"
      }`}
      style={{ borderColor: active ? color : "transparent" }}
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
      {tier !== "NORMAL" ? (
        <span
          className="absolute left-1 top-1 rounded-full px-1.5 text-[10px] font-bold leading-4 text-bg"
          style={{ backgroundColor: color }}
        >
          {SKIN_TIER_LABELS[tier as SkinTier] ?? tier}
        </span>
      ) : null}
      {active ? (
        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-bg">
          ✓
        </span>
      ) : null}
    </button>
  );
}

function BannerStep({
  info,
  setInfo,
  theme,
  setTheme,
  showNames,
  setShowNames,
  skins,
  watermark,
}: {
  info: BannerInfo;
  setInfo: (info: BannerInfo) => void;
  theme: BannerThemeKey;
  setTheme: (theme: BannerThemeKey) => void;
  showNames: boolean;
  setShowNames: (value: boolean) => void;
  skins: BannerSkin[];
  watermark: BannerWatermark;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderId = useRef(0);

  // Re-render (debounced) whenever anything on the banner changes. A newer
  // render supersedes older ones still waiting on images.
  useEffect(() => {
    const id = ++renderId.current;
    setRendering(true);
    const timer = window.setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        await document.fonts.ready;
        if (id !== renderId.current) return;
        // next/font registers Kanit under a generated family name; read it
        // back from the page so the canvas uses the same Thai font.
        const fontFamily = getComputedStyle(document.body).fontFamily || "sans-serif";
        const offscreen = document.createElement("canvas");
        await renderBanner(offscreen, { info, skins, theme, showNames, fontFamily, watermark });
        if (id !== renderId.current) return;
        canvas.width = offscreen.width;
        canvas.height = offscreen.height;
        canvas.getContext("2d")?.drawImage(offscreen, 0, 0);
        setError(null);
      } catch {
        setError("สร้างภาพไม่สำเร็จ ลองใหม่อีกครั้ง");
      } finally {
        if (id === renderId.current) setRendering(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [info, skins, theme, showNames, watermark]);

  const toBlob = () =>
    new Promise<Blob | null>((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      try {
        canvas.toBlob((blob) => resolve(blob), "image/png");
      } catch {
        // A cross-origin image without CORS headers taints the canvas.
        resolve(null);
      }
    });

  const fileName = () => `rov-skins-${skins.length}-${Date.now()}.png`;

  const download = async () => {
    const blob = await toBlob();
    if (!blob) return setError("ดาวน์โหลดไม่สำเร็จ (รูปสกินบางรูปไม่อนุญาตให้ส่งออก)");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const share = async () => {
    const blob = await toBlob();
    if (!blob) return setError("แชร์ไม่สำเร็จ");
    const file = new File([blob], fileName(), { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: info.title || "ขายไอดี RoV" });
      } catch {
        // User closed the share sheet.
      }
    } else {
      await download();
    }
  };

  const field = (key: keyof BannerInfo) => ({
    value: info[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setInfo({ ...info, [key]: e.target.value }),
  });

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold text-ink">ข้อมูลบนป้าย</h2>
          <div>
            <label className="mb-1 block text-sm text-ink-muted">หัวข้อ</label>
            <input {...field("title")} maxLength={60} placeholder="ขายไอดี RoV สกินเยอะ" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-ink-muted">แรงค์</label>
              <input {...field("rank")} list="rank-options" maxLength={30} placeholder="เซียน" className="input" />
              <datalist id="rank-options">
                {RANK_TIERS.map((rank) => (
                  <option key={rank} value={rank} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink-muted">จำนวนฮีโร่</label>
              <input {...field("heroCount")} inputMode="numeric" maxLength={6} placeholder="120" className="input" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink-muted">ราคา (บาท)</label>
            <input {...field("price")} inputMode="numeric" maxLength={12} placeholder="2,500" className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink-muted">ช่องทางติดต่อ</label>
            <input {...field("contact")} maxLength={80} placeholder="FB: ชื่อเพจ / Line: @id" className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink-muted">หมายเหตุ</label>
            <input {...field("note")} maxLength={100} placeholder="ผูก FB เปลี่ยนได้ทันที" className="input" />
          </div>
        </div>

        <div className="card space-y-3 p-4">
          <h2 className="font-semibold text-ink">ธีม</h2>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(BANNER_THEMES) as BannerThemeKey[]).map((key) => {
              const t = BANNER_THEMES[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  className={`rounded-xl border-2 p-1 text-xs transition ${
                    theme === key ? "border-gold" : "border-transparent"
                  }`}
                >
                  <span
                    className="block h-10 rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${t.bgTop}, ${t.accent})` }}
                  />
                  <span className="mt-1 block text-ink-muted">{t.label}</span>
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={showNames}
              onChange={(e) => setShowNames(e.target.checked)}
              className="accent-[#e8b64a]"
            />
            แสดงชื่อสกินบนภาพ
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={download} disabled={rendering} className="btn-primary">
            ดาวน์โหลด PNG
          </button>
          <button type="button" onClick={share} disabled={rendering} className="btn-secondary">
            แชร์
          </button>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>

      <div className="min-w-0">
        <div className="card relative overflow-hidden p-2">
          <canvas ref={canvasRef} className="block h-auto w-full rounded-lg" />
          {rendering ? (
            <span className="absolute right-4 top-4 rounded-full bg-bg/80 px-3 py-1 text-xs text-ink-muted">
              กำลังสร้างภาพ...
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
