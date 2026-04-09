'use client';

import React, { useMemo, useState } from 'react';
import type { RankineInputs, RankineOutputs } from '@/utils/thermodynamics/rankine';

export interface Escenario {
  id: number;
  nombre: string;
  inputs: RankineInputs;
  outputs: RankineOutputs;
  timestamp: Date;
}

export interface ExportPanelProps {
  outputs: RankineOutputs | null;
  inputs: RankineInputs;
  escenarios?: Escenario[];
  onGuardarEscenario?: () => void;
  onCargarEscenario?: (id: number) => void;
  onEliminarEscenario?: (id: number) => void;
}

export function ExportPanel({
  outputs,
  inputs,
  escenarios = [],
  onGuardarEscenario,
  onCargarEscenario,
  onEliminarEscenario,
}: ExportPanelProps) {
  const [copiado, setCopiado] = useState(false);

  const tsv = useMemo(() => {
    if (!outputs) return '';
    const rows = [outputs.estado_1, outputs.estado_2, outputs.estado_3, outputs.estado_4];
    const header = ['Estado', 'T (°C)', 'P (bar)', 'H (kJ/kg)', 'S (kJ/kg·K)', 'Fase'];
    const body = rows.map((r) => [r.numero, r.T.toFixed(2), r.P_bar.toFixed(3), r.H.toFixed(2), r.S.toFixed(4), r.fase].join('\t'));
    return [header.join('\t'), ...body].join('\n');
  }, [outputs]);

  const copyTSV = async () => {
    if (!tsv) return;
    await navigator.clipboard.writeText(tsv);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1200);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-base font-semibold text-[var(--color-text)]">Exportar y Escenarios</h2>

      <div className="grid gap-2 md:grid-cols-3 no-print">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-[var(--color-border)] bg-[#10151c] px-3 py-2 text-sm text-[var(--color-text)] hover:border-[var(--color-solar)]"
        >
          📄 Imprimir Reporte
        </button>
        <button
          type="button"
          onClick={copyTSV}
          disabled={!outputs}
          className="rounded-lg border border-[var(--color-border)] bg-[#10151c] px-3 py-2 text-sm text-[var(--color-text)] enabled:hover:border-[var(--color-solar)] disabled:opacity-50"
        >
          {copiado ? '✅ Tabla Copiada' : '📋 Copiar Tabla'}
        </button>
        <button
          type="button"
          onClick={() => onGuardarEscenario?.()}
          disabled={!outputs || !onGuardarEscenario}
          className="rounded-lg border border-[var(--color-border)] bg-[#10151c] px-3 py-2 text-sm text-[var(--color-text)] enabled:hover:border-[var(--color-success)] disabled:opacity-50"
        >
          💾 Guardar como Escenario
        </button>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[#10151c] p-3">
        <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Resumen actual</h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-[var(--color-text)] md:grid-cols-4">
          <p className="font-mono-data">DNI: {inputs.DNI.toFixed(1)} W/m²</p>
          <p className="font-mono-data">T_vapor: {inputs.T_vapor_C.toFixed(1)} °C</p>
          <p className="font-mono-data">P_alta: {inputs.P_alta_bar.toFixed(2)} bar</p>
          <p className="font-mono-data">ṁ: {inputs.m_dot.toFixed(2)} kg/s</p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Escenarios guardados (máx. 3)</h3>
        {escenarios.length === 0 && <p className="text-sm text-[var(--color-muted)]">No hay escenarios guardados.</p>}

        <div className="grid gap-2 md:grid-cols-3">
          {escenarios.map((esc) => (
            <article key={esc.id} className="rounded-xl border border-[var(--color-border)] bg-[#10151c] p-3 text-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h4 className="font-semibold text-[var(--color-text)]">{esc.nombre}</h4>
                <button
                  type="button"
                  onClick={() => onEliminarEscenario?.(esc.id)}
                  className="rounded px-2 py-0.5 text-xs text-red-300 hover:bg-red-500/20"
                >
                  ×
                </button>
              </div>
              <p className="font-mono-data text-xs text-[var(--color-muted)]">{new Date(esc.timestamp).toLocaleString()}</p>
              <p className="mt-2 font-mono-data text-[var(--color-text)]">W_neta: {esc.outputs.W_neta_kW.toFixed(1)} kW</p>
              <p className="font-mono-data text-[var(--color-text)]">η_total: {esc.outputs.eta_total.toFixed(2)} %</p>
              <button
                type="button"
                onClick={() => onCargarEscenario?.(esc.id)}
                className="mt-2 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text)] hover:border-[var(--color-solar)]"
              >
                Cargar
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="print-only hidden rounded-lg border border-gray-300 p-3 text-sm text-black">
        <h3 className="mb-1 font-semibold">Reporte de ciclo Rankine</h3>
        <p>Potencia neta: {outputs?.W_neta_kW.toFixed(2) ?? 'N/A'} kW</p>
        <p>Eficiencia total: {outputs?.eta_total.toFixed(2) ?? 'N/A'} %</p>
      </div>
    </section>
  );
}
