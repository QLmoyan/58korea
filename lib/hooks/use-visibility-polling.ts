"use client";

import { useEffect, useRef } from "react";

export function useVisibilityPolling(
  intervalMs: number,
  enabled: boolean,
  onPoll: () => void,
) {
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let timer: number | undefined;

    function tick() {
      if (document.hidden) {
        return;
      }

      onPollRef.current();
    }

    function start() {
      tick();
      timer = window.setInterval(tick, intervalMs);
    }

    function stop() {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stop();
        return;
      }

      start();
    }

    if (!document.hidden) {
      start();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
