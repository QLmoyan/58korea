"use client";

import { useCallback, useRef, useState } from "react";
import { getRegionFromCoordinates } from "@/lib/feed/geo-region";
import type { SelectedRegion } from "@/lib/feed/regions";

export type NearbyLocationStatus = "idle" | "locating" | "success" | "failed";

interface UseNearbyLocationOptions {
  onRegionResolved: (region: SelectedRegion) => void;
}

export function useNearbyLocation({ onRegionResolved }: UseNearbyLocationOptions) {
  const [status, setStatus] = useState<NearbyLocationStatus>("idle");
  const inFlightRef = useRef(false);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    if (!navigator.geolocation) {
      setStatus("failed");
      return;
    }

    inFlightRef.current = true;
    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        inFlightRef.current = false;
        const region = getRegionFromCoordinates(
          position.coords.latitude,
          position.coords.longitude,
        );
        onRegionResolved(region);
        setStatus("success");
      },
      () => {
        inFlightRef.current = false;
        setStatus("failed");
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 300_000,
      },
    );
  }, [onRegionResolved]);

  const retryLocation = useCallback(() => {
    setStatus("idle");
    requestLocation();
  }, [requestLocation]);

  return {
    status,
    requestLocation,
    retryLocation,
  };
}
