"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when `active` stays true longer than `deadlineMs`.
 * UI safety net if store-level timeouts fail to clear loading state.
 */
export function useLoadingDeadline(active: boolean, deadlineMs: number) {
  const [overdue, setOverdue] = useState(false);

  useEffect(() => {
    if (!active) {
      setOverdue(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setOverdue(true);
    }, deadlineMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [active, deadlineMs]);

  return overdue;
}
