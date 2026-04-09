'use client';

import React, { useMemo } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { calcularSensibilidad, type RankineInputs } from '@/utils/thermodynamics/rankine';

export interface SensibilidadChartProps {
  baseInputs: RankineInputs;
}

const DNI_RANGE = [400, 500, 600, 700, 800, 900, 1000, 1100];
const T_VAPORES = [300, 380, 450, 550];
const COLORS: Record<number, string> = {
  300: '#58a6ff',
  380: '#f0a500',
  450: '#e07b39',
  550: '#d94f3d',
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export function SensibilidadChart({ baseInputs }: SensibilidadChartProps) {
  const data = useMemo(() => calcularSensibilidad(baseInputs, DNI_RANGE, T_VAPORES), [baseInputs]);

  const chartData = {
    labels: DNI_RANGE,
    datasets: T_VAPORES.map((Tv) => ({
      label: `${Tv}°C`,
      data: data[Tv],
      borderColor: COLORS[Tv],
      backgroundColor: COLORS[Tv],
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.24,
    })),
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e6edf3',
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => `${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)} kW`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'DNI [W/m²]', color: '#e6edf3' },
        ticks: { color: '#8b949e' },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
      y: {
        title: { display: true, text: 'Potencia Neta [kW]', color: '#e6edf3' },
        ticks: { color: '#8b949e' },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
    },
  };

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Sensibilidad: Potencia Neta vs DNI</h3>
      <div className="h-[320px] rounded-xl border border-[var(--color-border)] bg-[#0d1117] p-2">
        <Line data={chartData} options={options} />
      </div>
    </section>
  );
}
