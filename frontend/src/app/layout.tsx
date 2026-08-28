import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageTransition } from "@/components/providers/PageTransition";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Regate",
  description: "Hospital penalty prediction platform for healthcare administrators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable}`}>
      <body className="bg-navy text-white/70 antialiased">
        <div className="min-h-screen bg-navy">
          <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
          <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,212,255,0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(255,77,109,0.08),_transparent_26%)]" />
          <Sidebar />
          <QueryProvider>
            <main className="relative min-h-screen pb-8 md:pl-[240px]">
              <PageTransition>{children}</PageTransition>
            </main>
          </QueryProvider>
        </div>
      </body>
    </html>
  );
}
