"use client";

/* ═══════════════════════════════════════════════════════════════════
   Scene3D — the persistent WebGL world behind the landing page.

   A single scroll value (0 → 1 over the whole document) drives a camera
   that flies forward through three acts laid out along the −Z axis:

     ACT I   · THE CORRIDOR    30 glowing "day" rings, funnelling inward,
                               shifting white → amber → red toward day 0.
     ACT II  · THE GALAXY      ~4,800 hospitals as a rotating point cloud;
                               penalized nodes burn red.
     ACT III · THE SINGULARITY the penalty itself — a pulsing red core the
                               journey inevitably converges on.

   Everything is additive-blended neon on near-black, bloomed, and fogged
   for depth. The DOM narrative sits on top; this only sets the mood.
   ═══════════════════════════════════════════════════════════════════ */

import { useRef, useMemo, useEffect, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

/* ── Palette ──────────────────────────────────────────────────────── */
const C_WHITE = new THREE.Color("#eafff0");
const C_ACCENT = new THREE.Color("#B8FF3D");
const C_AMBER = new THREE.Color("#F7A800");
const C_RED = new THREE.Color("#FF4D6D");
const C_SAFE = new THREE.Color("#00C896");
const BG = "#030303";

/* ── Journey layout along −Z ──────────────────────────────────────── */
const RING_COUNT = 30;
const RING_GAP = 4.2; // rings at z = 0 … −(29·4.2) ≈ −122
const GALAXY_Z = -158;
const SINGULARITY_Z = -212;
const CAM_START = 13;
const CAM_END = -200; // camera never quite reaches the singularity

/* ═══════════════════════════════════════════════════════════════════
   Shared scroll signal — a plain ref updated on scroll, lerped in-frame.
   Kept outside React state so it never triggers re-renders.
   ═══════════════════════════════════════════════════════════════════ */
function useScrollRef(): MutableRefObject<number> {
  const ref = useRef(0);
  useEffect(() => {
    const read = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      ref.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);
  return ref;
}

/* ── Soft round sprite for points ─────────────────────────────────── */
function makeCircleTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.65)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ═══════════════════════════════════════════════════════════════════
   Camera rig — flies the camera down the corridor and past the acts.
   ═══════════════════════════════════════════════════════════════════ */
function CameraRig({ scroll }: { scroll: MutableRefObject<number> }) {
  const { camera } = useThree();
  const p = useRef(0);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    // critically-damped follow so wheel jitter never shows
    const k = 1 - Math.pow(0.0018, dt);
    p.current += (scroll.current - p.current) * k;
    const s = p.current;

    const z = CAM_START + (CAM_END - CAM_START) * s;

    // sway eases out as we approach the singularity — motion "locks on"
    const calm = 1 - THREE.MathUtils.smoothstep(s, 0.72, 1);
    camera.position.set(
      Math.sin(s * Math.PI * 3.5) * 2.6 * calm,
      Math.cos(s * Math.PI * 2.5) * 1.9 * calm,
      z
    );

    // look ahead down the tunnel, but lock onto the singularity at the end
    const lockZ = THREE.MathUtils.lerp(z - 24, SINGULARITY_Z, THREE.MathUtils.smoothstep(s, 0.8, 1));
    target.set(0, 0, lockZ);
    camera.lookAt(target);
  });

  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   ACT I · The Corridor — 30 day-rings funnelling toward day 0.
   ═══════════════════════════════════════════════════════════════════ */
function Corridor({ scroll }: { scroll: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);

  const rings = useMemo(() => {
    const arr: { z: number; radius: number; color: THREE.Color; spin: number }[] = [];
    for (let i = 0; i < RING_COUNT; i++) {
      const t = i / (RING_COUNT - 1); // 0 = day 30 (far) … 1 = day 0
      const radius = 6.2 - t * 3.6; // funnel inward
      // white → amber → red as the deadline nears
      const color = C_WHITE.clone();
      if (t < 0.6) color.lerpColors(C_WHITE, C_AMBER, t / 0.6);
      else color.lerpColors(C_AMBER, C_RED, (t - 0.6) / 0.4);
      arr.push({ z: -i * RING_GAP, radius, color, spin: (i % 2 ? 1 : -1) * (0.15 + t * 0.4) });
    }
    return arr;
  }, []);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const time = state.clock.elapsedTime;
    const s = scroll.current;
    for (let i = 0; i < g.children.length; i++) {
      const ring = g.children[i] as THREE.Mesh;
      ring.rotation.z = time * rings[i].spin + i * 0.3;
      // breathing pulse that intensifies toward the deadline
      const t = i / (RING_COUNT - 1);
      const mat = ring.material as THREE.MeshBasicMaterial;
      const pulse = 0.55 + 0.45 * Math.sin(time * (1.5 + t * 3) + i);
      void s;
      mat.opacity = (0.6 + 0.4 * t) * (0.7 + 0.3 * pulse);
    }
  });

  return (
    <group ref={group}>
      {rings.map((r, i) => (
        <mesh key={i} position={[0, 0, r.z]}>
          <torusGeometry args={[r.radius, 0.14 + 0.08 * (i / RING_COUNT), 10, 120]} />
          <meshBasicMaterial
            color={r.color}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ACT II · The Galaxy — 4,800 hospitals; ~1 in 5 penalized (red).
   ═══════════════════════════════════════════════════════════════════ */
function Galaxy({ sprite }: { sprite: THREE.Texture }) {
  const points = useRef<THREE.Points>(null);
  const COUNT = 4800;

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // flattened spiral-galaxy disk
      const r = Math.pow(Math.random(), 0.7) * 30;
      const arm = Math.floor(Math.random() * 3) * ((Math.PI * 2) / 3);
      const ang = arm + r * 0.12 + (Math.random() - 0.5) * 0.9;
      const y = (Math.random() - 0.5) * (5 - r * 0.1);
      positions[i * 3] = Math.cos(ang) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = GALAXY_Z + Math.sin(ang) * r;

      const penalized = Math.random() < 0.21;
      const c = penalized
        ? C_RED
        : Math.random() < 0.15
        ? C_SAFE
        : C_WHITE;
      const dim = penalized ? 1 : 0.45 + Math.random() * 0.4;
      colors[i * 3] = c.r * dim;
      colors[i * 3 + 1] = c.g * dim;
      colors[i * 3 + 2] = c.b * dim;
    }
    return { positions, colors };
  }, []);

  useFrame((state, dt) => {
    if (points.current) points.current.rotation.y += dt * 0.045;
    // subtle twinkle via material size
    if (points.current) {
      const m = points.current.material as THREE.PointsMaterial;
      m.size = 0.32 + Math.sin(state.clock.elapsedTime * 1.2) * 0.03;
    }
  });

  return (
    <points ref={points} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.34}
        map={sprite}
        vertexColors
        transparent
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ACT III · The Singularity — the penalty. A pulsing red core.
   ═══════════════════════════════════════════════════════════════════ */
function Singularity() {
  const core = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Points>(null);

  const haloGeo = useMemo(() => {
    const N = 1400;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 4 + Math.pow(Math.random(), 2) * 9;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      // centred on the group origin so it orbits the core, not the world axis
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      pos[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r;
      pos[i * 3 + 2] = Math.cos(ph) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 2.4) * 0.12;
    if (core.current) {
      core.current.scale.setScalar(pulse);
      core.current.rotation.y += dt * 0.4;
      core.current.rotation.x += dt * 0.2;
    }
    if (shell.current) {
      shell.current.rotation.y -= dt * 0.25;
      shell.current.rotation.z += dt * 0.15;
      shell.current.scale.setScalar(1.6 + Math.sin(t * 1.6) * 0.08);
    }
    if (halo.current) halo.current.rotation.y += dt * 0.08;
  });

  return (
    <group position={[0, 0, SINGULARITY_Z]}>
      <mesh ref={core}>
        <icosahedronGeometry args={[3, 2]} />
        <meshBasicMaterial color={C_RED} toneMapped={false} />
      </mesh>
      <mesh ref={shell} scale={1.6}>
        <icosahedronGeometry args={[3, 1]} />
        <meshBasicMaterial
          color={C_RED}
          wireframe
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <points ref={halo} geometry={haloGeo}>
        <pointsMaterial
          color={C_RED}
          size={0.14}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Streaking dust — spans the whole corridor so there's always speed.
   ═══════════════════════════════════════════════════════════════════ */
function Dust({ sprite }: { sprite: THREE.Texture }) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 1600;
  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 3 + Math.random() * 22;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = 15 - Math.random() * 235;
    }
    return pos;
  }, []);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.17}
        map={sprite}
        color={C_ACCENT}
        transparent
        opacity={0.8}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   World — everything inside the Canvas.
   ═══════════════════════════════════════════════════════════════════ */
function World({ scroll, quality }: { scroll: MutableRefObject<number>; quality: "high" | "low" }) {
  const sprite = useMemo(() => makeCircleTexture(), []);
  useEffect(() => () => sprite.dispose(), [sprite]);

  return (
    <>
      <fog attach="fog" args={[BG, 18, 130]} />
      <color attach="background" args={[BG]} />

      <CameraRig scroll={scroll} />
      <Dust sprite={sprite} />
      <Corridor scroll={scroll} />
      <Galaxy sprite={sprite} />
      <Singularity />

      {quality === "high" && (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.08}
            luminanceSmoothing={0.3}
            mipmapBlur
            radius={0.8}
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new THREE.Vector2(0.0006, 0.0009)}
            radialModulation={false}
            modulationOffset={0}
          />
          <Vignette eskil={false} offset={0.25} darkness={0.85} />
        </EffectComposer>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Public component — the fixed full-screen canvas.
   ═══════════════════════════════════════════════════════════════════ */
export default function Scene3D() {
  const scroll = useScrollRef();
  const [mode, setMode] = useState<"pending" | "high" | "low" | "off">("pending");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.innerWidth < 640;
    if (reduce) setMode("off");
    else if (narrow) setMode("low");
    else setMode("high");
  }, []);

  if (mode === "off" || mode === "pending") {
    // Reduced-motion / SSR-safe fallback: a calm static field.
    return (
      <div
        aria-hidden
        className="fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(184,255,61,0.05), transparent 60%), radial-gradient(ellipse 50% 50% at 50% 90%, rgba(255,77,109,0.06), transparent 60%), #030303",
        }}
      />
    );
  }

  return (
    <div aria-hidden className="fixed inset-0 z-0">
      <Canvas
        gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
        dpr={mode === "low" ? [1, 1.25] : [1, 1.85]}
        camera={{ fov: 64, near: 0.1, far: 600, position: [0, 0, CAM_START] }}
      >
        <World scroll={scroll} quality={mode === "high" ? "high" : "low"} />
      </Canvas>
    </div>
  );
}
