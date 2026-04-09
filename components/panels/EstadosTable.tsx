'use client';

import React from 'react';
import type { RankineOutputs } from '@/utils/thermodynamics/rankine';

export interface EstadosTableProps {
  outputs: RankineOutputs | null;
}

function rowClass(fase: string): string {
  const f = fase.toLowerCase();
  if (f.includes('subenfriada') || f.includes('líquida')) return 'bg-[rgba(26,107,154,0.2)]';
  if (f.includes('sobrecalentado')) return 'bg-[rgba(217,79,61,0.25)]';
  if (f.includes('mezcla')) return 'bg-[rgba(245,166,35,0.22)]';
  return 'bg-[rgba(224,123,57,0.2)]';
}

export function EstadosTable({ outputs }: EstadosTableProps) {
  if (!outputs) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-[var(--color-muted)]">No hay datos termodinámicos disponibles.</p>
      </section>
    );
  }

  const rows = [outputs.estado_1, outputs.estado_2, outputs.estado_3, outputs.estado_4].map((estado) => {
    if (estado.numero === 1) {
      return { ...estado, faseFmt: 'Agua líquida (→ Caldera)' };
    }
    if (estado.numero === 2) {
      return { ...estado, faseFmt: 'Vapor sobrecal. (→ Turbina)' };
    }
    if (estado.numero === 3) {
      const x = estado.calidad;
      const phase = x !== undefined ? `Mezcla x=${x.toFixed(2)} (→ Condensador)` : 'Vapor/mezcla (→ Condensador)';
      return { ...estado, faseFmt: phase };
    }
    return { ...estado, faseFmt: 'Agua líq. sat. (→ Bomba)' };
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Estados Termodinámicos del Ciclo Rankine</h2>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-[#0f141c] text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-right">T (°C)</th>
              <th className="px-3 py-2 text-right">P (bar)</th>
              <th className="px-3 py-2 text-right">Ĥ (kJ/kg)</th>
              <th className="px-3 py-2 text-right">Ŝ (kJ/kg·K)</th>
              <th className="px-3 py-2 text-left">Fase</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.numero} className={`${rowClass(row.fase)} border-t border-[var(--color-border)]`}>
                <td className="px-3 py-2 font-bold text-[var(--color-text)]">{row.numero}</td>
                <td className="px-3 py-2 text-right font-mono-data text-[var(--color-text)]">{row.T.toFixed(1)}</td>
                <td className="px-3 py-2 text-right font-mono-data text-[var(--color-text)]">{row.P_bar.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono-data text-[var(--color-text)]">{row.H.toFixed(1)}</td>
                <td className="px-3 py-2 text-right font-mono-data text-[var(--color-text)]">{row.S.toFixed(4)}</td>
                <td className="px-3 py-2 text-[var(--color-text)]">{row.faseFmt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
