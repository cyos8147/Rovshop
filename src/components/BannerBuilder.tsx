"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { chargeDownloadAction } from "@/lib/actions/membership";
import { ImageCropper } from "@/components/ImageCropper";
import {
  BANNER_HEADER_HEIGHT,
  BANNER_THEMES,
  BANNER_WIDTH,
  renderBanner,
  type BannerDesign,
  type BannerInfo,
  type BannerSkin,
  type BannerThemeKey,
  type BannerWatermark,
} from "@/lib/banner";
import { RANK_TIERS } from "@/lib/types";
import { removeUserImage, saveUserImage } from "@/lib/user-images";

// Steps 2-4 of the banner maker: background, ID details and payment. Step 1
// (picking and ordering skins) lives in SkinSorter.

export const BACKGROUND_KEY = "bg:main"; // key in the browser-only image store

export type SorterWallet = {
  state: "guest" | "member" | "admin";
  balanceCents: number;
  skinPriceCents: number;
  noWatermarkCents: number;
  signupBonusCents: number;
  planUntil: string | null;
  planPrice: number;
};

const PAID_KEY_STORAGE = "oscar:paid-banners:v1";

export function coins(cents: number) {
  return (cents / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

type SetDesign = (update: (design: BannerDesign) => BannerDesign) => void;

// --- Preview --------------------------------------------------------------------

export function BannerPreview({
  design,
  skins,
  watermark,
  preview,
}: {
  design: BannerDesign;
  skins: BannerSkin[];
  watermark: BannerWatermark | null;
  preview: boolean;
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
        const offscreen = document.createElement("canvas");
        await renderBanner(offscreen, {
          design,
          skins,
          // next/font registers Kanit under a generated family name; read it
          // back from the page so the canvas uses the same Thai font.
          fontFamily: getComputedStyle(document.body).fontFamily || "sans-serif",
          watermark,
          preview,
        });
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
  }, [design, skins, watermark, preview]);

  return (
    <div className="card relative overflow-hidden p-2">
      <canvas ref={canvasRef} className="block h-auto w-full rounded-lg" />
      {rendering ? (
        <span className="absolute right-4 top-4 rounded-full bg-bg/80 px-3 py-1 text-xs text-ink-muted">
          กำลังสร้างภาพ...
        </span>
      ) : null}
      {error ? <p className="p-2 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}

// Controls on the right (below on phones), live preview on the left.
function Layout({ preview, children }: { preview: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="order-2 min-w-0 lg:order-1">
        <p className="mb-2 text-sm text-ink-muted lg:hidden">ตัวอย่างป้าย</p>
        {preview}
      </div>
      <div className="order-1 space-y-4 lg:order-2">{children}</div>
    </div>
  );
}

// --- Step 2: background ------------------------------------------------------------

export function BackgroundStep({
  design,
  setDesign,
  skins,
  watermark,
}: {
  design: BannerDesign;
  setDesign: SetDesign;
  skins: BannerSkin[];
  watermark: BannerWatermark;
}) {
  const chooserRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <Layout preview={<BannerPreview design={design} skins={skins} watermark={watermark} preview />}>
      <div className="card space-y-3 p-4">
        <div>
          <h2 className="font-semibold text-ink">รูปพื้นหลัง (อยู่เหนือแถวสกิน)</h2>
          <p className="mt-1 text-xs text-ink-muted">
            ใช้รูปของคุณเอง เช่น ภาพตัวละครหรือภาพแคปจากเกม ลากและซูมเพื่อเลือกส่วนที่ต้องการ รูปเก็บในเครื่องคุณเท่านั้น ไม่ถูกอัปโหลดขึ้นเว็บ
            ใช้เฉพาะรูปที่คุณมีสิทธิ์ใช้
          </p>
        </div>

        {design.background ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={design.background} alt="พื้นหลังที่เลือก" className="w-full rounded-xl border border-border" />
        ) : (
          <div className="flex aspect-[1080/600] w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-ink-muted">
            ยังไม่มีรูปพื้นหลัง (ใช้พื้นหลังสีตามธีมด้านล่าง)
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => chooserRef.current?.click()} className="btn-primary">
            {design.background ? "เปลี่ยนรูป" : "อัปโหลดรูปพื้นหลัง"}
          </button>
          <button
            type="button"
            disabled={!design.background}
            onClick={() => {
              setDesign((d) => ({ ...d, background: null }));
              void removeUserImage(BACKGROUND_KEY);
              setNotice(null);
            }}
            className="btn-secondary"
          >
            เอารูปออก
          </button>
        </div>
        {notice ? <p className="text-xs text-gold">{notice}</p> : null}
        <input
          ref={chooserRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="background-chooser"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) setCropFile(file);
          }}
        />
      </div>

      <div className="card space-y-3 p-4">
        <h2 className="font-semibold text-ink">ธีมสี</h2>
        <p className="text-xs text-ink-muted">ใช้กับสีตัวหนังสือ ขอบ และพื้นหลังเมื่อไม่ได้ใส่รูป</p>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(BANNER_THEMES) as BannerThemeKey[]).map((key) => {
            const t = BANNER_THEMES[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setDesign((d) => ({ ...d, theme: key }))}
                aria-pressed={design.theme === key}
                className={`rounded-xl border-2 p-1 text-xs transition ${
                  design.theme === key ? "border-gold" : "border-transparent"
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
      </div>

      {cropFile ? (
        <ImageCropper
          file={cropFile}
          aspect={BANNER_WIDTH / BANNER_HEADER_HEIGHT}
          outWidth={BANNER_WIDTH}
          title="ครอปพื้นหลัง"
          onCancel={() => setCropFile(null)}
          onDone={({ dataUrl }) => {
            setDesign((d) => ({ ...d, background: dataUrl }));
            setCropFile(null);
            void saveUserImage(BACKGROUND_KEY, dataUrl).then((ok) =>
              setNotice(ok ? null : "บันทึกรูปไว้ในเครื่องไม่ได้ (โหมดส่วนตัว?) รูปจะอยู่แค่ระหว่างที่เปิดหน้านี้")
            );
          }}
        />
      ) : null}
    </Layout>
  );
}

// --- Step 3: ID details ----------------------------------------------------------------

function Section({
  title,
  hint,
  defaultOpen,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="card group p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="font-semibold text-ink">{title}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-ink-muted">
          <span className="truncate">{hint}</span>
          <span aria-hidden className="transition group-open:rotate-180">
            ▾
          </span>
        </span>
      </summary>
      <div className="mt-4 space-y-3">{children}</div>
    </details>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  numeric,
  maxLength = 60,
  list,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  numeric?: boolean;
  maxLength?: number;
  list?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-muted">{label}</span>
      <span className="relative block">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={numeric ? "numeric" : undefined}
          maxLength={maxLength}
          list={list}
          className={`input ${suffix ? "pr-14" : ""}`}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function DetailsStep({
  design,
  setDesign,
  skins,
  watermark,
}: {
  design: BannerDesign;
  setDesign: SetDesign;
  skins: BannerSkin[];
  watermark: BannerWatermark;
}) {
  const { info } = design;
  const set = (patch: Partial<BannerInfo>) => setDesign((d) => ({ ...d, info: { ...d.info, ...patch } }));

  return (
    <Layout preview={<BannerPreview design={design} skins={skins} watermark={watermark} preview />}>
      <p className="text-xs text-ink-muted">ข้ามช่องที่ไม่อยากแสดงได้ทุกช่อง ช่องที่ว่างจะไม่แสดงบนป้าย</p>

      <Section
        title="ข้อมูลไอดี"
        defaultOpen
        hint={`ฮีโร่ ${info.heroCount || "-"} · สกิน ${info.skinCount || skins.length}`}
      >
        <Field label="รหัสสินค้า" value={info.code} onChange={(v) => set({ code: v })} placeholder="เช่น SSK 01" maxLength={30} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="ฮีโร่" value={info.heroCount} onChange={(v) => set({ heroCount: v })} numeric suffix="ตัว" maxLength={6} />
          <Field
            label="สกิน"
            value={info.skinCount}
            onChange={(v) => set({ skinCount: v })}
            numeric
            suffix="สกิน"
            placeholder={String(skins.length)}
            maxLength={6}
          />
          <Field label="อัตราชนะ" value={info.winRate} onChange={(v) => set({ winRate: v })} numeric suffix="%" placeholder="50.8" maxLength={6} />
          <Field label="จำนวนเล่น" value={info.matches} onChange={(v) => set({ matches: v })} numeric suffix="ตา" placeholder="5000" maxLength={8} />
        </div>
        <p className="text-xs text-ink-muted">ช่องสกินเว้นว่างไว้ = ใช้จำนวนสกินที่เลือก ({skins.length})</p>
      </Section>

      <Section title="ราคา" hint={info.price ? `${info.price} บาท` : "ยังไม่ใส่"}>
        <Field label="ราคา" value={info.price} onChange={(v) => set({ price: v })} numeric suffix="บาท" placeholder="5000" maxLength={12} />
        <Check checked={info.priceOnly} onChange={(v) => set({ priceOnly: v })}>
          แสดงเฉพาะตัวเลข (ไม่มีคำว่า ราคา / บาท)
        </Check>
        <Field
          label="รายละเอียดการผ่อน"
          value={info.installment}
          onChange={(v) => set({ installment: v })}
          placeholder="เช่น ดาวน์ 1,000 บาท"
          maxLength={50}
        />
        <Field
          label="รายละเอียดเพิ่มเติม"
          value={info.detail}
          onChange={(v) => set({ detail: v })}
          placeholder="เช่น ผูก Facebook เปลี่ยนเมลได้"
          maxLength={80}
        />
      </Section>

      <Section title="แรงค์และไอเทม" hint={info.rank || "ยังไม่ใส่"}>
        <datalist id="rank-options">
          {RANK_TIERS.map((rank) => (
            <option key={rank} value={rank} />
          ))}
        </datalist>
        <div className="grid grid-cols-2 gap-3">
          <Field label="แรงค์" value={info.rank} onChange={(v) => set({ rank: v })} placeholder="เซียน" list="rank-options" maxLength={30} />
          <Field label="VIP" value={info.vip} onChange={(v) => set({ vip: v })} placeholder="10" maxLength={10} />
          <Field label="บัตรเปลี่ยนชื่อ" value={info.nameCards} onChange={(v) => set({ nameCards: v })} numeric suffix="ใบ" maxLength={4} />
          <Field label="คูปอง" value={info.coupons} onChange={(v) => set({ coupons: v })} numeric suffix="ใบ" maxLength={4} />
        </div>
        <Field label="ไอเทมอื่น ๆ" value={info.extraItem} onChange={(v) => set({ extraItem: v })} placeholder="เช่น Championship" maxLength={40} />
      </Section>

      <Section title="ช่องทางติดต่อ" hint={info.contact || "ยังไม่ใส่"}>
        <Field label="ติดต่อ" value={info.contact} onChange={(v) => set({ contact: v })} placeholder="FB: ชื่อเพจ / Line: @id" maxLength={80} />
        <Field label="หมายเหตุท้ายป้าย" value={info.note} onChange={(v) => set({ note: v })} maxLength={100} />
      </Section>

      <Section title="การจัดวางสกิน" hint={design.skinsPerRow ? `${design.skinsPerRow} ต่อแถว` : "อัตโนมัติ"}>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">สกินต่อแถว</span>
          <select
            value={design.skinsPerRow}
            onChange={(e) => setDesign((d) => ({ ...d, skinsPerRow: Number(e.target.value) }))}
            className="input"
          >
            <option value={0}>อัตโนมัติ</option>
            {[3, 4, 5, 6, 7, 8, 9, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n} สกิน
              </option>
            ))}
          </select>
        </label>
        <Check checked={design.showNames} onChange={(v) => setDesign((d) => ({ ...d, showNames: v }))}>
          เขียนชื่อสกินทับบนภาพ (ปิดไว้ถ้ารูปมีชื่อติดอยู่แล้ว)
        </Check>
      </Section>
    </Layout>
  );
}

// --- Step 4: payment ------------------------------------------------------------------

export function PayStep({
  design,
  skins,
  watermark,
  wallet,
}: {
  design: BannerDesign;
  skins: BannerSkin[];
  watermark: BannerWatermark;
  wallet: SorterWallet;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noWatermark, setNoWatermark] = useState(false);
  const [balance, setBalance] = useState(wallet.balanceCents);
  const [paidKeys, setPaidKeys] = useState<string[]>([]);

  // A banner that was already paid for can be downloaded/shared again for
  // free, as long as nothing on it changed.
  const bannerKey = useMemo(
    () =>
      JSON.stringify({
        ids: skins.map((s) => s.id),
        design: { ...design, background: design.background ? design.background.length : null },
        noWatermark,
      }),
    [skins, design, noWatermark]
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
  const onPlan = Boolean(wallet.planUntil);
  const alreadyPaid = paidKeys.includes(bannerKey);
  const isPaid = isAdmin || onPlan || alreadyPaid;
  const costCents = skins.length * wallet.skinPriceCents + (noWatermark ? wallet.noWatermarkCents : 0);
  const canAfford = balance >= costCents;
  const shownWatermark = noWatermark ? null : watermark;

  const fontFamily = () => getComputedStyle(document.body).fontFamily || "sans-serif";

  // Charges the wallet once per distinct banner, then renders a clean copy.
  const paidBlob = useCallback(async (): Promise<Blob | null> => {
    setError(null);
    setNotice(null);
    // Plan members still go through the server: it re-checks the plan is
    // active and logs the (free) download.
    if (!isAdmin && !alreadyPaid) {
      const result = await chargeDownloadAction(
        skins.map((s) => s.id),
        noWatermark,
        onPlan
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
    await renderBanner(out, { design, skins, fontFamily: fontFamily(), watermark: shownWatermark, preview: false });
    return new Promise((resolve) => {
      try {
        out.toBlob((blob) => resolve(blob), "image/png");
      } catch {
        // A cross-origin image without CORS headers taints the canvas.
        resolve(null);
      }
    });
  }, [isAdmin, alreadyPaid, skins, noWatermark, onPlan, bannerKey, paidKeys, design, shownWatermark]);

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
          await navigator.share({ files: [file], title: design.info.code || "ป้ายสกิน RoV" });
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

  return (
    <Layout preview={<BannerPreview design={design} skins={skins} watermark={shownWatermark} preview={!isPaid} />}>
      {wallet.state === "guest" ? (
        <GuestPanel wallet={wallet} costCents={costCents} />
      ) : (
        <div className="card space-y-4 p-4">
          <h2 className="font-semibold text-ink">สรุปคำสั่งซื้อ</h2>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">
                สกิน {skins.length} × {coins(wallet.skinPriceCents)}
              </span>
              <span className="text-ink">{coins(skins.length * wallet.skinPriceCents)}</span>
            </div>
            {noWatermark ? (
              <div className="flex justify-between">
                <span className="text-ink-muted">ไม่มีลายน้ำ OSCAR</span>
                <span className="text-ink">{coins(wallet.noWatermarkCents)}</span>
              </div>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={noWatermark} onChange={(e) => setNoWatermark(e.target.checked)} />
            ไม่มีลายน้ำ OSCAR {onPlan ? "(ฟรี รายเดือน)" : `(+${coins(wallet.noWatermarkCents)} คอยน์)`}
          </label>

          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-ink-muted">รวมทั้งหมด</span>
            <span className="text-2xl font-bold text-gold">
              {isAdmin ? "ฟรี (แอดมิน)" : onPlan ? "ฟรี (รายเดือน)" : isPaid ? "จ่ายแล้ว" : `${coins(costCents)} คอยน์`}
            </span>
          </div>

          {onPlan ? (
            <p className="text-xs text-emerald-300">
              รายเดือนใช้ได้ถึง {new Date(wallet.planUntil!).toLocaleDateString("th-TH", { dateStyle: "medium" })} · ดาวน์โหลดไม่จำกัด
            </p>
          ) : null}
          {!isAdmin && !onPlan ? (
            <p className="text-xs text-ink-muted">
              คอยน์คงเหลือ <span className="font-semibold text-ink">{coins(balance)}</span> ·{" "}
              <a href="/account" className="text-gold hover:underline">
                เติมคอยน์
              </a>
            </p>
          ) : null}

          {isPaid || canAfford ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={download} disabled={busy || skins.length === 0} className="btn-primary">
                {busy ? "กำลังเตรียม..." : isPaid ? "ดาวน์โหลด" : `ชำระและดาวน์โหลด · ${coins(costCents)}`}
              </button>
              <button type="button" onClick={share} disabled={busy || skins.length === 0} className="btn-secondary">
                แชร์
              </button>
            </div>
          ) : (
            <a href="/account" className="btn-primary block">
              คอยน์ไม่พอ — เติมคอยน์
            </a>
          )}

          {!isPaid && !isAdmin ? (
            <p className="text-center text-xs text-ink-muted">
              จ่ายครั้งเดียวต่อป้าย ดาวน์โหลดซ้ำป้ายเดิมไม่เสียเพิ่ม
              {wallet.planPrice > 0 ? (
                <>
                  {" "}
                  · ทำบ่อย?{" "}
                  <a href="/account" className="text-gold hover:underline">
                    รายเดือน {wallet.planPrice} คอยน์ ไม่จำกัด
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          {skins.length === 0 ? <p className="text-xs text-rose-300">ยังไม่ได้เลือกสกิน — กลับไปขั้นที่ 1</p> : null}
        </div>
      )}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {!isPaid ? (
        <p className="text-center text-xs text-ink-muted">ภาพตัวอย่าง — ลายน้ำ “ตัวอย่าง” จะหายเมื่อดาวน์โหลด</p>
      ) : null}
    </Layout>
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
