"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  Database,
  FlaskConical,
  HeartPulse,
  Layers3,
  LineChart,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COUNTERS = [
  { label: "Hospitals", value: 240, suffix: "" },
  { label: "Penalty Pool", value: 284, suffix: "M" },
  { label: "Readmission Window", value: 30, suffix: " days" },
] as const;

const MODEL_ROWS = [
  { model: "Hospital penalty model", metric: "AUC", value: "0.81" },
  { model: "Hospital penalty model", metric: "Accuracy", value: "0.76" },
  { model: "Patient readmission model", metric: "AUC", value: "0.78" },
  { model: "Patient readmission model", metric: "Accuracy", value: "0.72" },
  { model: "Penalty severity model", metric: "RMSE", value: "0.32" },
  { model: "Penalty severity model", metric: "MAE", value: "0.21" },
] as const;

const STACK = [
  { name: "Python", icon: FlaskConical, tone: "text-cyan" },
  { name: "FastAPI", icon: Workflow, tone: "text-safe-green" },
  { name: "Next.js", icon: Layers3, tone: "text-white" },
  { name: "scikit-learn", icon: Brain, tone: "text-amber" },
  { name: "XGBoost", icon: BarChart3, tone: "text-risk-red" },
  { name: "Vercel", icon: Sparkles, tone: "text-cyan" },
  { name: "Railway", icon: HeartPulse, tone: "text-safe-green" },
  { name: "Recharts", icon: LineChart, tone: "text-amber" },
] as const;

const SOURCES = [
  {
    title: "CMS HRRP / Hospital Readmissions PUF",
    description: "Hospital penalty signals and CMS readmission exposure for the hospital-level predictor.",
    icon: ShieldCheck,
  },
  {
    title: "NHAMCS 2018-2022",
    description: "Emergency department visit data used to model intake-driven risk signals and patient flow.",
    icon: Stethoscope,
  },
  {
    title: "Hospital Feature Tables",
    description: "Processed CMS hospital attributes and condition-level quality indicators.",
    icon: Building2,
  },
  {
    title: "Training Notebook Outputs",
    description: "Model comparison summaries, feature importance, and benchmark metrics.",
    icon: Database,
  },
] as const;

export default function AboutPage(): JSX.Element {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-7xl space-y-8"
      >
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <DatasetSources />
        <PerformanceTable />
        <TechStack />
      </motion.div>
    </main>
  );
}

function Hero(): JSX.Element {
  return (
    <section className="rounded-[32px] border border-white/8 bg-card-900/90 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.28)] md:p-10">
      <div className="max-w-3xl space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan">
          <Sparkles className="h-3.5 w-3.5" />
          Research Project
        </div>
        <h1 className="font-display text-5xl font-bold tracking-tight text-white md:text-7xl">Regate</h1>
        <p className="font-display text-2xl font-medium tracking-tight text-white/90 md:text-3xl">Predict the penalty before it hits</p>
        <p className="max-w-2xl text-base leading-7 text-white/70 md:text-lg">
          Built as a healthcare analytics research project - BCSE335L, VIT Chennai.
        </p>
      </div>
    </section>
  );
}

function ProblemSection(): JSX.Element {
  return (
    <section className="rounded-[32px] border border-white/8 bg-elevated-900/55 p-8">
      <div className="max-w-3xl">
        <h2 className="font-display text-3xl font-bold text-white md:text-4xl">The Problem</h2>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-white/70">
          240 hospitals face penalties above 1% in FY2026. $284M redistributed annually.
          The cycle starts at the emergency department door.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {COUNTERS.map((counter) => (
          <CounterCard key={counter.label} label={counter.label} value={counter.value} suffix={counter.suffix} />
        ))}
      </div>
    </section>
  );
}

function HowItWorks(): JSX.Element {
  const steps = [
    {
      title: "ED Visit Data",
      text: "NHAMCS 2018-2022, 130K+ visits/year",
      icon: Stethoscope,
    },
    {
      title: "ML Models",
      text: "XGBoost + Neural Networks, AUC > 0.75",
      icon: Brain,
    },
    {
      title: "Penalty Prediction",
      text: "Hospital-level risk + patient-level readmission risk",
      icon: ShieldCheck,
    },
  ] as const;

  return (
    <section className="rounded-[32px] border border-white/8 bg-card-900/90 p-8">
      <h2 className="font-display text-3xl font-bold text-white md:text-4xl">How It Works</h2>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative overflow-hidden rounded-[24px] border border-white/8 bg-elevated-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-2xl border border-cyan/20 bg-cyan/10 p-3 text-cyan">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-mono text-white/35">Step {index + 1}</div>
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">{step.text}</p>
              {index < steps.length - 1 ? <ArrowRight className="absolute right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-cyan/60 lg:block" /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DatasetSources(): JSX.Element {
  return (
    <section className="rounded-[32px] border border-white/8 bg-elevated-900/55 p-8">
      <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Dataset Sources</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SOURCES.map((source) => {
          const Icon = source.icon;
          return (
            <div key={source.title} className="rounded-[24px] border border-white/8 bg-card-900 p-5">
              <div className="inline-flex rounded-2xl border border-cyan/20 bg-cyan/10 p-3 text-cyan">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-white">{source.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">{source.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PerformanceTable(): JSX.Element {
  return (
    <section className="rounded-[32px] border border-white/8 bg-card-900/90 p-8">
      <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Model Performance</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
        Training summary from the current model pipeline. The notebook writes these benchmark fields to `model_metadata.json`.
      </p>

      <div className="mt-6 overflow-x-auto rounded-[24px] border border-white/8 bg-elevated-900">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-white/8 text-xs uppercase tracking-[0.22em] text-white/40">
            <tr>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Metric</th>
              <th className="px-4 py-3 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8 text-sm">
            {MODEL_ROWS.map((row) => (
              <tr key={`${row.model}-${row.metric}`} className="hover:bg-white/5">
                <td className="px-4 py-3 text-white/85">{row.model}</td>
                <td className="px-4 py-3 text-white/60">{row.metric}</td>
                <td className="px-4 py-3 text-right font-mono text-white">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TechStack(): JSX.Element {
  return (
    <section className="rounded-[32px] border border-white/8 bg-elevated-900/55 p-8">
      <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Tech Stack</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STACK.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="rounded-[24px] border border-white/8 bg-card-900 p-5 transition hover:-translate-y-1 hover:border-cyan/25">
              <div className={cn("inline-flex rounded-2xl border border-white/8 bg-white/5 p-3", item.tone)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-display text-xl font-bold text-white">{item.name}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CounterCard({ label, value, suffix }: { label: string; value: number; suffix: string }): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const count = useCountUp(inView, value);

  return (
    <div ref={ref} className="rounded-[24px] border border-white/8 bg-card-900 p-5">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-3 font-display text-5xl font-bold text-white">
        {count}
        {suffix}
      </div>
    </div>
  );
}

function useCountUp(active: boolean, target: number): string {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }
    let frame = 0;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, target]);

  return value.toLocaleString();
}
