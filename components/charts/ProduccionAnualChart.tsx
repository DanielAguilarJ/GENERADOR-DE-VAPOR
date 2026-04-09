'use client';

import React, { useMemo } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
  type TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { RankineInputs, RankineOutputs } from '@/utils/thermodynamics/rankine';

export interface ProduccionAnualChartProps {
  outputs: RankineOutputs | null;
  inputs: RankineInputs;
}

const DNI_MENSUAL_FACTOR = [0.75, 0.82, 0.9, 0.95, 1.0, 0.98, 0.93, 0.9, 0.88, 0.82, 0.76, 0.72];
const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function ProduccionAnualChart({ outputs, inputs }: ProduccionAnualChartProps) {
  const data = useMemo(() => {
    const power = outputs?.W_neta_kW ?? 0;
    return MESES.map((mes, i) => {
      const valor = (power * inputs.horas_dia * DIAS_MES[i] * DNI_MENSUAL_FACTOR[i]) / 1000;
      return { mes, valor };
    });
  }, [inputs.horas_dia, outputs?.W_neta_kW]);

  const max = Math.max(1, ...data.map((d) => d.valor));
  const total = data.reduce((acc, d) => acc + d.valor, 0);

  const chartData = {
    labels: MESES,
    datasets: [
      {
        label: 'Energía mensual [MWh]',
        data: data.map((d) => d.valor),
        backgroundColor: [
          '#b56d26',
          '#bf7427',
          '#ca7c28',
          '#d48429',
          '#de8c2b',
          '#db892b',
          '#d2842a',
          '#ca7c28',
          '#c27627',
          '#ba7026',
          '#b26825',
          '#aa6224',
        ],
        borderColor: '#f0a500',
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#e6edf3' },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => `${(ctx.parsed.y ?? 0).toFixed(2)} MWh`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#8b949e' },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
      y: {
        min: 0,
        max: Math.ceil(max * 1.15),
        ticks: { color: '#8b949e' },
        grid: { color: 'rgba(255,255,255,0.08)' },
        title: { display: true, text: 'MWh', color: '#e6edf3' },
      },
    },
  };

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">
        Producción Mensual [MWh] · Total anual: {total.toFixed(1)} MWh
      </h3>

      <div className="h-[320px] rounded-xl border border-[var(--color-border)] bg-[#0d1117] p-2">
        <Bar data={chartData} options={options} />
      </div>

      <p className="mt-2 text-xs text-[var(--color-muted)]">
        Factor estacional DNI utilizado: [0.75, 0.82, 0.90, 0.95, 1.00, 0.98, 0.93, 0.90, 0.88, 0.82, 0.76, 0.72]
      </p>
    </section>
  );
}
