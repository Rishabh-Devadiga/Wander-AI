/**
 * Location-aware restaurant matching (pure helpers, no I/O).
 *
 * Every helper works only with data already returned by providers or already
 * present in the itinerary. Nothing here invents venues: ranking reorders
 * real SerpApi candidates for one meal anchor point.
 */

export interface MealAnchor {
  text: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface RankedRestaurant {
  restaurant: any;
  distanceKm: number | null;
}

// Venues beyond this distance from the meal anchor are treated as
// geographically unsuitable, triggering a targeted anchor search instead.
export const RESTAURANT_ANCHOR_RADIUS_KM = 15;

export function haversineKm(latA: any, lngA: any, latB: any, lngB: any): number | null {
  const toNum = (v: any): number | null => {
    if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const aLat = toNum(latA);
  const aLng = toNum(lngA);
  const bLat = toNum(latB);
  const bLng = toNum(lngB);
  if (aLat === null || aLng === null || bLat === null || bLng === null) return null;
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(bLat - aLat) / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function mealTypeForItem(item: any): 'breakfast' | 'lunch' | 'dinner' | null {
  const text = `${item?.title || ''} ${item?.description || ''} ${item?.start_time || ''}`.toLowerCase();
  const hour = (() => {
    const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/.exec(String(item?.start_time || '').toLowerCase());
    if (!m) return null;
    let h = parseInt(m[1], 10) % 12;
    if (m[3] === 'pm') h += 12;
    return h;
  })();
  if (/breakfast|brunch/.test(text) || (hour !== null && hour < 11)) return 'breakfast';
  if (/lunch/.test(text) || (hour !== null && hour >= 11 && hour < 16)) return 'lunch';
  if (/dinner|supper/.test(text) || (hour !== null && hour >= 16)) return 'dinner';
  return null;
}

function coordsOf(item: any): { latitude: number; longitude: number } | null {
  const live = item?.meta_data?.live_place;
  const toNum = (v: any): number | null => {
    if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const latitude = toNum(live?.latitude);
  const longitude = toNum(live?.longitude);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

function anchorTextOf(item: any): string | null {
  const text = `${item?.title || ''}`.trim();
  if (text) return text;
  const loc = `${item?.location || ''}`.trim();
  return loc || null;
}

export function anchorForMeal(itinerary: any[], mealItem: any): MealAnchor {
  // Nearest scheduled neighbours in itinerary order (previous first, then next),
  // skipping disabled items and other meals.
  const ordered = (itinerary || []).filter((i: any) => !i?.is_disabled && i?.item_type !== 'meal');
  const mealDay = Number(mealItem?.day_number ?? 0);
  const mealOrder = Number(mealItem?.order_index ?? 0);
  let prev: any = null;
  let next: any = null;
  for (const item of ordered) {
    const day = Number(item?.day_number ?? 0);
    const order = Number(item?.order_index ?? 0);
    const before = day < mealDay || (day === mealDay && order < mealOrder);
    if (before) {
      prev = item;
    } else if (!next) {
      next = item;
    }
  }
  const anchorItem = prev || next;
  const coords = (prev && coordsOf(prev)) || (next && coordsOf(next));
  const text = (anchorItem && anchorTextOf(anchorItem)) || null;
  return { text, latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null };
}

export function rankRestaurantsForAnchor(
  pool: any[],
  anchor: { latitude: number | null; longitude: number | null },
  cuisine?: string | null,
): RankedRestaurant[] {
  const wanted = (cuisine || '').trim().toLowerCase();
  const scored = (pool || [])
    .filter((r) => r && typeof r.name === 'string' && r.name.trim())
    .map((r) => {
      const distanceKm =
        anchor.latitude !== null && anchor.longitude !== null
          ? haversineKm(anchor.latitude, anchor.longitude, r.latitude, r.longitude)
          : null;
      const closed =
        typeof r.hours === 'string' && r.hours.toLowerCase().includes('closed');
      let bonus = 0;
      if (wanted) {
        const haystack = `${r.name || ''} ${r.address || ''} ${(r.types || []).join(' ')}`.toLowerCase();
        if (haystack.includes(wanted)) bonus = 0.5;
      }
      return { restaurant: r, distanceKm, closed, bonus };
    });
  scored.sort((a, b) => {
    if (a.closed !== b.closed) return a.closed ? 1 : -1;
    const aD = a.distanceKm === null ? Infinity : a.distanceKm;
    const bD = b.distanceKm === null ? Infinity : b.distanceKm;
    if (aD !== bD) return aD - bD;
    const aR = (Number(a.restaurant.rating) || 0) + a.bonus;
    const bR = (Number(b.restaurant.rating) || 0) + b.bonus;
    if (aR !== bR) return bR - aR;
    const aRev = Number(a.restaurant.reviews_count) || 0;
    const bRev = Number(b.restaurant.reviews_count) || 0;
    if (aRev !== bRev) return bRev - aRev;
    return String(a.restaurant.name).localeCompare(String(b.restaurant.name));
  });
  return scored.map(({ restaurant, distanceKm }) => ({ restaurant, distanceKm }));
}
