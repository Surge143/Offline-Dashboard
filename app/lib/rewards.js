// Mirrors the redemption/earning rules the backend applies (see the Surge
// Coins global in the backend: pointsToAed / pointsEarn). These only drive the
// on-screen PREVIEW — the backend is the source of truth for what is actually
// deducted or earned. Keep in sync with the Surge Coins configuration.
export const BEANS_PER_AED = 10;
export const BEANS_EARN_PERCENT = 10;

const round2 = (n) => Math.round(n * 100) / 100;

// The backend redeems min(balance, orderValue * rate) — never more beans than
// the order is worth, and never more than the customer has.
export function previewBeansRedeemed(balance, orderValue) {
  const bal = Math.max(0, Number(balance) || 0);
  const order = Math.max(0, Number(orderValue) || 0);
  return round2(Math.min(bal, order * BEANS_PER_AED));
}

export function beansToAed(beans) {
  return round2((Number(beans) || 0) / BEANS_PER_AED);
}

// Store orders earn beans on the part of the order that was NOT paid with beans.
export function previewBeansEarned(orderValue, beansRedeemed) {
  const order = Math.max(0, Number(orderValue) || 0);
  const remaining = Math.max(0, order - beansToAed(beansRedeemed));
  return Math.floor((remaining * BEANS_EARN_PERCENT) / 100);
}
