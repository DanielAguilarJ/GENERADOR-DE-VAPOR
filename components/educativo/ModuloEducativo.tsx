'use client';

import React, { useMemo, useState } from 'react';
import type { RankineOutputs } from '@/utils/thermodynamics/rankine';

export interface ModuloEducativoProps {
  outputs: RankineOutputs | null;
}

type SectionId = 'fresnel' | 'rankine' | 'primera-ley' | 'comparacion' | 'glosario';

function MiniEquipo({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 180 80" className="h-16 w-full rounded border border-[var(--color-border)] bg-[#0d1117]">
      <rect x="16" y="18" width="148" height="44" rx="8" fill="#161b22" stroke="#30363d" />
      <path d="M0 40H16M164 40H180" stroke="#f0a500" strokeWidth="3" />
      <text x="90" y="45" textAnchor="middle" fill="#e6edf3" fontSize="12" fontWeight="700">
        {title}
      </text>
    </svg>
  );
}

export function ModuloEducativo({ outputs }: ModuloEducativoProps) {
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    fresnel: true,
    rankine: true,
    'primera-ley': false,
    comparacion: false,
    glosario: false,
  });

  const mDot = useMemo(() => {
    if (!outputs) return 0;
    const dH = outputs.estado_2.H - outputs.estado_1.H;
    return Math.abs(dH) > 1e-6 ? outputs.Q_caldera_kW / dH : 0;
  }, [outputs]);

  const sections: Array<{ id: SectionId; title: string; content: React.ReactNode }> = [
    {
      id: 'fresnel',
      title: '¿Qué es el sistema Fresnel?',
      content: (
        <div className="space-y-2 text-sm text-[var(--color-text)]">
          <p>
            Un campo Fresnel lineal concentra la radiación solar directa en un tubo receptor mediante filas de espejos planos o
            casi planos. Es una arquitectura modular y de menor costo estructural frente a grandes espejos parabólicos.
          </p>
          <p>
            Comparado con canal parabólico: menor costo en espejos y soporte, aunque con pérdidas ópticas algo mayores.
            Comparado con torre central: más simple de operar y mantener, ideal para rangos de media temperatura.
          </p>
          <p>
            Ventajas clave: mantenimiento sencillo, escalabilidad por filas, y buena integración con generación de vapor para ciclos Rankine.
          </p>
        </div>
      ),
    },
    {
      id: 'rankine',
      title: 'El Ciclo Rankine — Los 4 Procesos',
      content: outputs ? (
        <div className="space-y-4 text-sm text-[var(--color-text)]">
          <div className="rounded-xl border border-[var(--color-border)] bg-[#10151c] p-3">
            <MiniEquipo title="Caldera Solar (1→2)" />
            <p className="mt-2">Según Felder Ej. 7.6-1: Q̇ = ΔḢ = ṁ·(Ĥ₂ - Ĥ₁)</p>
            <p className="font-mono-data text-[var(--color-solar)]">
              Q̇ = {mDot.toFixed(2)} kg/s × ({outputs.estado_2.H.toFixed(1)} - {outputs.estado_1.H.toFixed(1)}) kJ/kg = {outputs.Q_caldera_kW.toFixed(1)} kW
            </p>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[#10151c] p-3">
            <MiniEquipo title="Turbina (2→3)" />
            <p className="mt-2">Según Felder Ej. 7.5-3: Proceso adiabático</p>
            <p>Ẇs = -ΔḢ = -ṁ·(Ĥ₃ - Ĥ₂) = ṁ·(Ĥ₂ - Ĥ₃)</p>
            <p className="font-mono-data text-[var(--color-solar)]">
              Ẇs = {mDot.toFixed(2)} × ({outputs.estado_2.H.toFixed(1)} - {outputs.estado_3.H.toFixed(1)}) = {outputs.W_turbina_kW.toFixed(1)} kW
            </p>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[#10151c] p-3">
            <MiniEquipo title="Condensador (3→4)" />
            <p className="mt-2">Q̇_rechazado = ṁ·(Ĥ₃ - Ĥ₄)</p>
            <p className="font-mono-data text-[var(--color-solar)]">Q̇_rechazado = {outputs.Q_condensador_kW.toFixed(1)} kW</p>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[#10151c] p-3">
            <MiniEquipo title="Bomba (4→1)" />
            <p className="mt-2">Cap. 7.7 Felder — fluido incompresible:</p>
            <p>Ẇs = ṁ·V̂·(P₁-P₄)/η</p>
            <p className="font-mono-data text-[var(--color-solar)]">Ẇs = {outputs.W_bomba_kW.toFixed(2)} kW</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">Ejecuta el simulador para mostrar los valores actuales.</p>
      ),
    },
    {
      id: 'primera-ley',
      title: 'Primera Ley de la Termodinámica',
      content: outputs ? (
        <div className="space-y-2 text-sm text-[var(--color-text)]">
          <p className="font-mono-data text-base">ΔḢ + ΔĖk + ΔĖp = Q̇ - Ẇs</p>
          <p>Para esta planta en régimen estacionario: ΔĖk ≈ 0, ΔĖp ≈ 0.</p>
          <p className="font-mono-data">Q_caldera = W_turbina - W_bomba + Q_condensador</p>
          <p className="font-mono-data text-[var(--color-solar)]">
            {outputs.Q_caldera_kW.toFixed(2)} kW ≈ {(outputs.W_turbina_kW - outputs.W_bomba_kW + outputs.Q_condensador_kW).toFixed(2)} kW
          </p>
          <p>
            Error de cierre: <strong>{outputs.balance_error_pct.toFixed(4)}%</strong>
          </p>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">No hay resultados para verificar el balance.</p>
      ),
    },
    {
      id: 'comparacion',
      title: 'Comparación: Solar Fresnel vs Carbón vs Gas',
      content: (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-[var(--color-text)]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                <th className="px-2 py-2 text-left">Tecnología</th>
                <th className="px-2 py-2 text-right">Eficiencia neta</th>
                <th className="px-2 py-2 text-right">Costo relativo</th>
                <th className="px-2 py-2 text-right">CO₂ (kg/kWh)</th>
                <th className="px-2 py-2 text-right">Agua requerida</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--color-border)]">
                <td className="px-2 py-2">Solar Fresnel</td>
                <td className="px-2 py-2 text-right">12-28%</td>
                <td className="px-2 py-2 text-right">Medio</td>
                <td className="px-2 py-2 text-right">0.02-0.08</td>
                <td className="px-2 py-2 text-right">Baja-Media</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="px-2 py-2">Carbón</td>
                <td className="px-2 py-2 text-right">33-42%</td>
                <td className="px-2 py-2 text-right">Bajo (CAPEX)</td>
                <td className="px-2 py-2 text-right">0.8-1.0</td>
                <td className="px-2 py-2 text-right">Alta</td>
              </tr>
              <tr>
                <td className="px-2 py-2">Gas Natural</td>
                <td className="px-2 py-2 text-right">45-60%</td>
                <td className="px-2 py-2 text-right">Medio</td>
                <td className="px-2 py-2 text-right">0.35-0.5</td>
                <td className="px-2 py-2 text-right">Media</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: 'glosario',
      title: 'Glosario de Términos',
      content: (
        <div className="grid gap-2 text-sm text-[var(--color-text)] md:grid-cols-2">
          <p><strong>DNI:</strong> Irradiancia normal directa incidente sobre una superficie normal al sol.</p>
          <p><strong>Entalpía (Ĥ):</strong> Energía específica total útil para balances de flujo.</p>
          <p><strong>Entropía (Ŝ):</strong> Medida de dispersión energética y dirección de irreversibilidades.</p>
          <p><strong>Ciclo Rankine:</strong> Ciclo de potencia con caldera, turbina, condensador y bomba.</p>
          <p><strong>Título de vapor (x):</strong> Fracción másica de vapor en una mezcla líquido-vapor.</p>
          <p><strong>Eficiencia isentrópica:</strong> Relación entre desempeño real e ideal de turbina/bomba.</p>
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-base font-semibold text-[var(--color-text)]">Módulo Educativo</h2>
      {sections.map((s) => (
        <div key={s.id} className="rounded-xl border border-[var(--color-border)] bg-[#10151c]">
          <button
            type="button"
            onClick={() => setOpen((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <span className="text-sm font-semibold text-[var(--color-text)]">{s.title}</span>
            <span className="text-xs text-[var(--color-muted)]">{open[s.id] ? '−' : '+'}</span>
          </button>
          {open[s.id] && <div className="border-t border-[var(--color-border)] px-3 py-3">{s.content}</div>}
        </div>
      ))}
    </section>
  );
}
