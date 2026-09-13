import type { Metadata } from "next";
import { Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "USHMA — Unified System for Heat Monitoring & Analytics",
  description:
    "HeatShield / USHMA combines weather intelligence, thermal stress modelling, real population vulnerability and health-risk estimation for hyperlocal heatwave early warning — India at real district-level depth, and every other country using real country-level data. Built for Smart India Hackathon 2026, Problem Statement 26083.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${publicSans.variable} ${plexMono.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
