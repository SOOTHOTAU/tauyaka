// src/utils/promotions.js

export function isActiveBoost(item, now = Date.now()) {
  return !!item?.boostMarketplaceUntil && new Date(item.boostMarketplaceUntil).getTime() > now;
}
export function isActiveSponsor(item, now = Date.now()) {
  return !!item?.sponsorHomeUntil && new Date(item.sponsorHomeUntil).getTime() > now;
}

export function remainingTime(until, now = Date.now()) {
  if (!until) return "";
  const ms = new Date(until).getTime() - now;
  if (ms <= 0) return "0h";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function extendPromotion(item, field, extraDays = 3, baseNow = Date.now()) {
  const curr = item[field] ? new Date(item[field]).getTime() : 0;
  const start = Math.max(curr, baseNow);
  const until = new Date(start + extraDays * 86400000).toISOString();
  return { ...item, [field]: until };
}

export function startPromotion(item, field, days = 3, baseNow = Date.now()) {
  const until = new Date(baseNow + days * 86400000).toISOString();
  return { ...item, [field]: until };
}

export function cleanupExpiredPromotions(list, now = Date.now()) {
  let changed = false;
  const listings = list.map(it => {
    const b = it.boostMarketplaceUntil && new Date(it.boostMarketplaceUntil).getTime() > now ? it.boostMarketplaceUntil : null;
    const s = it.sponsorHomeUntil && new Date(it.sponsorHomeUntil).getTime() > now ? it.sponsorHomeUntil : null;
    if (b !== it.boostMarketplaceUntil || s !== it.sponsorHomeUntil) changed = true;
    return { ...it, boostMarketplaceUntil: b, sponsorHomeUntil: s };
  });
  return { listings, changed };
}
