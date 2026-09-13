import React from 'react';
import { TourFlowApi } from '../services/api';

/**
 * Live destination photos from the provider API (SerpApi via backend).
 *
 * Nothing here is hardcoded and nothing comes from the database: every URL
 * is returned by `GET /api/places/image` at runtime. Results are cached in
 * sessionStorage per destination so a destination costs at most 4 provider
 * calls per browser session. Null entries mean "still loading or provider
 * has nothing" -- callers keep showing their previous image in that case.
 */

export interface LiveDestinationPhotos {
  hero: string | null;
  highlights: [string | null, string | null, string | null];
}

const EMPTY: LiveDestinationPhotos = { hero: null, highlights: [null, null, null] };

export function useLiveDestinationPhotos(destName: string | null | undefined): LiveDestinationPhotos {
  const dest = (destName || '').trim();
  const [photos, setPhotos] = React.useState<LiveDestinationPhotos>(EMPTY);

  React.useEffect(() => {
    if (!dest) {
      setPhotos(EMPTY);
      return;
    }
    const cacheKey = `tourflow-live-photos:${dest.toLowerCase()}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.hero || (parsed?.highlights || []).some(Boolean)) {
          setPhotos({
            hero: parsed.hero || null,
            highlights: [
              parsed.highlights?.[0] || null,
              parsed.highlights?.[1] || null,
              parsed.highlights?.[2] || null,
            ],
          });
          return;
        }
      }
    } catch {
      // ignore corrupt cache entries and fetch live
    }
    setPhotos(EMPTY);
    let cancelled = false;
    const queries = [
      { location: `${dest} tourism` },
      { location: 'heritage monument', destination: dest },
      { location: 'ghats riverside', destination: dest },
      { location: 'palace', destination: dest },
    ];
    Promise.allSettled(
      queries.map((q) => TourFlowApi.getPlaceImages({ ...q, count: 1 })),
    ).then((settled) => {
      if (cancelled) return;
      const urls = settled.map((r) =>
        r.status === 'fulfilled' && r.value.images?.length ? r.value.images[0] : null,
      );
      const next: LiveDestinationPhotos = {
        hero: urls[0],
        highlights: [urls[1], urls[2], urls[3]],
      };
      setPhotos(next);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        // ignore storage failures (private mode, quota)
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dest]);

  return photos;
}
