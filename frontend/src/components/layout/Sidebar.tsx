"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Brain,
  Building2,
  Home,
  Info,
  LayoutDashboard,
  Menu,
  Sliders,
  X,
} from "lucide-react";
import { useAPIHealth } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hospitals", label: "Hospitals", icon: Building2 },
  { href: "/predict", label: "Risk Calculator", icon: Activity },
  { href: "/simulate", label: "Interventions", icon: Sliders },
  { href: "/model", label: "Model", icon: Brain },
  { href: "/about", label: "About", icon: Info },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const health = useAPIHealth();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const NavList = () => (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-white/[0.08] text-white"
                : "text-white/40 hover:bg-white/[0.04] hover:text-white/80",
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl bg-white/[0.08]"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
            )}
            <Icon
              className={cn(
                "relative z-10 h-[17px] w-[17px] transition-colors",
                active ? "text-white" : "text-white/40 group-hover:text-white/70",
              )}
            />
            <span className="relative z-10">{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <Link
      href="/"
      onClick={() => setOpen(false)}
      className="flex items-center gap-2.5 px-6 py-6"
    >
      <span className="font-display text-[22px] font-bold tracking-tight text-white">
        Regate
      </span>
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
    </Link>
  );

  const Footer = () => {
    const statusLabel = health.connecting
      ? "Connecting…"
      : health.demo
        ? "Demo mode"
        : health.isLive
          ? "Live"
          : "Connecting…";
    const dotColor = health.connecting
      ? "bg-white/30"
      : health.isLive && !health.demo
        ? "bg-safe"
        : "bg-amber";
    const pingColor = health.isLive && !health.demo && !health.connecting ? "animate-ping bg-safe" : "";
    return (
      <div className="border-t border-white/[0.06] px-6 py-4">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-white/40">
          <span className="relative flex h-1.5 w-1.5">
            {pingColor && (
              <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", pingColor)} />
            )}
            <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotColor)} />
          </span>
          {statusLabel}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.06] bg-black px-4 py-3 lg:hidden">
        <span className="font-display text-xl font-bold text-white">
          Regate
          <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-white align-middle" />
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="rounded-lg border border-white/[0.08] p-2 text-white/50 transition-colors hover:text-white"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/[0.06] bg-black lg:flex">
        <Brand />
        <NavList />
        <Footer />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-white/[0.06] bg-black"
            >
              <div className="flex items-center justify-between pr-4">
                <Brand />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className="rounded-lg p-2 text-white/40 transition-colors hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <NavList />
              <Footer />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
