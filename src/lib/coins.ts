// Coin wallet helpers. Balances and prices are stored in hundredths of a
// coin ("cents") so 0.3 coin per skin stays an exact integer. 1 coin = 1 THB.

export const MAX_TOPUP = 5000;
export const TOPUP_PRESETS = [20, 50, 100, 300] as const;

export function formatCoins(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function downloadCostCents(
  skinCount: number,
  noWatermark: boolean,
  prices: { skinPriceCents: number; noWatermarkCents: number }
): number {
  return skinCount * prices.skinPriceCents + (noWatermark ? prices.noWatermarkCents : 0);
}
