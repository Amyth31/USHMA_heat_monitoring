"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

// --- Types ---

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  baseSize: number;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

interface MouseState {
  x: number;
  y: number;
  isActive: boolean;
}

interface RampTokens {
  ambient: string;
  safe: string;
  caution: string;
  moderate: string;
  high: string;
  extreme: string;
  ember: string;
}

// Fallback values mirror app/globals.css — used only if computed styles
// aren't available (e.g. during the very first paint).
const FALLBACK_TOKENS: RampTokens = {
  ambient: "#5c6b82",
  safe: "#2f9e74",
  caution: "#c9a227",
  moderate: "#d97b3f",
  high: "#c2453f",
  extreme: "#8a1f3b",
  ember: "#d97b3f",
};

// --- Tuning ---

const PARTICLE_DENSITY = 0.00009; // heat-field points per px^2
const EMBER_DENSITY = 0.00003; // ambient drifting dust per px^2
const HEAT_RADIUS = 190; // px — how far cursor "heat" reaches
const RETURN_SPEED = 0.045; // spring constant back to origin — slow & measured
const DAMPING = 0.9; // velocity decay
const REPEL_STRENGTH = 0.5;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const bigint = parseInt(clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Walks a 0..1 value across an ordered list of hex stops. */
function rampColor(stops: string[], t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const segments = stops.length - 1;
  const scaled = clamped * segments;
  const idx = Math.min(segments - 1, Math.floor(scaled));
  const localT = scaled - idx;
  const [r1, g1, b1] = hexToRgb(stops[idx]);
  const [r2, g2, b2] = hexToRgb(stops[idx + 1]);
  return [
    Math.round(lerp(r1, r2, localT)),
    Math.round(lerp(g1, g2, localT)),
    Math.round(lerp(b1, b2, localT)),
  ];
}

function readTokens(): RampTokens {
  if (typeof window === "undefined") return FALLBACK_TOKENS;
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const v = styles.getPropertyValue(name).trim();
    return v.length > 0 ? v : fallback;
  };
  return {
    ambient: read("--text-tertiary", FALLBACK_TOKENS.ambient),
    safe: read("--risk-safe", FALLBACK_TOKENS.safe),
    caution: read("--risk-caution", FALLBACK_TOKENS.caution),
    moderate: read("--risk-moderate", FALLBACK_TOKENS.moderate),
    high: read("--risk-high", FALLBACK_TOKENS.high),
    extreme: read("--risk-extreme", FALLBACK_TOKENS.extreme),
    ember: read("--accent", FALLBACK_TOKENS.ember),
  };
}

function HeatFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const particlesRef = useRef<Particle[]>([]);
  const embersRef = useRef<EmberParticle[]>([]);
  const mouseRef = useRef<MouseState>({ x: -1000, y: -1000, isActive: false });
  const tokensRef = useRef<RampTokens>(FALLBACK_TOKENS);
  const frameIdRef = useRef<number>(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    tokensRef.current = readTokens();
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function initField(width: number, height: number) {
      const count = Math.floor(width * height * PARTICLE_DENSITY);
      const points: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        points.push({
          x,
          y,
          originX: x,
          originY: y,
          vx: 0,
          vy: 0,
          baseSize: Math.random() * 0.9 + 1,
        });
      }
      particlesRef.current = points;

      const emberCount = Math.floor(width * height * EMBER_DENSITY);
      const embers: EmberParticle[] = [];
      for (let i = 0; i < emberCount; i++) {
        embers.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.12,
          vy: -Math.random() * 0.15 - 0.03,
          size: Math.random() * 1.1 + 0.4,
          alpha: Math.random() * 0.25 + 0.08,
          phase: Math.random() * Math.PI * 2,
        });
      }
      embersRef.current = embers;
    }

    function drawStaticFrame() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const [r, g, b] = hexToRgb(tokensRef.current.ambient);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
      for (const p of particlesRef.current) {
        ctx.beginPath();
        ctx.arc(p.originX, p.originY, p.baseSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function animate(time: number) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const tokens = tokensRef.current;
      const rampStops = [tokens.safe, tokens.caution, tokens.moderate, tokens.high, tokens.extreme];
      const [ar, ag, ab] = hexToRgb(tokens.ambient);
      const [er, eg, eb] = hexToRgb(tokens.ember);
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.width / dpr;
      const cssHeight = canvas.height / dpr;

      // Ambient drifting embers, behind the main field.
      for (const p of embersRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) p.y = cssHeight + 10;
        if (p.x < -10) p.x = cssWidth + 10;
        if (p.x > cssWidth + 10) p.x = -10;

        const twinkle = Math.sin(time * 0.0015 + p.phase) * 0.5 + 0.5;
        ctx.globalAlpha = p.alpha * (0.4 + 0.6 * twinkle);
        ctx.fillStyle = `rgb(${er}, ${eg}, ${eb})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Main heat field.
      const mouse = mouseRef.current;
      for (const p of particlesRef.current) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (mouse.isActive && distance < HEAT_RADIUS && distance > 0.01) {
          const force = ((HEAT_RADIUS - distance) / HEAT_RADIUS) * REPEL_STRENGTH;
          p.vx -= (dx / distance) * force;
          p.vy -= (dy / distance) * force;
        }

        p.vx += (p.originX - p.x) * RETURN_SPEED;
        p.vy += (p.originY - p.y) * RETURN_SPEED;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        // Heat level: 0 at the edge of the cursor's radius, 1 right at the cursor —
        // the closer you are, the further up the real risk ramp the particle climbs.
        const heat = mouse.isActive && distance < HEAT_RADIUS
          ? 1 - distance / HEAT_RADIUS
          : 0;

        let rr = ar, gg = ag, bb = ab;
        if (heat > 0) {
          [rr, gg, bb] = rampColor(rampStops, heat);
        }
        const alpha = 0.35 + heat * 0.65;
        const size = p.baseSize + heat * 1.6;

        ctx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      frameIdRef.current = requestAnimationFrame(animate);
    }

    function handleResize() {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const { width, height } = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      initField(width, height);
      if (reducedMotionRef.current) drawStaticFrame();
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    if (!reducedMotionRef.current) {
      frameIdRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameIdRef.current);
    };
  }, []);

  const setMouseFromClient = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = { x: clientX - rect.left, y: clientY - rect.top, isActive: true };
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      onMouseMove={(e) => setMouseFromClient(e.clientX, e.clientY)}
      onMouseLeave={() => (mouseRef.current.isActive = false)}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        if (touch) setMouseFromClient(touch.clientX, touch.clientY);
      }}
      onTouchEnd={() => (mouseRef.current.isActive = false)}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

export default function HeatFieldHero() {
  return (
    <section
      className="relative border-b overflow-hidden"
      style={{ borderColor: "var(--border-hairline)", background: "var(--bg-void)" }}
    >
      <div className="relative min-h-screen flex flex-col">
        <HeatFieldCanvas />

        {/* Minimal transparent nav, local to the hero — brand mark only */}
        <div className="relative z-20 max-w-6xl mx-auto w-full px-6 py-6 flex items-center">
          <div className="flex items-baseline gap-3">
            <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--text-primary)" }}>
              USHMA
            </span>
            <span className="hidden md:inline text-xs" style={{ color: "var(--text-tertiary)" }}>
              Unified System for Heat Monitoring &amp; Analytics
            </span>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
          <span
            className="inline-block mb-8 py-1.5 px-4 rounded-full border text-xs font-mono"
            style={{ borderColor: "var(--border-hairline-strong)", color: "var(--text-secondary)", background: "color-mix(in srgb, var(--bg-panel) 60%, transparent)" }}
          >
            Hyperlocal heat-health early warning
          </span>

          <h1
            className="text-7xl md:text-9xl lg:text-[10rem] font-bold tracking-tight leading-none mb-6 bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(to bottom, var(--text-primary), var(--text-tertiary))" }}
          >
            USHMA
          </h1>

          <p
            className="text-lg md:text-2xl font-medium max-w-2xl mb-6"
            style={{ color: "var(--text-secondary)" }}
          >
            Heat doesn&apos;t kill because of temperature alone.
          </p>

          <p
            className="max-w-xl text-sm md:text-base leading-relaxed mb-10"
            style={{ color: "var(--text-tertiary)" }}
          >
            Weather intelligence, thermal stress modelling and real population
            vulnerability data, combined into hyperlocal heat-health early warning.
            District-level depth in India, country-level everywhere else.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pointer-events-auto">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-sm)] font-medium text-sm transition-transform duration-150 hover:scale-[1.03]"
              style={{ background: "var(--accent)", color: "var(--bg-void)" }}
            >
              Enter Command Centre
              <svg
                className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 8h11M8.5 3.5 13 8l-4.5 4.5" />
              </svg>
            </Link>
            <Link
              href="/risk-map"
              className="px-6 py-3 rounded-[var(--radius-sm)] font-medium text-sm border transition-colors duration-150 hover:bg-[var(--bg-panel)]"
              style={{ borderColor: "var(--border-hairline-strong)", color: "var(--text-primary)" }}
            >
              View risk map
            </Link>
          </div>
        </div>

        <div className="h-16" />
      </div>
    </section>
  );
}