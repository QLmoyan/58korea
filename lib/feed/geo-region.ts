import type { SelectedRegion } from "@/lib/feed/regions";

type RegionBounds = {
  region: SelectedRegion;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/** Rough bounding boxes; checked in priority order (smaller regions before 京畿). */
const REGION_BOUNDS: readonly RegionBounds[] = [
  { region: "首尔", minLat: 37.42, maxLat: 37.7, minLng: 126.76, maxLng: 127.2 },
  { region: "仁川", minLat: 37.3, maxLat: 37.65, minLng: 126.35, maxLng: 126.85 },
  { region: "京畿", minLat: 36.85, maxLat: 38.3, minLng: 126.45, maxLng: 127.85 },
  { region: "釜山", minLat: 35.0, maxLat: 35.35, minLng: 128.8, maxLng: 129.3 },
  { region: "大邱", minLat: 35.75, maxLat: 36.0, minLng: 128.45, maxLng: 128.75 },
  { region: "大田", minLat: 36.2, maxLat: 36.45, minLng: 127.25, maxLng: 127.55 },
  { region: "光州", minLat: 35.05, maxLat: 35.3, minLng: 126.75, maxLng: 127.05 },
  { region: "济州", minLat: 33.1, maxLat: 33.6, minLng: 126.1, maxLng: 126.95 },
];

function isWithinBounds(
  lat: number,
  lng: number,
  bounds: RegionBounds,
): boolean {
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

export function getRegionFromCoordinates(lat: number, lng: number): SelectedRegion {
  for (const bounds of REGION_BOUNDS) {
    if (isWithinBounds(lat, lng, bounds)) {
      return bounds.region;
    }
  }

  return "其他";
}
