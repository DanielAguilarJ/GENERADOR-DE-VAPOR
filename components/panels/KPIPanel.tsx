'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { RankineOutputs } from '@/utils/thermodynamics/rankine';

export interface KPIPanelProps {
  outputs: RankineOutputs | null;
}

function useAnimatedNumber(target: number, durationMs = 600): number {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const initial = display;

    const tick = (time: number) => {
      const t = Math.min(1, (time - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(initial + (target - initial) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

function rangeClass(value: number, low: number, medium: number): string {
  if (value < low) return 'border-red-500/70';
  if (value < medium) return 'border-yellow-400/70';
  return 'border-green-500/70';
}

function CardIcon({ type }: { type: 'power' | 'eta' | 'area' | 'energy' }) {
  if (type === 'power') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M13 2L5 14h6l-1 8 9-13h-6l0-7z" fill="#f0a500" />
      </svg>
    );
  }
  if (type === 'eta') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="#58a6ff" strokeWidth="2" />
        <path d="M12 12l5-3" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'area') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="#3fb950" strokeWidth="2" />
        <path d="M8 9h8M8 13h8" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2v20M4 12h16" stroke="#f0a500" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="8" stroke="#f0a500" strokeWidth="2" />
    </svg>
  );
}

function Gauge({ valuePct }: { valuePct: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, valuePct));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth="10" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="url(#gauge-gradient)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
        <defs>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d94f3d" />
            <stop offset="55%" stopColor="#f0a500" />
            <stop offset="100%" stopColor="#3fb950" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-black text-[var(--color-text)]">{valuePct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function KPIPanel({ outputs }: KPIPanelProps) {
  const metrics = useMemo(() => {
    if (!outputs) return null;
    return {
      netPower: outputs.W_neta_kW,
      totalEta: outputs.eta_total,
      area: outputs.area_campo_m2,
      annual: outputs.energia_anual_MWh,
    };
  }, [outputs]);

  const pAnim = useAnimatedNumber(metrics?.netPower ?? 0, 700);
  const eAnim = useAnimatedNumber(metrics?.totalEta ?? 0, 700);
  const aAnim = useAnimatedNumber(metrics?.area ?? 0, 700);
  const yAnim = useAnimatedNumber(metrics?.annual ?? 0, 700);

  if (!outputs) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-[var(--color-muted)]">Esperando resultados del ciclo Rankine…</p>
      </section>
    );
  }

  return (
    <section className="space-y-3 no-print">
      <article className={`rounded-xl border bg-[var(--color-surface)] p-3 ${rangeClass(outputs.W_neta_kW, 1500, 8000)}`}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Potencia Neta</h3>
          <CardIcon type="power" />
        </div>
        <p className="font-mono-data text-3xl font-black text-[var(--color-solar)]">{pAnim.toFixed(1)} kW</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">Trabajo neto útil del ciclo</p>
      </article>

      <article className={`rounded-xl border bg-[var(--color-surface)] p-3 ${rangeClass(outputs.eta_total, 9, 18)}`}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Eficiencia Total</h3>
          <CardIcon type="eta" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Gauge valuePct={eAnim} />
          <p className="max-w-[120px] text-xs text-[var(--color-muted)]">Incluye óptica, receptor y ciclo térmico</p>
        </div>
      </article>

      <article className={`rounded-xl border bg-[var(--color-surface)] p-3 ${rangeClass(outputs.area_campo_m2, 2000, 7000)}`}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Área del Campo</h3>
          <CardIcon type="area" />
        </div>
        <p className="font-mono-data text-3xl font-black text-[var(--color-text)]">{aAnim.toFixed(0)} m²</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">Superficie efectiva de captación</p>
      </article>

      <article className={`rounded-xl border bg-[var(--color-surface)] p-3 ${rangeClass(outputs.energia_anual_MWh, 1000, 10000)}`}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Energía Anual</h3>
          <CardIcon type="energy" />
        </div>
        <p className="font-mono-data text-3xl font-black text-[var(--color-text)]">{yAnim.toFixed(1)} MWh/año</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">≈ {outputs.hogares_abastecidos} hogares abastecidos</p>
      </article>
    </section>
  );
}
