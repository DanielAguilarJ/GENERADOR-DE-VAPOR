'use client';

import React, { useMemo, useState } from 'react';
import type { RankineInputs } from '@/utils/thermodynamics/rankine';

export const DEFAULTS: RankineInputs = {
  n_filas: 50,
  ancho_espejo: 1.0,
  largo_fila: 100,
  DNI: 850,
  eta_optica: 0.65,
  eta_receptor: 0.85,
  T_vapor_C: 380,
  P_alta_bar: 40,
  P_cond_bar: 0.1,
  eta_turbina: 0.82,
  eta_bomba: 0.78,
  m_dot: 20,
  T_amb_C: 25,
  horas_dia: 8,
  dias_ano: 280,
};

type SectionId = 'fresnel' | 'vapor' | 'operacion';
type ParamKey = keyof RankineInputs;

interface ParamDef {
  key: ParamKey;
  symbol: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  section: SectionId;
  isPercent?: boolean;
}

const PARAMS: ParamDef[] = [
  { key: 'n_filas', symbol: 'N_filas', label: 'Número de filas', unit: '-', min: 10, max: 200, step: 5, section: 'fresnel' },
  { key: 'ancho_espejo', symbol: 'w_espejo', label: 'Ancho de espejo', unit: 'm', min: 0.5, max: 2.0, step: 0.1, section: 'fresnel' },
  { key: 'largo_fila', symbol: 'L_fila', label: 'Largo de fila', unit: 'm', min: 10, max: 500, step: 10, section: 'fresnel' },
  { key: 'DNI', symbol: 'DNI', label: 'Irradiancia normal directa', unit: 'W/m²', min: 400, max: 1100, step: 50, section: 'fresnel' },
  { key: 'eta_optica', symbol: 'η_óptica', label: 'Eficiencia óptica', unit: '%', min: 0.4, max: 0.8, step: 0.01, section: 'fresnel', isPercent: true },
  { key: 'eta_receptor', symbol: 'η_receptor', label: 'Eficiencia térmica receptor', unit: '%', min: 0.7, max: 0.95, step: 0.01, section: 'fresnel', isPercent: true },

  { key: 'T_vapor_C', symbol: 'T_vapor', label: 'Temperatura de vapor', unit: '°C', min: 200, max: 550, step: 10, section: 'vapor' },
  { key: 'P_alta_bar', symbol: 'P_alta', label: 'Presión alta', unit: 'bar', min: 5, max: 100, step: 5, section: 'vapor' },
  { key: 'P_cond_bar', symbol: 'P_cond', label: 'Presión de condensador', unit: 'bar', min: 0.05, max: 1.0, step: 0.05, section: 'vapor' },
  { key: 'eta_turbina', symbol: 'η_turbina', label: 'Eficiencia isentrópica turbina', unit: '%', min: 0.6, max: 0.95, step: 0.01, section: 'vapor', isPercent: true },
  { key: 'eta_bomba', symbol: 'η_bomba', label: 'Eficiencia bomba', unit: '%', min: 0.6, max: 0.9, step: 0.01, section: 'vapor', isPercent: true },
  { key: 'm_dot', symbol: 'ṁ', label: 'Flujo másico', unit: 'kg/s', min: 1, max: 200, step: 1, section: 'vapor' },

  { key: 'T_amb_C', symbol: 'T_amb', label: 'Temperatura ambiente', unit: '°C', min: 5, max: 45, step: 1, section: 'operacion' },
  { key: 'horas_dia', symbol: 'h_día', label: 'Horas de operación diaria', unit: 'h/día', min: 4, max: 12, step: 0.5, section: 'operacion' },
  { key: 'dias_ano', symbol: 'd_año', label: 'Días de operación anual', unit: 'd/año', min: 200, max: 365, step: 5, section: 'operacion' },
];

const SECTION_TITLES: Record<SectionId, string> = {
  fresnel: '☀️ Campo Fresnel',
  vapor: '⚡ Ciclo de Vapor',
  operacion: '🌍 Operación',
};

export interface ParametrosPanelProps {
  inputs: RankineInputs;
  onChange: (inputs: RankineInputs) => void;
}

function prettyValue(def: ParamDef, value: number): string {
  if (def.isPercent) return `${(value * 100).toFixed(1)} %`;
  if (def.step < 1) return `${value.toFixed(2)} ${def.unit}`;
  if (def.step < 10) return `${value.toFixed(1)} ${def.unit}`;
  return `${value.toFixed(0)} ${def.unit}`;
}

export function ParametrosPanel({ inputs, onChange }: ParametrosPanelProps) {
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    fresnel: true,
    vapor: true,
    operacion: false,
  });
  const [savePulse, setSavePulse] = useState(false);

  const grouped = useMemo(() => {
    return {
      fresnel: PARAMS.filter((p) => p.section === 'fresnel'),
      vapor: PARAMS.filter((p) => p.section === 'vapor'),
      operacion: PARAMS.filter((p) => p.section === 'operacion'),
    };
  }, []);

  const updateValue = (def: ParamDef, rawValue: number) => {
    const nextValue = Math.max(def.min, Math.min(def.max, rawValue));
    onChange({ ...inputs, [def.key]: nextValue });
  };

  const handleSaveScenario = () => {
    setSavePulse(true);
    window.dispatchEvent(new CustomEvent('rankine-save-scenario'));
    window.setTimeout(() => setSavePulse(false), 550);
  };

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 no-print">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--color-text)]">Parámetros de Diseño</h2>
        <span className="text-xs text-[var(--color-muted)]">15 variables</span>
      </div>

      {(['fresnel', 'vapor', 'operacion'] as SectionId[]).map((section) => (
        <div key={section} className="mb-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <button
            type="button"
            onClick={() => setOpen((prev) => ({ ...prev, [section]: !prev[section] }))}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)]"
          >
            <span>{SECTION_TITLES[section]}</span>
            <span className="text-xs text-[var(--color-muted)]">{open[section] ? '−' : '+'}</span>
          </button>

          {open[section] && (
            <div className="space-y-3 border-t border-[var(--color-border)] px-3 py-3">
              {grouped[section].map((def) => {
                const value = inputs[def.key] as number;
                const defaultValue = DEFAULTS[def.key] as number;
                const isDefault = Math.abs(value - defaultValue) <= Math.max(def.step * 0.25, 0.001);
                const inputValue = def.isPercent ? Number((value * 100).toFixed(2)) : value;

                return (
                  <div key={def.key} className="rounded-lg border border-[var(--color-border)] bg-[#11161d] p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-gray-500/70" title="Valor por defecto" hidden={!isDefault} />
                        <label className="text-xs font-medium text-[var(--color-text)]">
                          {def.symbol} · {def.label}
                        </label>
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-solar)]">{prettyValue(def, value)}</span>
                    </div>

                    <div className="grid grid-cols-[1fr_92px] gap-2">
                      <input
                        type="range"
                        min={def.min}
                        max={def.max}
                        step={def.step}
                        value={value}
                        onChange={(e) => updateValue(def, Number(e.target.value))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#273444] accent-[var(--color-solar)]"
                      />

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={def.isPercent ? def.min * 100 : def.min}
                          max={def.isPercent ? def.max * 100 : def.max}
                          step={def.isPercent ? def.step * 100 : def.step}
                          value={inputValue}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            updateValue(def, def.isPercent ? raw / 100 : raw);
                          }}
                          className="w-full rounded-md border border-[var(--color-border)] bg-[#0d1117] px-2 py-1 text-right text-xs text-[var(--color-text)] focus:border-[var(--color-solar)] focus:outline-none"
                        />
                        <span className="text-[10px] text-[var(--color-muted)]">{def.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULTS })}
          className="rounded-lg border border-[var(--color-border)] bg-[#10151c] px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-solar)] hover:text-[var(--color-solar)]"
        >
          Restaurar Defaults
        </button>
        <button
          type="button"
          onClick={handleSaveScenario}
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
            savePulse
              ? 'bg-[var(--color-success)] text-black'
              : 'border border-[var(--color-border)] bg-[#10151c] text-[var(--color-text)] hover:border-[var(--color-success)] hover:text-[var(--color-success)]'
          }`}
        >
          Guardar Escenario
        </button>
      </div>
    </section>
  );
}
