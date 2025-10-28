// Simple sponsored picker + injector for the Home "All" feed.
// You can later add budgets, daily caps, and town targeting here.

export function pickSponsored(listings, { now = Date.now(), max = 3, seenIds = new Set(), town } = {}) {
  const active = listings.filter(
    (l) => l.sponsorHomeUntil && l.sponsorHomeUntil > now
  );
  // Optional: filter by town once targeting is added
  const pool = active.filter((l) => !seenIds.has(l.id));
  pool.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return pool.slice(0, max);
}

export function injectSponsoredIntoFeed(feed, sponsored, { slots = [2, 9, 16] } = {}) {
  const out = [...feed];
  let s = 0;
  for (const pos of slots) {
    if (s >= sponsored.length) break;
    const idx = Math.min(pos, out.length);
    out.splice(idx, 0, { __type: "sponsored", listing: sponsored[s++] });
  }
  return out;
}
