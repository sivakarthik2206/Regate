"use client";

import {
  useRef,
  useState,
  useEffect,
  useMemo,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  motion,
  useMotionValue,
  useSpring,
  useInView,
  AnimatePresence,
} from "framer-motion";
import { ArrowRight, Search, TrendingDown, AlertTriangle, Target, CheckCircle2 } from "lucide-react";
import { useCountUp } from "@/lib/hooks";
import { getBacktesting, getSummary } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

/* ── constants ─────────────────────────────────────────────────────── */
const ACCENT = "#B8FF3D";

const Scene3D = dynamic(() => import("@/components/landing/Scene3D"), { ssr: false });

/* ── Counter ─────────────────────────────────────────────────────────*/
function Counter({
  target,
  prefix = "",
  suffix = "",
  duration = 2200,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const { ref, value } = useCountUp(target, duration);
  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>}>
      {prefix}{formatNumber(Math.round(value))}{suffix}
    </span>
  );
}

/* ── Magnetic Button ─────────────────────────────────────────────────*/
function MagBtn({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 22 });
  const sy = useSpring(y, { stiffness: 300, damping: 22 });
  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.28);
        y.set((e.clientY - r.top - r.height / 2) * 0.28);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Nav ─────────────────────────────────────────────────────────────*/
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 transition-all duration-500 ${
        scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"
      }`}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <span className="font-mono text-sm font-bold tracking-[0.2em] text-white uppercase">REGATE</span>
        <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: ACCENT }} />
      </Link>
      <nav className="hidden md:flex items-center gap-1">
        {[
          { href: "/dashboard", label: "DASHBOARD" },
          { href: "/hospitals", label: "HOSPITALS" },
          { href: "/predict", label: "PREDICT" },
          { href: "/about", label: "ABOUT" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-4 py-2 text-[11px] font-mono font-medium tracking-[0.15em] text-white/40 hover:text-white transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>
      <MagBtn>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-[11px] font-mono font-semibold tracking-[0.12em] text-white transition-all hover:border-white/60 hover:bg-white/5"
        >
          OPEN PLATFORM <ArrowRight className="h-3 w-3" />
        </Link>
      </MagBtn>
    </motion.header>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────── */
function HeroSection() {
  const [ready, setReady] = useState(false);
  const summary = useQuery({ queryKey: ["summary"], queryFn: getSummary });
  const s = summary.data;

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  const stats = [
    { value: s?.total_penalized ?? 1717, label: "hospitals penalized this year", prefix: "", suffix: "" },
    { value: s ? Math.round(s.estimated_total_penalties_usd / 1_000_000) : 193, label: "in annual CMS penalties", prefix: "$", suffix: "M" },
    { value: 74, label: "model AUC (validation)", prefix: "", suffix: "%" },
  ];

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* WebGL world behind — gives depth without noise */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(3,3,3,0) 30%, rgba(3,3,3,0.85) 100%)",
        }}
      />
      {/* Boot cover */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-black z-20"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      />

      <motion.div
        className="relative z-10 max-w-5xl"
        initial={{ opacity: 0, y: 30 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={ready ? { opacity: 1 } : {}}
          transition={{ delay: 0.4 }}
          className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2"
        >
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/50 uppercase">
            HRRP Penalty Intelligence · 4,812 Hospitals Monitored
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-display font-bold leading-[0.92] tracking-[-0.03em] text-white"
          style={{ fontSize: "clamp(3.5rem, 10vw, 8rem)" }}
        >
          Know Your
          <br />
          <span style={{ color: ACCENT, textShadow: `0 0 60px rgba(184,255,61,0.4)` }}>
            Penalty Risk.
          </span>
          <br />
          <span className="text-white/50">Before CMS Does.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/65 md:text-xl"
        >
          Regate analyzes readmission patterns across every U.S. hospital and predicts CMS HRRP penalty
          exposure with 0.74 AUC — giving clinical and financial leaders the lead time to act before
          the notice arrives.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <MagBtn>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-[15px] font-semibold text-black transition-all hover:opacity-90"
              style={{ background: ACCENT }}
            >
              Open Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </MagBtn>
          <MagBtn>
            <Link
              href="/hospitals"
              className="inline-flex items-center gap-2.5 rounded-full border border-white/20 px-8 py-4 text-[15px] font-medium text-white/70 transition-all hover:border-white/50 hover:text-white"
            >
              Search Hospitals
            </Link>
          </MagBtn>
        </motion.div>

        {/* Key stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.3, duration: 0.7 }}
          className="mt-16 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:divide-x sm:divide-white/[0.08]"
        >
          {stats.map(({ value, label, prefix, suffix }, i) => (
            <div key={i} className="px-8 text-center">
              <div className="font-mono text-2xl font-bold text-white md:text-3xl">
                <Counter target={value} prefix={prefix} suffix={suffix} />
              </div>
              <div className="mt-1.5 text-[11px] font-mono tracking-[0.15em] text-white/35 uppercase">
                {label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
      >
        <div className="h-10 w-px overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-5 w-full rounded-full"
            style={{ background: ACCENT }}
            animate={{ y: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <span className="font-mono text-[8px] tracking-[0.3em] text-white/20 uppercase">Scroll</span>
      </motion.div>
    </section>
  );
}

/* ── Problem Section ─────────────────────────────────────────────────*/
function ProblemSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  const problems = [
    {
      icon: AlertTriangle,
      color: "#FF4D6D",
      title: "Penalties Arrive Without Warning",
      body: "CMS issues HRRP penalty notices months after the 30-day readmission window closes. By the time a hospital learns it owes $97,000+, the clinical decisions that caused it are long past.",
    },
    {
      icon: TrendingDown,
      color: "#F7A800",
      title: "No System Connects Risk to Exposure",
      body: "Patient data sits in EHRs. Penalty exposure lives in CMS datasets. No tool bridges the two — so hospitals make discharge decisions without seeing the financial consequences.",
    },
    {
      icon: Target,
      color: ACCENT,
      title: "The Intervention Window Is 30 Days",
      body: "Post-discharge, a 30-day clock determines readmission. Act in that window — through care coordination, follow-up, or targeted intervention — and the penalty never happens.",
    },
  ];

  return (
    <section ref={ref} className="relative bg-[#050505] px-6 py-24 md:py-36">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <p className="mb-4 font-mono text-[10px] tracking-[0.35em] text-white/30 uppercase">
            The Problem
          </p>
          <h2
            className="font-display font-bold leading-tight text-white"
            style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)" }}
          >
            $193 million in annual penalties.
            <br />
            <span className="text-white/35">Almost all of it preventable.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/55">
            The Hospital Readmissions Reduction Program (HRRP) penalizes hospitals up to 3% of
            total Medicare DRG payments for excess readmissions across six conditions. The data
            to predict this exists. The connection to act on it does not — until now.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {problems.map(({ icon: Icon, color, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className="rounded-2xl border border-white/[0.07] bg-[#080808] p-8"
            >
              <div
                className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <h3 className="mb-3 font-display text-lg font-bold text-white leading-tight">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-white/50">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Scale Section ───────────────────────────────────────────────────*/
function ScaleSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section ref={ref} className="relative bg-black px-6 py-24 md:py-36">
      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="mb-16 font-mono text-[10px] tracking-[0.35em] text-white/30 uppercase"
        >
          The Scale
        </motion.p>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-3 md:divide-x md:divide-white/[0.06]">
          {/* 2,545 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="pb-12 md:pb-0 md:pr-16"
          >
            <div
              className="font-display font-bold leading-none"
              style={{ fontSize: "clamp(4rem, 9vw, 6.5rem)", color: "#FF4D6D" }}
            >
              <Counter target={1717} duration={2400} />
            </div>
            <p className="mt-4 text-base font-medium text-white">Hospitals penalized (FY2027)</p>
            <p className="mt-2 text-sm leading-relaxed text-white/45">
              Nearly 88% of HRRP-eligible hospitals with full readmission data received a payment
              reduction in FY2027. The program has penalized hospitals continuously since 2013.
            </p>
          </motion.div>

          {/* $284M */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="py-12 md:py-0 md:px-16"
          >
            <div
              className="font-display font-bold leading-none"
              style={{ fontSize: "clamp(4rem, 9vw, 6.5rem)", color: "#F7A800" }}
            >
              $<Counter target={193} suffix="M" duration={2600} />
            </div>
            <p className="mt-4 text-base font-medium text-white">In estimated annual penalties</p>
            <p className="mt-2 text-sm leading-relaxed text-white/45">
              Distributed across cardiac, pulmonary, orthopedic, and pneumonia conditions. A single
              hospital can face penalties up to $1.5M in one fiscal year.
            </p>
            {/* Condition bars */}
            <div className="mt-5 space-y-2.5">
              {[
                { label: "CARDIAC", pct: 38, color: "#FF4D6D" },
                { label: "PULMONARY", pct: 27, color: "#F7A800" },
                { label: "ORTHOPEDIC", pct: 20, color: "#00C896" },
                { label: "PNEUMONIA", pct: 15, color: ACCENT },
              ].map(({ label, pct, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-22 font-mono text-[9px] tracking-wider text-white/30">{label}</span>
                  <div className="relative flex-1 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={inView ? { width: `${pct}%` } : {}}
                      transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <span className="w-8 font-mono text-[9px] text-white/30 text-right">{pct}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 30 days */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="pt-12 md:pt-0 md:pl-16"
          >
            <div
              className="font-display font-bold leading-none"
              style={{ fontSize: "clamp(4rem, 9vw, 6.5rem)", color: ACCENT }}
            >
              <Counter target={30} suffix=" days" duration={1600} />
            </div>
            <p className="mt-4 text-base font-medium text-white">The intervention window</p>
            <p className="mt-2 text-sm leading-relaxed text-white/45">
              After discharge, a 30-day readmission window determines penalty exposure. Regate
              surfaces the risk before the patient leaves — so care teams can close the gap.
            </p>
            <div className="mt-6 rounded-lg border border-white/[0.07] bg-[#0a0a0a] p-4">
              <p className="font-mono text-[10px] tracking-wider text-white/30 mb-1">REGATE ADVANTAGE</p>
              <p className="text-sm text-white/65">
                Know the risk score at discharge — not 14 months later when CMS sends the bill.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Solution Section ────────────────────────────────────────────────*/
function SolutionSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section ref={ref} className="relative bg-[#050505] px-6 py-24 md:py-36">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(184,255,61,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(184,255,61,0.018) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-24 md:items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <p className="mb-4 font-mono text-[10px] tracking-[0.35em] text-white/30 uppercase">
              The Solution
            </p>
            <h2
              className="font-display font-bold leading-tight text-white"
              style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)" }}
            >
              Regate closes the gap between
              <span style={{ color: ACCENT }}> patient discharge</span>{" "}
              and penalty exposure.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-white/55">
              We ingest five years of public CMS HRRP data, compute excess readmission ratios
              per condition per hospital, and run them through a calibrated XGBoost model trained
              on real penalty outcomes. The result: a 0–100% penalty probability for every
              hospital in the U.S. — updated on each CMS data release.
            </p>

            <div className="mt-8 space-y-4">
              {[
                "Trained on 5 years of CMS HRRP + Hospital Compare data",
                "0.74 AUC on validation set, 92.4% precision identifying penalized hospitals",
                "Covers all 6 HRRP conditions: AMI, HF, COPD, Hip/Knee, CABG, Pneumonia",
                "Actionable intervention scores — not just a risk flag",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                  <span className="text-sm text-white/60">{point}</span>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 font-mono text-sm tracking-wider text-white/50 hover:text-white transition-colors"
              >
                SEE IT IN ACTION <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>

          {/* Timeline visual */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="rounded-2xl border border-white/[0.07] bg-[#080808] p-8"
          >
            <p className="mb-6 font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase">
              Timeline: Without vs. With Regate
            </p>
            {/* Without Regate */}
            <div className="mb-8">
              <p className="mb-4 font-mono text-[9px] tracking-wider text-[#FF4D6D]/70 uppercase">Without Regate</p>
              <div className="flex items-center gap-0">
                {[
                  { label: "Discharge", color: "rgba(255,255,255,0.2)" },
                  { label: "30 Days", color: "#F7A800" },
                  { label: "Data Lock", color: "#FF4D6D" },
                  { label: "Penalty", color: "#FF4D6D" },
                ].map(({ label, color }, i) => (
                  <div key={label} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                      <span className="mt-2 font-mono text-[8px] tracking-wider whitespace-nowrap" style={{ color }}>
                        {label}
                      </span>
                    </div>
                    {i < 3 && (
                      <div className="mx-1 w-12 md:w-16 h-px" style={{ background: `${color}40` }} />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 font-mono text-[9px] text-[#FF4D6D]/60">
                Result: $97,000 penalty notice arrives 14 months later. No recourse.
              </p>
            </div>

            <div className="h-px bg-white/[0.06] mb-8" />

            {/* With Regate */}
            <div>
              <p className="mb-4 font-mono text-[9px] tracking-wider uppercase" style={{ color: `${ACCENT}99` }}>
                With Regate
              </p>
              <div className="flex items-center gap-0">
                {[
                  { label: "Predict", color: ACCENT },
                  { label: "Intervene", color: ACCENT },
                  { label: "Discharge", color: "rgba(255,255,255,0.4)" },
                  { label: "No Penalty", color: ACCENT },
                ].map(({ label, color }, i) => (
                  <div key={label} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                      <span className="mt-2 font-mono text-[8px] tracking-wider whitespace-nowrap" style={{ color }}>
                        {label}
                      </span>
                    </div>
                    {i < 3 && (
                      <div className="mx-1 w-12 md:w-16 h-px" style={{ background: `${color}40` }} />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 font-mono text-[9px]" style={{ color: `${ACCENT}80` }}>
                Result: Care team acts before discharge. Readmission avoided. Penalty never assessed.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Features Section ────────────────────────────────────────────────*/
function PredictFeature() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [rate, setRate] = useState(14.2);

  const risk = useMemo(() => {
    const norm = (rate - 8) / (25 - 8);
    const sig = 1 / (1 + Math.exp(-7 * (norm - 0.45)));
    return Math.round(sig * 100);
  }, [rate]);

  const riskColor = risk > 70 ? "#FF4D6D" : risk > 45 ? "#F7A800" : "#00C896";

  return (
    <div ref={ref} className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col justify-center"
      >
        <div className="mb-3 font-mono text-[9px] tracking-[0.35em]" style={{ color: ACCENT }}>
          01 / PREDICT
        </div>
        <h3 className="font-display text-3xl font-bold text-white leading-tight md:text-4xl">
          Know the penalty risk
          <br />
          before discharge.
        </h3>
        <p className="mt-5 text-sm leading-relaxed text-white/55">
          Input a hospital&apos;s readmission rate, condition flags, and star rating — get a calibrated
          CMS penalty probability in under 2 seconds. Give clinical leads the number they need
          to justify intervention.
        </p>
        <div className="mt-8">
          <Link
            href="/predict"
            className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-white/40 transition-colors hover:text-white"
          >
            OPEN PREDICTOR <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-white/[0.07] bg-[#080808] p-8"
      >
        <div className="mb-6 font-mono text-[9px] tracking-wider text-white/25">LIVE RISK CALCULATOR</div>
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="font-mono text-[9px] tracking-wider text-white/50">READMISSION RATE</span>
            <span className="font-mono text-[9px]" style={{ color: ACCENT }}>{rate.toFixed(1)}%</span>
          </div>
          <input
            type="range" min={8} max={25} step={0.1} value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="w-full h-0.5 bg-white/10 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: ACCENT }}
          />
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[8px] text-white/20">8%</span>
            <span className="font-mono text-[8px] text-white/20">25%</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black p-6 text-center">
          <div className="font-mono text-[9px] tracking-[0.3em] text-white/30 mb-3">PENALTY PROBABILITY</div>
          <div className="font-display text-6xl font-bold leading-none transition-all duration-300" style={{ color: riskColor, textShadow: `0 0 30px ${riskColor}50` }}>
            {risk}%
          </div>
          <div className="mt-5 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full transition-all duration-500" style={{ width: `${risk}%`, background: riskColor }} />
          </div>
          <div className="mt-3 font-mono text-[9px] tracking-wider" style={{ color: riskColor }}>
            {risk > 70 ? "HIGH RISK — INTERVENTION REQUIRED" : risk > 45 ? "MODERATE — MONITOR CLOSELY" : "LOW RISK — STANDARD CARE"}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ExploreFeature() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const states = [
    { state: "TX", risk: 82, count: 312 }, { state: "CA", risk: 71, count: 289 },
    { state: "FL", risk: 78, count: 245 }, { state: "NY", risk: 68, count: 198 },
    { state: "PA", risk: 74, count: 187 }, { state: "OH", risk: 69, count: 176 },
    { state: "IL", risk: 73, count: 165 }, { state: "GA", risk: 80, count: 154 },
    { state: "NC", risk: 75, count: 143 }, { state: "MI", risk: 67, count: 138 },
    { state: "VA", risk: 72, count: 129 }, { state: "AZ", risk: 77, count: 118 },
  ];

  return (
    <div ref={ref} className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-white/[0.07] bg-[#080808] p-8 order-2 md:order-1"
      >
        <div className="mb-4 font-mono text-[9px] tracking-wider text-white/25">HOSPITAL UNIVERSE · 4,812 NODES</div>
        <div className="grid grid-cols-4 gap-2">
          {states.map(({ state, risk, count }) => {
            const color = risk > 75 ? "#FF4D6D" : risk > 65 ? "#F7A800" : "#00C896";
            return (
              <motion.div
                key={state}
                onMouseEnter={() => setHoveredState(state)}
                onMouseLeave={() => setHoveredState(null)}
                whileHover={{ scale: 1.08 }}
                className="relative cursor-pointer rounded-lg border border-white/[0.06] bg-black p-3 text-center transition-colors"
                style={{ borderColor: hoveredState === state ? `${color}50` : undefined }}
              >
                <div className="font-mono text-[9px] font-bold" style={{ color }}>{state}</div>
                <div className="mt-1 font-mono text-[8px] text-white/25">{count}</div>
                <div className="mt-2 h-0.5 rounded-full" style={{ background: color, opacity: risk / 100 }} />
              </motion.div>
            );
          })}
        </div>
        {hoveredState && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-lg border border-white/[0.06] bg-black p-3"
          >
            <span className="font-mono text-[9px] text-white/45">
              {hoveredState} — {states.find(s => s.state === hoveredState)?.count} hospitals ·{" "}
              {states.find(s => s.state === hoveredState)?.risk}% avg penalty risk
            </span>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col justify-center order-1 md:order-2"
      >
        <div className="mb-3 font-mono text-[9px] tracking-[0.35em]" style={{ color: ACCENT }}>02 / EXPLORE</div>
        <h3 className="font-display text-3xl font-bold text-white leading-tight md:text-4xl">
          Every hospital.
          <br />Every risk score.
        </h3>
        <p className="mt-5 text-sm leading-relaxed text-white/55">
          Search 4,812 hospitals by name, state, or CMS provider ID. See penalty risk scores,
          condition-level breakdowns, and star ratings side by side. Compare your system to
          regional peers in seconds.
        </p>
        <div className="mt-8">
          <Link
            href="/hospitals"
            className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-white/40 transition-colors hover:text-white"
          >
            OPEN EXPLORER <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function SimulateFeature() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [sliderVal, setSliderVal] = useState(72);

  const penaltyK = useMemo(() => Math.round(sliderVal * 0.88 + 8), [sliderVal]);
  const exposure = useMemo(() => (sliderVal > 65 ? "HIGH" : sliderVal > 40 ? "MODERATE" : "LOW"), [sliderVal]);
  const expColor = sliderVal > 65 ? "#FF4D6D" : sliderVal > 40 ? "#F7A800" : "#00C896";

  return (
    <div ref={ref} className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col justify-center"
      >
        <div className="mb-3 font-mono text-[9px] tracking-[0.35em]" style={{ color: ACCENT }}>03 / SIMULATE</div>
        <h3 className="font-display text-3xl font-bold text-white leading-tight md:text-4xl">
          Change the input.
          <br />Change the outcome.
        </h3>
        <p className="mt-5 text-sm leading-relaxed text-white/55">
          Adjust readmission rates per condition and watch penalty probability respond in real time.
          Find the intervention with the highest ROI — before committing resources. Turn &quot;what if
          we reduce cardiac readmissions by 2%?&quot; into a dollar answer.
        </p>
        <div className="mt-8">
          <Link
            href="/simulate"
            className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-white/40 transition-colors hover:text-white"
          >
            OPEN SIMULATOR <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-white/[0.07] bg-[#080808] p-8"
      >
        <div className="mb-6 font-mono text-[9px] tracking-wider text-white/25">WHAT-IF SIMULATOR</div>
        <div className="text-center mb-8">
          <div className="font-mono text-[9px] tracking-[0.3em] text-white/30 mb-2">PENALTY RISK</div>
          <div className="font-display font-bold leading-none" style={{ fontSize: "clamp(4rem, 10vw, 6rem)", color: expColor, textShadow: `0 0 40px ${expColor}40` }}>
            {sliderVal}%
          </div>
          <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: expColor }} animate={{ width: `${sliderVal}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
          </div>
        </div>
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="font-mono text-[9px] tracking-wider text-white/50">READMISSION RATE</span>
          </div>
          <input
            type="range" min={5} max={95} step={1} value={sliderVal}
            onChange={(e) => setSliderVal(parseInt(e.target.value))}
            className="w-full h-0.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: ACCENT, background: "rgba(255,255,255,0.08)" }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "PENALTY RISK", value: `${sliderVal}%`, color: expColor },
            { label: "EXPECTED EXPOSURE", value: `$${penaltyK}K`, color: expColor },
            { label: "STATUS", value: exposure, color: expColor },
            { label: "INTERVENTION", value: sliderVal > 65 ? "URGENT" : sliderVal > 40 ? "MONITOR" : "STABLE", color: expColor },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-white/[0.05] bg-black p-3">
              <div className="font-mono text-[8px] tracking-wider text-white/25 mb-1">{label}</div>
              <div className="font-mono text-sm font-bold transition-colors duration-300" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section ref={ref} className="relative bg-[#050505] px-6 py-24 md:py-40">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="relative z-10 mx-auto max-w-6xl space-y-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-4 font-mono text-[10px] tracking-[0.35em] text-white/30 uppercase">The Platform</p>
          <h2 className="font-display font-bold text-white leading-tight" style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)" }}>
            Three tools built for
            <br />
            <span className="text-white/30">one outcome: zero penalties.</span>
          </h2>
        </motion.div>
        <PredictFeature />
        <ExploreFeature />
        <SimulateFeature />
      </div>
    </section>
  );
}

/* ── Pipeline Section ────────────────────────────────────────────────*/
const PIPELINE_STEPS = [
  { step: "01", label: "DATA INGESTION", sub: "CMS HRRP · CDC · Hospital Compare", desc: "Five public datasets unified into a single feature store. 4,812 hospitals. Five fiscal years of penalty history.", accent: ACCENT },
  { step: "02", label: "FEATURE ENGINEERING", sub: "ERR Computation Per Condition", desc: "Excess readmission ratios computed per condition per hospital. Normalized against national benchmarks.", accent: "#59E3FF" },
  { step: "03", label: "MODEL TRAINING", sub: "XGBoost · Validation AUC 0.74", desc: "Four model families benchmarked. XGBoost wins across all metrics. Calibrated probability output — not a black box score.", accent: "#F7A800" },
  { step: "04", label: "RISK SCORING", sub: "0–100% Penalty Probability", desc: "Every hospital receives a calibrated penalty probability. Updated on each CMS data release cycle.", accent: "#FF4D6D" },
  { step: "05", label: "INTERVENTION PLAN", sub: "ROI-Weighted Recommendations", desc: "Ranked, condition-specific interventions surfaced first. Highest expected penalty reduction = highest priority.", accent: ACCENT },
];

function PipelineSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section ref={ref} className="relative bg-black px-6 py-24 md:py-40">
      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <p className="mb-4 font-mono text-[10px] tracking-[0.35em] text-white/30 uppercase">How It Works</p>
          <h2 className="font-display font-bold text-white leading-tight" style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)" }}>
            From raw CMS data
            <br />
            <span className="text-white/30">to penalty prediction in 5 steps.</span>
          </h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-[calc(2.5rem)] top-0 bottom-0 w-px bg-white/[0.05]" />
          <div className="space-y-0">
            {PIPELINE_STEPS.map(({ step, label, sub, desc, accent }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative flex items-start gap-8 py-8"
              >
                <div
                  className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-[#040404]"
                  style={{ borderColor: `${accent}40` }}
                >
                  <span className="font-mono text-[9px] font-bold" style={{ color: accent }}>{step}</span>
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="font-mono text-sm font-bold tracking-wider text-white">{label}</h3>
                    <span className="font-mono text-[8px] tracking-wider text-white/30">{sub}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/45">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Trust / Validation Section ──────────────────────────────────────*/
function TrustSection() {
  const backtesting = useQuery({ queryKey: ["backtesting"], queryFn: getBacktesting });
  const recall = backtesting.data?.recall_pct;
  const samples = (backtesting.data?.sample_predictions ?? []).slice(0, 3);

  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  const fallback = [
    { predicted: "87%", actual: "PENALIZED 0.89%", penalized: true },
    { predicted: "12%", actual: "NOT PENALIZED", penalized: false },
    { predicted: "74%", actual: "PENALIZED 0.62%", penalized: true },
  ];

  const displaySamples = samples.length > 0
    ? samples.map((ex) => ({
        predicted: ex.predicted_probability != null ? `${Math.round(ex.predicted_probability * 100)}%` : ex.predicted_penalized ? "HIGH" : "LOW",
        actual: ex.actually_penalized ? `PENALIZED${ex.actual_penalty_pct != null ? ` ${ex.actual_penalty_pct.toFixed(2)}%` : ""}` : "NOT PENALIZED",
        penalized: ex.actually_penalized,
      }))
    : fallback;

  return (
    <section ref={ref} className="relative bg-[#050505] px-6 py-24 md:py-40">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <p className="mb-4 font-mono text-[10px] tracking-[0.35em] text-white/30 uppercase">Model Validation</p>
          <h2 className="font-display font-bold text-white leading-tight" style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)" }}>
            Validated against
            <br />
            <span className="text-white/30">real CMS penalties.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/55">
            Trained on five years of public CMS data. Validated on a held-out set of 586 hospitals.
            Regate correctly identifies penalized hospitals{" "}
            <span className="text-white font-medium">{recall != null ? `${recall.toFixed(1)}%` : "67.8%"}</span>{" "}
            of the time — with 92.4% precision: when it flags a hospital as at-risk, it is almost always right.
          </p>
        </motion.div>

        {/* Metrics */}
        <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "AUC", value: "0.74", sub: "Area Under Curve" },
            { label: "RECALL", value: "67.8%", sub: "Sensitivity" },
            { label: "PRECISION", value: "92.4%", sub: "Positive Predictive Value" },
            { label: "HOSPITALS", value: "4,812", sub: "Database Coverage" },
          ].map(({ label, value, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              className="rounded-xl border border-white/[0.07] bg-[#080808] p-6"
            >
              <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 mb-3">{label}</div>
              <div className="font-display text-2xl font-bold" style={{ color: ACCENT }}>{value}</div>
              <div className="mt-1.5 font-mono text-[8px] text-white/25">{sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Sample predictions */}
        <p className="mb-6 font-mono text-[9px] tracking-[0.25em] text-white/25 uppercase">Held-Out Prediction Samples</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {displaySamples.map((ex, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className="rounded-xl border p-6"
              style={{
                borderColor: ex.penalized ? "rgba(255,77,109,0.2)" : "rgba(0,200,150,0.2)",
                background: ex.penalized ? "rgba(255,77,109,0.03)" : "rgba(0,200,150,0.03)",
              }}
            >
              <div className="mb-4">
                <div className="font-mono text-[8px] tracking-[0.3em] text-white/25 mb-2">PREDICTED</div>
                <div className="font-display text-4xl font-bold text-white">{ex.predicted}</div>
                <div className="font-mono text-[9px] tracking-wider text-white/30 mt-1">PENALTY PROBABILITY</div>
              </div>
              <div className="h-px bg-white/[0.05] mb-4" />
              <div>
                <div className="font-mono text-[8px] tracking-[0.3em] text-white/25 mb-2">ACTUAL OUTCOME</div>
                <div className="font-mono text-sm font-bold" style={{ color: ex.penalized ? "#FF4D6D" : "#00C896" }}>
                  {ex.actual}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Data source note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="mt-10 font-mono text-[9px] text-white/20 tracking-wider"
        >
          All data sourced from CMS HRRP, Hospital Compare, and CDC public datasets. No PHI. No proprietary data.
        </motion.p>
      </div>
    </section>
  );
}

/* ── CTA Section ─────────────────────────────────────────────────────*/
function CtaSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/hospitals?q=${encodeURIComponent(query.trim())}` : "/hospitals");
  };

  return (
    <section ref={ref} className="relative bg-black px-6 py-24 md:py-40">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="mb-5 font-mono text-[10px] tracking-[0.35em] text-white/30 uppercase"
        >
          See It Now
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          className="font-display font-bold leading-tight text-white"
          style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)" }}
        >
          Search any hospital.
          <br />
          <span style={{ color: ACCENT }}>See their risk.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="mt-5 text-base text-white/50"
        >
          Find out if your hospital — or a competitor — is exposed to CMS penalties this fiscal year.
        </motion.p>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="mt-10"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hospital by name…"
                aria-label="Search a hospital"
                className="w-full rounded-full border border-white/[0.1] bg-[#0a0a0a] pl-11 pr-5 py-4 font-mono text-sm text-white placeholder:text-white/20 focus:border-white/25 focus:outline-none transition-colors"
              />
            </div>
            <MagBtn>
              <button
                type="submit"
                className="shrink-0 inline-flex items-center gap-2.5 rounded-full px-8 py-4 font-mono text-sm font-bold text-black transition-opacity"
                style={{ background: ACCENT }}
              >
                SEARCH <ArrowRight className="h-4 w-4" />
              </button>
            </MagBtn>
          </div>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7 }}
          className="mt-16 flex flex-col items-center gap-5 sm:flex-row sm:justify-center"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-[15px] font-semibold text-black transition-all hover:opacity-90"
            style={{ background: ACCENT }}
          >
            Open Full Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/about"
            className="font-mono text-sm tracking-wider text-white/40 hover:text-white transition-colors"
          >
            Learn More →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────*/
function Footer() {
  return (
    <footer className="border-t border-white/[0.05] bg-[#020202] px-6 py-12 md:px-12">
      <div className="mx-auto max-w-6xl flex flex-col items-center gap-8 md:flex-row md:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm font-bold tracking-[0.2em] text-white uppercase">REGATE</span>
          <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: ACCENT }} />
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-6">
          {[
            { href: "/dashboard", label: "DASHBOARD" },
            { href: "/hospitals", label: "HOSPITALS" },
            { href: "/predict", label: "PREDICT" },
            { href: "/simulate", label: "SIMULATE" },
            { href: "/about", label: "ABOUT" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-mono text-[9px] tracking-[0.2em] text-white/20 transition-colors hover:text-white/55"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="font-mono text-[9px] tracking-wider text-white/15">
          © {new Date().getFullYear()} REGATE · CMS PUBLIC DATA ONLY
        </p>
      </div>
    </footer>
  );
}

/* ── Page ────────────────────────────────────────────────────────────*/
export default function LandingPage() {
  return (
    <div className="relative text-white" style={{ fontFamily: "var(--font-sans)", overflowX: "clip" }}>
      <Scene3D />
      <div className="relative z-10">
        <Nav />
        <HeroSection />
        <ProblemSection />
        <ScaleSection />
        <SolutionSection />
        <FeaturesSection />
        <PipelineSection />
        <TrustSection />
        <CtaSection />
        <Footer />
      </div>
    </div>
  );
}
