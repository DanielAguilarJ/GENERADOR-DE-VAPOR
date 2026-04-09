'use client';

import React from 'react';
import type { RankineOutputs } from '@/utils/thermodynamics/rankine';

export interface BalancePanelProps {
  outputs: RankineOutputs | null;
}

function formatSigned(value: number): string {
  const sign = value >= 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
}

export function BalancePanel({ outputs }: BalancePanelProps) {
  if (!outputs) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-[var(--color-muted)]">Sin resultados para balance energético.</p>
      </section>
    );
  }

  const error = outputs.balance_error_pct;
  const badgeClass = error < 0.1 ? 'bg-green-500/20 text-green-300' : error < 1 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300';

  const rhs = outputs.W_turbina_kW - outputs.W_bomba_kW + outputs.Q_condensador_kW;
  const dHCaldera = outputs.estado_2.H - outputs.estado_1.H;
  const mDot = Math.abs(dHCaldera) > 1e-6 ? outputs.Q_caldera_kW / dHCaldera : 0;

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="mb-1 text-base font-semibold text-[var(--color-text)]">Balance de Energía por Equipo</h2>
      <p className="text-sm text-[var(--color-muted)]">Aplicando Felder Ec. 7.4-15: ΔḢ + ΔĖk + ΔĖp = Q̇ - Ẇs</p>
      <p className="mb-4 text-sm text-[var(--color-muted)]">(Despreciamos Ek y Ep para cada equipo en estado estacionario)</p>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[#0f141c] text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Equipo</th>
              <th className="px-3 py-2 text-left">Ecuación Felder</th>
              <th className="px-3 py-2 text-right">Valor (kW)</th>
            </tr>
          </thead>
          <tbody className="font-mono-data">
            <tr className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2 text-[var(--color-text)]">Caldera Solar</td>
              <td className="px-3 py-2 text-[var(--color-text)]">Q̇ = ṁ·(Ĥ₂-Ĥ₁)</td>
              <td className="px-3 py-2 text-right text-[var(--color-text)]">{formatSigned(outputs.Q_caldera_kW)}</td>
            </tr>
            <tr className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2 text-[var(--color-text)]">Turbina</td>
              <td className="px-3 py-2 text-[var(--color-text)]">Ẇs = ṁ·(Ĥ₂-Ĥ₃) [adiab.]</td>
              <td className="px-3 py-2 text-right text-[var(--color-text)]">{formatSigned(outputs.W_turbina_kW)}</td>
            </tr>
            <tr className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2 text-[var(--color-text)]">Condensador</td>
              <td className="px-3 py-2 text-[var(--color-text)]">|Q̇| = ṁ·(Ĥ₃-Ĥ₄)</td>
              <td className="px-3 py-2 text-right text-[var(--color-text)]">{formatSigned(-outputs.Q_condensador_kW)}</td>
            </tr>
            <tr className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2 text-[var(--color-text)]">Bomba</td>
              <td className="px-3 py-2 text-[var(--color-text)]">Ẇs = ṁ·V̂·ΔP/η</td>
              <td className="px-3 py-2 text-right text-[var(--color-text)]">{formatSigned(-outputs.W_bomba_kW)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[#10151d] p-3">
        <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Verificación 1ra Ley</h3>
        <p className="text-sm text-[var(--color-text)]">✓ Balance de materia: ṁ = {mDot.toFixed(2)} kg/s (estado estacionario)</p>
        <p className="text-sm text-[var(--color-text)]">✓ Balance energía: Q_caldera = W_turbina - W_bomba + Q_condensador</p>
        <p className="mt-1 font-mono-data text-sm text-[var(--color-muted)]">
          {outputs.Q_caldera_kW.toFixed(2)} kW ≈ {rhs.toFixed(2)} kW ± {error.toFixed(4)}%
        </p>
        <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}>
          Error de balance: {error.toFixed(4)}%
        </span>
      </div>
    </section>
  );
}
