"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { isDemoMode, onDemoModeChange } from "@/lib/api";

export function DemoBanner() {
  const [demo, setDemo] = useState(false);
  const [ready, setReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setDemo(isDemoMode);
    // Give the API 4 seconds to respond before surfacing the banner.
    // This prevents a jarring flash during Cloud Run cold starts.
    timerRef.current = setTimeout(() => setReady(true), 4000);
    const unsub = onDemoModeChange(setDemo);
    return () => {
      clearTimeout(timerRef.current);
      unsub();
    };
  }, []);

  if (!demo || !ready) return null;
  return (
    <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-amber/20 bg-amber/5 px-4 py-3 text-sm text-amber">
      <AlertTriangle className="h-4 w-4 shrink-0 opacity-70" />
      <span className="text-amber/80">
        Showing representative{" "}
        <strong className="text-amber font-semibold">demo data</strong>
        {" "}— connect the live API to access all 4,812 hospitals.
      </span>
    </div>
  );
}
