"use client";

import { useEffect, useRef, useState } from "react";
import { getHealth, isDemoMode, onDemoModeChange } from "@/lib/api";

/**
 * Animate a number from 0 to `target` over `duration` ms.
 * When `startOnView` is true the animation only begins once the returned ref
 * scrolls into view. Returns { ref, value }.
 */
export function useCountUp(target: number, duration = 1200, startOnView = true) {
  const ref = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState(0);
  const [active, setActive] = useState(!startOnView);

  useEffect(() => {
    if (!startOnView || active) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [startOnView, active]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let start: number | null = null;
    const from = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min(1, (ts - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
      else setValue(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);

  return { ref, value };
}

/** Returns a debounced copy of `value` that updates `delay` ms after the last change. */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export interface APIHealthState {
  isLive: boolean;
  modelsLoaded: boolean;
  hospitalCount: number;
  demo: boolean;
  connecting: boolean;
}

/** Polls /health every 30s. Starts optimistic (Live) until first check resolves. */
export function useAPIHealth(): APIHealthState {
  const [state, setState] = useState<APIHealthState>({
    isLive: true,        // optimistic — avoids "Offline" flash on load
    modelsLoaded: true,
    hospitalCount: 3244,
    demo: false,
    connecting: true,    // resolves after first health check completes
  });

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const health = await getHealth();
        if (!mounted) return;
        setState({
          isLive: !isDemoMode,
          modelsLoaded: health.models_loaded,
          hospitalCount: health.hospitals_in_database,
          demo: isDemoMode,
          connecting: false,
        });
      } catch {
        if (mounted) setState((s) => ({ ...s, isLive: false, demo: true, connecting: false }));
      }
    };
    poll();
    const id = setInterval(poll, 30000);
    const unsub = onDemoModeChange((demo) => {
      if (mounted) setState((s) => ({ ...s, demo, isLive: !demo, connecting: false }));
    });
    return () => {
      mounted = false;
      clearInterval(id);
      unsub();
    };
  }, []);

  return state;
}
