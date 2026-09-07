"use client";

import { motion } from "framer-motion";

/** Stylised, geometric heart outline (viewBox 0 0 300 300). */
const HEART_PATH =
  "M150,238 C150,238 44,168 44,100 C44,60 72,38 102,38 C126,38 145,56 150,78 C155,56 174,38 198,38 C228,38 256,60 256,100 C256,168 150,238 150,238 Z";

interface Node {
  x: number;
  y: number;
  r: number;
}

// Hexagonal nodes placed around and inside the heart silhouette.
const NODES: Node[] = [
  { x: 150, y: 82, r: 9 },
  { x: 100, y: 52, r: 11 },
  { x: 200, y: 52, r: 11 },
  { x: 54, y: 100, r: 8 },
  { x: 246, y: 100, r: 8 },
  { x: 150, y: 140, r: 13 },
  { x: 98, y: 152, r: 8 },
  { x: 202, y: 152, r: 8 },
  { x: 150, y: 202, r: 10 },
  { x: 150, y: 236, r: 7 },
];

// Curved internal pathways connecting the core node to the outer nodes.
const CONNECTORS = [
  "M150,140 Q120,105 100,52",
  "M150,140 Q180,105 200,52",
  "M150,140 Q95,120 54,100",
  "M150,140 Q205,120 246,100",
  "M150,140 Q150,110 150,82",
  "M150,140 Q120,150 98,152",
  "M150,140 Q180,150 202,152",
  "M150,140 Q150,175 150,202",
  "M150,202 L150,236",
];

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 90);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

export function GeometricHeart({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 300"
      className={className}
      role="img"
      aria-label="Abstract geometric heart of connected data nodes"
      fill="none"
    >
      <defs>
        <filter id="rg-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="rg-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#66E3FF" />
          <stop offset="100%" stopColor="#00A3CC" />
        </radialGradient>
      </defs>

      {/* Static faint outline */}
      <path d={HEART_PATH} stroke="#1A2440" strokeWidth={2} />

      {/* Internal connective pathways */}
      {CONNECTORS.map((d, i) => (
        <path key={i} d={d} stroke="#263252" strokeWidth={1.25} strokeLinecap="round" />
      ))}

      {/* Flowing light along the connectors */}
      {CONNECTORS.map((d, i) => (
        <motion.path
          key={`flow-${i}`}
          d={d}
          stroke="#00D4FF"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray="10 90"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear", delay: i * 0.18 }}
          style={{ opacity: 0.9 }}
        />
      ))}

      {/* Flowing light travelling around the heart outline (two travellers) */}
      <motion.path
        d={HEART_PATH}
        stroke="#00D4FF"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeDasharray="14 286"
        filter="url(#rg-glow)"
        initial={{ strokeDashoffset: 300 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      {/* Hexagonal nodes */}
      {NODES.map((n, i) => (
        <g key={`node-${i}`}>
          <motion.polygon
            points={hexPoints(n.x, n.y, n.r)}
            fill="#0A0F1E"
            stroke="#00D4FF"
            strokeWidth={1.5}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
          <motion.circle
            cx={n.x}
            cy={n.y}
            r={n.r * 0.32}
            fill="url(#rg-core)"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.25, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        </g>
      ))}
    </svg>
  );
}
