"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";

export const tooltipStyle = {
  background: "#111111",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  fontSize: 12,
  color: "#e5e5e5",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
} as const;

export const tooltipItemStyle = { color: "#e5e5e5" } as const;
export const tooltipLabelStyle = { color: "#737373", marginBottom: 4 } as const;

export function ChartReveal({
  height,
  children,
}: {
  height: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  return (
    <div ref={ref} style={{ height }}>
      {inView ? children : null}
    </div>
  );
}
