// src/utils/promoHelpers.js

// --- Time helpers ---
const DAY = 24 * 60 * 60 * 1000;

/** Is Marketplace Boost currently active for item? */
export function isActiveBoost(item, now = Date.now()) {
  const until = item?.boostMarketplaceUntil ?? 0;
  return typeof until === "number" && until > now;
}

/** Is Home Sponsor currently active for item? */
export function isActiveSponsor(item, now = Date.now()) {
  const until = item?.sponsorHomeUntil ?? 0;
  return typeof until === "number" && until > now;
}

/** Human label like "3d 4h left" given a future timestamp */
export function remainingLabel(untilTs, now = Date.now()) {
  if (!untilTs || untilTs <= now) return "expired";
  const ms = untilTs - now;
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / (60 * 60 * 1000));
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (h > 0) return `${h}h ${m}m left`;
  const s = Math.max(1, Math.floor((ms % (60 * 1000)) / 1000));
  return `${m}m ${s}s left`;
}

/**
 * Extend or clear a promotion in an items array immutably.
 * key = "boostMarketplaceUntil" | "sponsorHomeUntil"
 * opts = { action: "extend" | "clear", days?: number }
 */
export function extendOrClear(items, listingId, key, opts) {
  const days = Number(opts?.days ?? 0);
  const action = opts?.action || "extend";
  const addMs = days > 0 ? days * DAY : 0;
  const now = Date.now();

  return (items || []).map((it) => {
    if (it.id !== listingId) return it;
    const next = { ...it };
    const current = Number(next[key] || 0);

    if (action === "clear") {
      next[key] = null;
      return next;
    }

    // action === "extend"
    if (current > now) {
      next[key] = current + addMs; // extend from current expiry (prevents double-charging)
    } else {
      next[key] = now + addMs; // start fresh
    }
    return next;
  });
}

/**
 * Cleanup pass: if any boost/sponsor ended in the past, set to null.
 * Returns { items, changed }
 */
export function cleanupPromotions(items) {
  const now = Date.now();
  let changed = false;
  const out = (items || []).map((it) => {
    let mut = it;
    if (it?.boostMarketplaceUntil && it.boostMarketplaceUntil <= now) {
      mut = { ...mut, boostMarketplaceUntil: null };
      changed = true;
    }
    if (it?.sponsorHomeUntil && it.sponsorHomeUntil <= now) {
      mut = { ...mut, sponsorHomeUntil: null };
      changed = true;
    }
    return mut;
  });
  return { items: out, changed };
}
