"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Building2, Info, LayoutDashboard, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/predict", label: "Risk Calculator", icon: Activity },
  { href: "/hospitals", label: "Hospitals", icon: Building2 },
  { href: "/about", label: "About", icon: Info },
];

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-white/8 bg-[rgba(26,35,64,0.96)] px-5 py-6 text-white/80 backdrop-blur md:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      <div className="fixed left-4 top-4 z-40 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-2xl border border-white/10 bg-[rgba(26,35,64,0.95)] p-3 text-white shadow-lg"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-white/8 bg-[rgba(26,35,64,0.98)] px-5 py-6 text-white/80 backdrop-blur md:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-3xl font-bold tracking-tight text-white">Regate</span>
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 p-2 text-white/70">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent pathname={pathname} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({ pathname }: { pathname: string }): JSX.Element {
  return (
    <>
      <div className="leading-none">
        <div className="flex items-start gap-1.5">
          <span className="font-display text-3xl font-bold tracking-tight text-white">Regate</span>
          <span className="mt-1 text-[10px] font-semibold text-white/50">®</span>
        </div>
        <div className="mt-2 h-0.5 w-14 rounded-full bg-cyan shadow-[0_0_24px_rgba(0,212,255,0.9)]" />
      </div>

      <nav className="mt-10 flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl border-l-2 px-4 py-3 transition",
                active
                  ? "border-cyan bg-cyan/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "border-transparent hover:border-cyan/50 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className={cn("h-4.5 w-4.5", active ? "text-cyan" : "text-white/60")} />
              <span className="font-sans text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/4 p-4">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Built for BCSE335L</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-xs text-white/70">Regate v1.0</span>
          <span className="h-2 w-2 rounded-full bg-safe-green shadow-[0_0_18px_rgba(0,200,150,0.85)]" />
        </div>
      </div>
    </>
  );
}
