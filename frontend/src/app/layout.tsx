import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { LenisProvider } from "@/components/providers/LenisProvider";
import { AppShell } from "@/components/layout/AppShell";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Regate — HRRP Penalty Intelligence",
  description:
    "Predict, benchmark and reduce Medicare readmission penalties with model-driven hospital analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-black font-sans text-white antialiased">
        <QueryProvider>
          <LenisProvider>
            <AppShell>{children}</AppShell>
          </LenisProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
