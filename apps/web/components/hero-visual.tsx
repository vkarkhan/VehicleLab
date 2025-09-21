"use client";

import { useMemo } from "react";

function createGradientId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function HeroVisual() {
  const { shineId, bodyId } = useMemo(() => ({
    shineId: createGradientId("hero-shine"),
    bodyId: createGradientId("hero-body")
  }), []);

  return (
    <div className="hero-visual relative aspect-video w-full overflow-hidden rounded-[1.75rem] border border-slate-200/60 bg-white/[0.97] shadow-[0_42px_120px_-48px_rgba(79,70,229,0.65)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/70">
      <div className="hero-visual__ambient" aria-hidden />
      <div className="hero-visual__glow" aria-hidden />
      <svg
        className="hero-visual__svg"
        viewBox="0 0 640 360"
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id={shineId} cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="45%" stopColor="rgba(129,140,248,0.18)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0.0)" />
          </radialGradient>
          <linearGradient id={bodyId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="45%" stopColor="rgba(226,232,255,0.85)" />
            <stop offset="100%" stopColor="rgba(129,140,248,0.92)" />
          </linearGradient>
          <filter id="gloss" x="-20%" y="-30%" width="140%" height="160%" filterUnits="objectBoundingBox">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.7" />
            </feComponentTransfer>
          </filter>
        </defs>

        <rect x="0" y="0" width="640" height="360" fill={`url(#${shineId})`} opacity="0.8" />

        <g className="hero-visual__grid">
          {Array.from({ length: 9 }).map((_, index) => {
            const x = 40 + index * 70;
            return <line key={`v-${index}`} x1={x} y1={80} x2={x - 32} y2={320} />;
          })}
          {Array.from({ length: 7 }).map((_, index) => {
            const y = 80 + index * 36;
            return <line key={`h-${index}`} x1={20} y1={y} x2={620} y2={y + 18} />;
          })}
        </g>

        <g className="hero-visual__vehicle" filter="url(#gloss)">
          <path
            className="hero-visual__vehicle-body"
            d="M320 120c-54 0-104 32-104 60 0 28 50 60 104 60s104-32 104-60c0-28-50-60-104-60z"
            fill={`url(#${bodyId})`}
          />
          <path
            className="hero-visual__vehicle-glass"
            d="M320 136c-30 0-60 16-60 44 0 20 24 40 60 40s60-20 60-40c0-28-30-44-60-44z"
          />
          <path
            className="hero-visual__vehicle-line"
            d="M320 132c-2 0-4 0.5-4 4v88c0 3.5 2 4 4 4s4-0.5 4-4v-88c0-3.5-2-4-4-4z"
          />
          <g className="hero-visual__vehicle-fins">
            <path d="M236 173c-13 9-28 30-30 46 30-2 64-24 76-42l-46-4z" />
            <path d="M404 173c13 9 28 30 30 46-30-2-64-24-76-42l46-4z" />
          </g>
        </g>

        <g className="hero-visual__trail">
          <path d="M120 280c64-34 140-54 200-54s148 20 200 54" />
          <path d="M140 304c64-28 136-46 180-46s116 18 180 46" />
        </g>
      </svg>

      <div className="hero-visual__hud" aria-hidden>
        <span className="hero-visual__hud-pill">Yaw rate +2.1deg/s</span>
        <span className="hero-visual__hud-pill">Slip angle 4.2deg</span>
        <span className="hero-visual__hud-pill hero-visual__hud-pill--accent">Lateral accel 1.15 g</span>
      </div>
    </div>
  );
}

export default HeroVisual;
