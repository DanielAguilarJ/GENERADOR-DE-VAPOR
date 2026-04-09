'use client';

import React from 'react';
import type { RankineOutputs } from '@/utils/thermodynamics/rankine';

export interface SankeyChartProps {
  outputs: RankineOutputs | null;
}

const W = 760;
const H = 360;

function flowWidth(value: number, max: number): number {
  if (max <= 0) return 8;
  return Math.max(8, (value / max) * 52);
}

function node(x: number, y: number, title: string, value: number): React.ReactNode {
  return (
    <g>
      <rect x={x} y={y} width="126" height="48" rx="8" fill="#161b22" stroke="rgba(255,255,255,0.18)" />
      <text x={x + 8} y={y + 18} fontSize="11" fill="#e6edf3" fontWeight="600">
        {title}
      </text>
      <text x={x + 8} y={y + 34} fontSize="11" fill="#f0a500" className="font-mono-data">
        {value.toFixed(1)} kW
      </text>
    </g>
  );
}

export function SankeyChart({ outputs }: SankeyChartProps) {
  if (!outputs) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Diagrama de Sankey</h3>
        <p className="text-sm text-[var(--color-muted)]">Esperando resultados de energía.</p>
      </section>
    );
  }

  const qSolar = outputs.Q_solar_kW;
  const etaOpt = outputs.eta_optica_pct / 100;
  const qOptLoss = qSolar * (1 - etaOpt);
  const qRecLoss = qSolar * etaOpt - outputs.Q_util_kW;
  const maxValue = Math.max(qSolar, outputs.W_turbina_kW, outputs.Q_condensador_kW, 1);

  const wSolar = flowWidth(qSolar, maxValue);
  const wOptLoss = flowWidth(qOptLoss, maxValue);
  const wRecLoss = flowWidth(qRecLoss, maxValue);
  const wUtil = flowWidth(outputs.Q_util_kW, maxValue);
  const wTurb = flowWidth(outputs.W_turbina_kW, maxValue);
  const wCond = flowWidth(outputs.Q_condensador_kW, maxValue);
  const wPump = flowWidth(outputs.W_bomba_kW, maxValue);

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Sankey de Flujos Energéticos</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[320px] w-full rounded-xl border border-[var(--color-border)] bg-[#0d1117]">
        <defs>
          <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f0a500" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#e07b39" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d94f3d" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {node(24, 146, 'Solar Total', qSolar)}
        {node(196, 58, 'Pérd. Ópticas', qOptLoss)}
        {node(196, 228, 'Pérd. Receptor', qRecLoss)}
        {node(374, 146, 'Calor Útil', outputs.Q_util_kW)}
        {node(548, 58, 'Trabajo Turbina', outputs.W_turbina_kW)}
        {node(548, 228, 'Calor Condensador', outputs.Q_condensador_kW)}
        {node(548, 286, 'Trabajo Bomba', outputs.W_bomba_kW)}

        <path
          d="M150 170 C 176 170, 176 82, 196 82"
          stroke="url(#flow-grad)"
          strokeWidth={wOptLoss}
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M150 188 C 176 188, 176 252, 196 252"
          stroke="url(#flow-grad)"
          strokeWidth={wRecLoss}
          fill="none"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M150 179 C 252 179, 296 170, 374 170"
          stroke="url(#flow-grad)"
          strokeWidth={wSolar}
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M324 170 C 348 170, 350 170, 374 170"
          stroke="url(#flow-grad)"
          strokeWidth={wUtil}
          fill="none"
          strokeLinecap="round"
          opacity="0.95"
        />
        <path
          d="M500 164 C 520 164, 524 82, 548 82"
          stroke="url(#flow-grad)"
          strokeWidth={wTurb}
          fill="none"
          strokeLinecap="round"
          opacity="0.95"
        />
        <path
          d="M500 176 C 520 176, 524 252, 548 252"
          stroke="url(#flow-grad)"
          strokeWidth={wCond}
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M500 188 C 520 188, 524 310, 548 310"
          stroke="url(#flow-grad)"
          strokeWidth={wPump}
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    </section>
  );
}
