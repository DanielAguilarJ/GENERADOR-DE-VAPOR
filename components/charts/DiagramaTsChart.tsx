'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  type ChartOptions,
  Filler,
  Legend,
  type LegendItem,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type TooltipItem,
  type Plugin,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import type { RankineOutputs } from '@/utils/thermodynamics/rankine';
import { getSatProps, getTsatFromP } from '@/utils/thermodynamics/properties';

export interface DiagramaTsChartProps {
  outputs: RankineOutputs | null;
}

interface Pt {
  x: number;
  y: number;
}

ChartJS.register(LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const stateLabelPlugin: Plugin<'scatter'> = {
  id: 'stateLabelPlugin',
  afterDatasetsDraw(chart) {
    const stateDatasetIdx = chart.data.datasets.findIndex((d) => d.label === 'Estados 1-4');
    if (stateDatasetIdx < 0) return;
    const meta = chart.getDatasetMeta(stateDatasetIdx);
    const ctx = chart.ctx;

    ctx.save();
    ctx.fillStyle = '#f0a500';
    ctx.font = 'bold 11px JetBrains Mono';
    meta.data.forEach((point, i) => {
      ctx.fillText(`${i + 1}`, point.x + 7, point.y - 7);
    });
    ctx.restore();
  },
};

ChartJS.register(stateLabelPlugin);

export function DiagramaTsChart({ outputs }: DiagramaTsChartProps) {
  const sat = useMemo(() => {
    const temps = Array.from({ length: 38 }, (_, i) => i * 10);
    const left: Pt[] = temps.map((T) => {
      const p = getSatProps(T);
      return { x: p.Sl, y: T };
    });
    const right: Pt[] = temps.map((T) => {
      const p = getSatProps(T);
      return { x: p.Sv, y: T };
    });
    return { left, right };
  }, []);

  if (!outputs) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Diagrama T-s</h3>
        <p className="text-sm text-[var(--color-muted)]">Esperando resultados para trazar el ciclo.</p>
      </section>
    );
  }

  const states = [outputs.estado_1, outputs.estado_2, outputs.estado_3, outputs.estado_4];
  const cyclePts: Pt[] = states.map((s) => ({ x: s.S, y: s.T }));
  const cycleClosed = [...cyclePts, cyclePts[0]];

  const refPressures = [0.1, 1, 10, 40].map((P) => ({
    label: `P=${P} bar`,
    points: [
      { x: 0.2, y: getTsatFromP(P) },
      { x: 9.4, y: getTsatFromP(P) },
    ],
  }));

  const data = {
    datasets: [
      {
        label: 'Saturación líquida',
        data: sat.left,
        showLine: true,
        borderColor: 'rgba(220,220,220,0.55)',
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Saturación vapor',
        data: sat.right,
        showLine: true,
        borderColor: 'rgba(220,220,220,0.55)',
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Ciclo Rankine',
        data: cycleClosed,
        showLine: true,
        borderColor: '#f0a500',
        backgroundColor: 'rgba(240,165,0,0.18)',
        borderWidth: 2.5,
        pointRadius: 0,
        fill: true,
      },
      {
        label: 'Estados 1-4',
        data: cyclePts,
        pointRadius: 5,
        pointHoverRadius: 6,
        pointBackgroundColor: '#0d1117',
        pointBorderColor: '#f0a500',
        pointBorderWidth: 2,
        showLine: false,
      },
      ...refPressures.map((r) => ({
        label: r.label,
        data: r.points,
        showLine: true,
        borderColor: 'rgba(88,166,255,0.28)',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
      })),
    ],
  };

  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e6edf3',
          filter: (item: LegendItem) => !item.text.startsWith('P='),
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'scatter'>) => {
            const x = ctx.parsed.x ?? 0;
            const y = ctx.parsed.y ?? 0;
            return `${ctx.dataset.label}: S=${x.toFixed(3)}, T=${y.toFixed(1)}°C`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        min: 0,
        max: 9.5,
        title: {
          display: true,
          text: 'Entropía específica Ŝ [kJ/(kg·K)]',
          color: '#e6edf3',
        },
        ticks: { color: '#8b949e' },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
      y: {
        min: 0,
        max: 450,
        title: {
          display: true,
          text: 'Temperatura T [°C]',
          color: '#e6edf3',
        },
        ticks: { color: '#8b949e' },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
    },
  };

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Diagrama T-s del Ciclo Rankine</h3>
      <div className="h-[360px] rounded-xl border border-[var(--color-border)] bg-[#0d1117] p-2">
        <Scatter data={data} options={options} />
      </div>
    </section>
  );
}
