"use client";

import { motion } from "framer-motion";
import { useCountUp } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const VIEWPORT = { once: true, amount: 0.1 } as const;

function AnimatedStat({
  value,
  prefix = "",
  suffix = "",
  label,
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  decimals?: number;
}) {
  const { ref, value: animated } = useCountUp(value, 1400, true);
  const display = animated.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      variants={fadeUp}
      className="text-center"
    >
      <p className="font-display text-5xl font-bold text-white tabular-nums">
        {prefix}{display}{suffix}
      </p>
      <p className="mt-2 text-sm text-slate-400">{label}</p>
    </motion.div>
  );
}

const TIMELINE_STEPS = [
  {
    step: "01",
    title: "CMS Publishes Excess Readmission Ratios",
    desc: "Each year, CMS calculates an Excess Readmission Ratio (ERR) for every scored hospital across six conditions. An ERR above 1.0 means a hospital readmits more patients than the national risk-adjusted average.",
  },
  {
    step: "02",
    title: "Regate Ingests & Normalizes the Data",
    desc: "We process ERR files, Hospital Compare records, and quality indicators for all 4,812 hospitals tracked by CMS. Features are cleaned, merged, and normalized for model input.",
  },
  {
    step: "03",
    title: "XGBoost Scores Each Hospital",
    desc: "Our gradient-boosted classifier predicts penalty probability from readmission rates, star rating, ownership type, and other quality signals — achieving 0.74 AUC-ROC on a held-out validation set.",
  },
  {
    step: "04",
    title: "Penalty Amount Is Derived",
    desc: "The statutory penalty formula multiplies the hospital's aggregate excess readmissions against its Medicare payment share, capped at 3% of total payments.",
  },
  {
    step: "05",
    title: "Hospitals Simulate Improvements",
    desc: "Teams use the intervention simulator to model the dollar and probability impact of targeted readmission reductions — before committing clinical resources.",
  },
];

const DATA_SOURCES = [
  {
    name: "CMS HRRP Penalty File",
    badge: "CMS",
    records: "1,951 records",
    desc: "Official penalty amounts and penalization status for all HRRP-eligible hospitals. Primary ground truth for model training.",
    color: "border-white/[0.12] bg-white/[0.03]",
    badgeColor: "bg-white/10 text-white",
  },
  {
    name: "Hospital Compare",
    badge: "CMS",
    records: "4,812 records",
    desc: "Star ratings (1–5), ownership classification, emergency services flag, and additional hospital characteristics.",
    color: "border-white/[0.12] bg-white/[0.03]",
    badgeColor: "bg-white/10 text-white",
  },
  {
    name: "Excess Readmission Ratios",
    badge: "CMS",
    records: "1,951 hospitals × 6 conditions",
    desc: "Per-condition ERRs and 30-day readmission rates across AMI, Heart Failure, Pneumonia, COPD, Hip/Knee, and CABG.",
    color: "border-white/[0.12] bg-white/[0.03]",
    badgeColor: "bg-white/10 text-white",
  },
  {
    name: "Diabetic Readmission Dataset",
    badge: "UCI ML Repo",
    records: "101,766 patient records",
    desc: "10-year patient-level dataset from 130 US hospitals powering the patient-level readmission risk model.",
    color: "border-amber/30 bg-amber/[0.04]",
    badgeColor: "bg-amber/15 text-amber",
  },
  {
    name: "AHRQ Quality Indicators",
    badge: "AHRQ",
    records: "4,812 records",
    desc: "Supplemental patient safety and quality indicators used as secondary model features.",
    color: "border-safe/30 bg-safe/[0.04]",
    badgeColor: "bg-safe/15 text-safe",
  },
];

const MODEL_METRICS = [
  { label: "AUC-ROC",  value: "0.74",           highlight: true },
  { label: "Accuracy", value: "67.6%",           highlight: false },
  { label: "Precision",value: "92.4%",           highlight: false },
  { label: "Recall",   value: "67.8%",            highlight: false },
  { label: "F1 Score", value: "78.2%",           highlight: false },
  { label: "Val. Set", value: "586 hospitals",   highlight: false },
];

const TECH_STACK = [
  { name: "Python 3.11",  color: "bg-white/[0.06] text-white/80 border-white/[0.12]" },
  { name: "FastAPI",      color: "bg-safe/10  text-safe  border-safe/20"  },
  { name: "XGBoost",     color: "bg-amber/10 text-amber border-amber/20" },
  { name: "scikit-learn", color: "bg-white/[0.06] text-white/80 border-white/[0.12]" },
  { name: "pandas",       color: "bg-safe/10  text-safe  border-safe/20"  },
  { name: "Next.js 14",  color: "bg-white/[0.06] text-white/80 border-white/[0.12]" },
  { name: "TypeScript",  color: "bg-safe/10  text-safe  border-safe/20"  },
  { name: "TailwindCSS", color: "bg-amber/10 text-amber border-amber/20" },
  { name: "Recharts",    color: "bg-white/[0.06] text-white/80 border-white/[0.12]" },
  { name: "Google Cloud",color: "bg-safe/10  text-safe  border-safe/20"  },
  { name: "Cloud Run",   color: "bg-amber/10 text-amber border-amber/20" },
  { name: "BigQuery",    color: "bg-white/[0.06] text-white/80 border-white/[0.12]" },
];

export default function AboutPage() {
  return (
    <div className="space-y-24 pb-24">

      {/* 1 · Hero */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="flex min-h-[40vh] flex-col items-center justify-center text-center"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
          About Regate
        </p>
        <h1 className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl">
          Regate
          <span className="ml-3 inline-block h-3 w-3 rounded-full bg-safe align-middle" />
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/60">
          Predictive analytics for hospital readmission penalties
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/30">
          Machine-learning intelligence built on top of CMS Hospital Readmissions Reduction Program data —
          so hospital teams can see risk before CMS does.
        </p>
      </motion.section>

      {/* 2 · The Problem */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
      >
        <SectionLabel>The Problem We Solve</SectionLabel>
        <div className="mt-10 grid gap-12 sm:grid-cols-3">
          <AnimatedStat value={1717} label="Hospitals penalized by CMS (FY2027 projection)" />
          <AnimatedStat value={193} prefix="$" suffix="M+" label="Estimated total annual Medicare penalties" />
          <AnimatedStat value={30} suffix=" days" label="Readmission window that determines penalty risk" />
        </div>
        <motion.div variants={fadeUp} className="mt-10 card p-6">
          <p className="text-sm leading-relaxed text-white/50">
            The CMS Hospital Readmissions Reduction Program (HRRP) reduces Medicare payments to hospitals with
            higher-than-expected 30-day readmissions across six tracked conditions: Heart Failure, Pneumonia,
            COPD, Acute Myocardial Infarction, Hip/Knee Replacement, and Coronary Artery Bypass Grafting.
            Penalties are calculated from{" "}
            <span className="font-semibold text-white">Excess Readmission Ratios</span> — a risk-adjusted
            measure that compares each hospital to a national predicted rate. The problem: hospitals don&apos;t
            know their penalty status until CMS announces it months after the performance period closes.
            Regate brings that signal forward.
          </p>
        </motion.div>
      </motion.section>

      {/* 3 · How It Works */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
      >
        <SectionLabel>How It Works</SectionLabel>
        <div className="mt-10 relative">
          <div className="absolute left-[19px] top-0 h-full w-px bg-white/[0.08]" />
          <div className="space-y-8">
            {TIMELINE_STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                variants={fadeUp}
                className="relative flex gap-6"
              >
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black font-mono text-xs font-bold text-white/60">
                  {s.step}
                </div>
                <div className="pt-1.5">
                  <h3 className="font-display font-semibold text-white">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/40">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* 4 · Data Sources */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
      >
        <SectionLabel>Data Sources</SectionLabel>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DATA_SOURCES.map((src) => (
            <motion.div
              key={src.name}
              variants={fadeUp}
              className={cn("rounded-2xl border p-5", src.color)}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-sm font-semibold text-white">{src.name}</h3>
                <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold", src.badgeColor)}>
                  {src.badge}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-white/30">{src.records}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/40">{src.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 5 · Model Performance */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
      >
        <SectionLabel>Model Performance</SectionLabel>
        <motion.div variants={fadeUp} className="mt-8 card overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <p className="text-sm text-white/40">
              XGBoost Gradient Boosted Classifier · Validated on 586 HRRP-eligible hospitals (30% deterministic split)
            </p>
          </div>
          <div className="grid divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {MODEL_METRICS.map((m) => (
              <div
                key={m.label}
                className={cn(
                  "flex items-center justify-between px-5 py-4 sm:flex-col sm:items-start sm:gap-1",
                  m.highlight && "bg-white/[0.03]",
                )}
              >
                <span className="text-xs uppercase tracking-wider text-white/30">{m.label}</span>
                <span
                  className={cn(
                    "font-display text-xl font-bold",
                    m.highlight ? "text-safe" : "text-white",
                  )}
                >
                  {m.value}
                  {m.highlight && (
                    <span className="ml-1.5 rounded-md bg-safe/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-safe">
                      Best
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* 6 · Tech Stack */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
      >
        <SectionLabel>Tech Stack</SectionLabel>
        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
          {TECH_STACK.map((t, i) => (
            <motion.span
              key={t.name}
              variants={fadeUp}
              custom={i}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-medium",
                t.color,
              )}
            >
              {t.name}
            </motion.span>
          ))}
        </motion.div>
      </motion.section>

      {/* 7 · Team */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
      >
        <SectionLabel>Team</SectionLabel>
        <div className="mt-8 card p-8 flex flex-col items-center text-center gap-4 sm:flex-row sm:text-left sm:gap-8">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.12]">
            <span className="font-display text-2xl font-bold text-white">SK</span>
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-white">Siva Karthik</h3>
            <p className="mt-1 text-sm text-white/50">
              Full-stack developer and data engineer. Built Regate to make CMS penalty intelligence
              accessible, transparent, and actionable for hospital administrators and health system leaders.
            </p>
          </div>
        </div>
      </motion.section>

      <p className="text-center text-xs text-white/20">
        Regate · Predictions are model-based estimates. Official penalty determinations are made by CMS.
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">{children}</p>
      <div className="flex-1 border-t border-white/[0.06]" />
    </div>
  );
}
