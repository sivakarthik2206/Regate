"use client";

import { useIsFetching } from "@tanstack/react-query";

export function GlobalLoadingBar(): JSX.Element | null {
  const isFetching = useIsFetching();

  if (isFetching <= 0) {
    return null;
  }

  return <div className="fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden bg-white/5"><div className="h-full w-full origin-left animate-pulse bg-cyan shadow-[0_0_18px_rgba(0,212,255,0.9)]" /></div>;
}
