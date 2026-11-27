"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chargeDownloadAction } from "@/lib/actions/membership";
import {
  BANNER_THEMES,
  renderBanner,
  type BannerInfo,
  type BannerSkin,
  type BannerThemeKey,
  type BannerWatermark,
} from "@/lib/banner";
import {
  BoltIcon,
  CheckCircleIcon,
  GridIcon,
  LayersIcon,
  SearchIcon,
  ShareIcon,
  ShieldIcon,
  StarIcon,
  SwordIcon,
  XIcon,
} from "@/components/icons";
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

export type SorterWallet = {
  state: "guest" | "member" | "admin";
  balanceCents: number;
  skinPriceCents: number;
  noWatermarkCents: number;
  signupBonusCents: number;
};

const PAID_KEY_STORAGE = "oscar:paid-banners:v1";

function coins(cents: number) {
  return (cents / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

export function SkinSorter({
  heroes,
  initialInfo,
  watermark,
  wallet,
}: {
  heroes: SorterHero[];
  initialInfo?: Partial<BannerInfo>;
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
      <div className="sticky top-[56px] z-30 -mx-4 bg-gradient-to-b from-[#261d50] from-60% to-transparent px-4 pb-3 pt-2">
        <div className="grid grid-cols-3 gap-1 rounded-full border border-violet-soft/30 bg-[#2d2361]/95 p-1.5 text-sm shadow-panel backdrop-blur-md">
          {(
            [
              ["pick", "1. เลือกสกิน", StarIcon],
              ["order", "2. จัดเรียง", LayersIcon],
              ["banner", "3. ทำป้าย", ShareIcon],
            ] as const
          ).map(([key, label, TabIcon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={tab === key ? "step" : undefined}
              className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-2.5 font-semibold transition ${
                tab === key
                  ? "bg-gradient-to-b from-gold-soft to-gold text-[#2a1b05] shadow-goldGlow"
                  : "text-ink hover:bg-white/10"
              }`}
            >
              <TabIcon className={`shrink-0 text-base ${tab === key ? "" : "text-violet-soft"}`} />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "pick" ? (
        <div className="mt-4 space-y-4">
          <div className="card space-y-3 p-4">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`ค้นหาฮีโร่หรือสกิน (${totalSkins.toLocaleString("th-TH")} สกิน)`}
                className="input pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-violet-soft/40 text-ink-muted hover:text-ink"
                >
                  <XIcon />
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <ShieldIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-violet-soft" />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input w-auto pl-9">
                <option value="">ทุกตำแหน่ง</option>
                {HERO_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {HERO_ROLE_LABELS[role]}
                  </option>
                ))}
                </select>
              </div>
              <div className="relative">
                <GridIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-violet-soft" />
                <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="input w-auto pl-9">
                <option value="">ทุกระดับ</option>
                {SKIN_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {SKIN_TIER_LABELS[tier]}
                  </option>
                ))}
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-2 px-1 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={onlySelected}
                  onChange={(e) => setOnlySelected(e.target.checked)}
                  className="h-5 w-5"
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
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <h2 className="flex min-w-0 items-baseline gap-2">
                    <SwordIcon className="shrink-0 self-center text-lg text-violet-soft" />
                    <span className="truncate text-lg font-bold italic text-ink">{hero.name}</span>
                    <span className="shrink-0 text-sm text-ink-muted">
                      {HERO_ROLE_LABELS[hero.role as HeroRole] ?? hero.role} : {picked}/{fullHero.skins.length}
                    </span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => toggleHero(fullHero)}
                    className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-gold transition hover:bg-white/10"
                  >
                    {allOn ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
                    <CheckCircleIcon className="text-base" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2.5 min-[480px]:grid-cols-4 sm:grid-cols-6 lg:grid-cols-8">
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
          wallet={wallet}
        />
      ) : null}

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="card mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl bg-[#2a2058]/85 px-4 py-3">
          <p className="text-sm text-ink">
            เลือกแล้ว <span className="mx-0.5 text-2xl font-black text-gold">{ordered.length}</span> สกิน
          </p>
          {tab !== "banner" ? (
            <button
              type="button"
              onClick={() => {
                setTab(tab === "pick" ? "order" : "banner");
                window.scrollTo({ top: 0 });
              }}
              className="btn-primary flex items-center gap-2 rounded-full px-5"
            >
              <BoltIcon />
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
      className={`group relative aspect-[4/5] overflow-hidden rounded-2xl border-2 text-left transition duration-150 ${
        active ? "-translate-y-0.5" : "hover:-translate-y-0.5"
      }`}
      style={{
        borderColor: active ? color : `${color}66`,
        boxShadow: active ? `0 0 0 2px ${color}55, 0 8px 24px ${color}55` : "0 4px 14px rgba(10,6,30,0.35)",
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet/60 via-[#3a2d78] to-[#241b4d] text-4xl font-black text-white/25">
          {heroName.slice(0, 1)}
        </div>
      )}
      {!active ? <div className="absolute inset-0 bg-[#1a1338]/25 transition group-hover:bg-transparent" /> : null}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#120c28]/95 via-[#120c28]/60 to-transparent px-2 pb-1.5 pt-8">
        <p className="truncate text-xs font-semibold leading-tight text-white">{name}</p>
      </div>
      {tier !== "NORMAL" ? (
        <span
          className="absolute left-0 top-0 rounded-br-xl px-2 py-0.5 text-[11px] font-black leading-4 text-[#1a1030]"
          style={{ backgroundColor: color }}
        >
          {SKIN_TIER_LABELS[tier as SkinTier] ?? tier}
        </span>
      ) : null}
      {active ? (
        <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-xs font-black text-[#2a1b05] shadow-goldGlow">
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
  wallet,
}: {
  info: BannerInfo;
  setInfo: (info: BannerInfo) => void;
  theme: BannerThemeKey;
  setTheme: (theme: BannerThemeKey) => void;
  showNames: boolean;
  setShowNames: (value: boolean) => void;
  skins: BannerSkin[];
  watermark: BannerWatermark;
  wallet: SorterWallet;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noWatermark, setNoWatermark] = useState(false);
  const [balance, setBalance] = useState(wallet.balanceCents);
  const [paidKeys, setPaidKeys] = useState<string[]>([]);
  const renderId = useRef(0);

  // A banner that was already paid for can be downloaded/shared again for
  // free, as long as nothing on it changed.
  const bannerKey = useMemo(
    () => JSON.stringify({ ids: skins.map((s) => s.id), info, theme, showNames, noWatermark }),
    [skins, info, theme, showNames, noWatermark]
  );
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PAID_KEY_STORAGE);
      if (raw) setPaidKeys(JSON.parse(raw));
    } catch {
      // storage unavailable — worst case a re-download is charged again
    }
  }, []);
  const isAdmin = wallet.state === "admin";
  const isPaid = isAdmin || paidKeys.includes(bannerKey);
  const costCents = skins.length * wallet.skinPriceCents + (noWatermark ? wallet.noWatermarkCents : 0);
  const canAfford = balance >= costCents;

  const bannerOptions = useCallback(
    (preview: boolean) => ({
      info,
      skins,
      theme,
      showNames,
      // next/font registers Kanit under a generated family name; read it
      // back from the page so the canvas uses the same Thai font.
      fontFamily: getComputedStyle(document.body).fontFamily || "sans-serif",
      watermark: noWatermark ? null : watermark,
      preview,
    }),
    [info, skins, theme, showNames, noWatermark, watermark]
  );

  // Re-render (debounced) whenever anything on the banner changes. A newer
  // render supersedes older ones still waiting on images. Until this exact
  // banner is paid for, the on-screen copy carries the "ตัวอย่าง" overlay.
  useEffect(() => {
    const id = ++renderId.current;
    setRendering(true);
    const timer = window.setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        await document.fonts.ready;
        if (id !== renderId.current) return;
        const offscreen = document.createElement("canvas");
        await renderBanner(offscreen, bannerOptions(!isPaid));
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
  }, [bannerOptions, isPaid]);

  // Charges the wallet once per distinct banner, then renders a clean copy.
  const paidBlob = async (): Promise<Blob | null> => {
    setError(null);
    setNotice(null);
    if (!isPaid) {
      const result = await chargeDownloadAction(
        skins.map((s) => s.id),
        noWatermark
      );
      if (!result.ok) {
        if (result.balanceCents !== undefined) setBalance(result.balanceCents);
        if (result.reason === "login") window.location.href = "/login?callbackUrl=%2Fsort";
        setError(result.message);
        return null;
      }
      setBalance(result.balanceCents);
      const next = [bannerKey, ...paidKeys].slice(0, 30);
      setPaidKeys(next);
      try {
        window.localStorage.setItem(PAID_KEY_STORAGE, JSON.stringify(next));
      } catch {
        // ignore
      }
      if (result.costCents > 0) setNotice(`ชำระ ${coins(result.costCents)} คอยน์แล้ว`);
    }
    const out = document.createElement("canvas");
    await renderBanner(out, bannerOptions(false));
    return new Promise((resolve) => {
      try {
        out.toBlob((blob) => resolve(blob), "image/png");
      } catch {
        // A cross-origin image without CORS headers taints the canvas.
        resolve(null);
      }
    });
  };

  const fileName = () => `oscar-skins-${skins.length}-${Date.now()}.png`;

  const saveBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const download = async () => {
    setBusy(true);
    try {
      const blob = await paidBlob();
      if (blob) saveBlob(blob);
      else setError((e) => e ?? "ดาวน์โหลดไม่สำเร็จ (รูปสกินบางรูปไม่อนุญาตให้ส่งออก)");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const blob = await paidBlob();
      if (!blob) return;
      const file = new File([blob], fileName(), { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: info.title || "ขายไอดี RoV" });
        } catch (e) {
          // Safari drops the "user tapped" permission while we waited for
          // the payment — the banner is paid now, so a second tap works.
          if (e instanceof DOMException && e.name === "NotAllowedError") {
            setNotice("ชำระแล้ว — กด “แชร์” อีกครั้งเพื่อเปิดเมนูแชร์");
          }
        }
      } else {
        saveBlob(blob);
      }
    } finally {
      setBusy(false);
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
          <h2 className="font-semibold text-ink">ตกแต่ง (ฟรี)</h2>
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
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
            แสดงชื่อสกินบนภาพ
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={noWatermark} onChange={(e) => setNoWatermark(e.target.checked)} />
            ไม่มีลายน้ำ OSCAR (+{coins(wallet.noWatermarkCents)} คอยน์)
          </label>
        </div>

        {wallet.state === "guest" ? (
          <GuestPanel wallet={wallet} costCents={costCents} />
        ) : (
          <div className="card space-y-3 p-4">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-ink-muted">
                {skins.length} สกิน × {coins(wallet.skinPriceCents)}
                {noWatermark ? ` + ${coins(wallet.noWatermarkCents)}` : ""}
              </span>
              <span className="text-lg font-bold text-gold">
                {isAdmin ? "ฟรี (แอดมิน)" : isPaid ? "จ่ายแล้ว" : `${coins(costCents)} คอยน์`}
              </span>
            </div>
            {!isAdmin ? (
              <p className="text-xs text-ink-muted">
                คอยน์คงเหลือ <span className="font-semibold text-ink">{coins(balance)}</span> ·{" "}
                <a href="/account" className="text-gold hover:underline">
                  เติมคอยน์
                </a>
              </p>
            ) : null}
            {isPaid || canAfford ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={download}
                  disabled={rendering || busy || skins.length === 0}
                  className="btn-primary"
                >
                  {busy ? "กำลังเตรียม..." : isPaid ? "ดาวน์โหลด" : `ดาวน์โหลด · ${coins(costCents)}`}
                </button>
                <button
                  type="button"
                  onClick={share}
                  disabled={rendering || busy || skins.length === 0}
                  className="btn-secondary"
                >
                  แชร์
                </button>
              </div>
            ) : (
              <a href="/account" className="btn-primary block">
                คอยน์ไม่พอ — เติมคอยน์
              </a>
            )}
            {!isPaid && !isAdmin ? (
              <p className="text-center text-xs text-ink-muted">จ่ายครั้งเดียวต่อป้าย ดาวน์โหลดซ้ำป้ายเดิมไม่เสียเพิ่ม</p>
            ) : null}
          </div>
        )}
        {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
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
        {!isPaid ? (
          <p className="mt-2 text-center text-xs text-ink-muted">ภาพตัวอย่าง — ลายน้ำ “ตัวอย่าง” จะหายเมื่อดาวน์โหลด</p>
        ) : null}
      </div>
    </div>
  );
}

function GuestPanel({ wallet, costCents }: { wallet: SorterWallet; costCents: number }) {
  return (
    <div className="card space-y-3 border-gold/50 p-4 text-center">
      <p className="font-semibold text-ink">
        ป้ายนี้ {coins(costCents)} คอยน์{" "}
        <span className="text-sm font-normal text-ink-muted">({coins(wallet.skinPriceCents)} คอยน์/สกิน)</span>
      </p>
      <p className="text-sm text-ink-muted">
        สมัครด้วยอีเมลเพื่อดาวน์โหลด
        {wallet.signupBonusCents > 0 ? ` · รับฟรี ${coins(wallet.signupBonusCents)} คอยน์` : ""} · ป้ายที่ทำไว้ไม่หาย
      </p>
      <a href="/register?callbackUrl=%2Fsort" className="btn-primary block">
        สมัครสมาชิก
      </a>
      <a href="/login?callbackUrl=%2Fsort" className="block text-sm text-gold hover:underline">
        มีบัญชีแล้ว? เข้าสู่ระบบ
      </a>
    </div>
  );
}
