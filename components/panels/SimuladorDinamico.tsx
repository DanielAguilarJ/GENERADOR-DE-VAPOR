'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { RankineInputs } from '@/utils/thermodynamics/rankine';
import { getDNIHora } from '@/utils/thermodynamics/rankine';

type ModoPlanta = 'Diseño' | 'Operación' | 'Mantenimiento';

export interface SimuladorDinamicoProps {
  inputs: RankineInputs;
  onChange: (inputs: RankineInputs) => void;
  onHoraChange: (h: number) => void;
  horaSimulada?: number;
  plantaActiva?: boolean;
  onTogglePlanta?: () => void;
}

export function SimuladorDinamico({
  inputs,
  onChange,
  onHoraChange,
  horaSimulada,
  plantaActiva,
  onTogglePlanta,
}: SimuladorDinamicoProps) {
  const [hora, setHora] = useState(horaSimulada ?? 12);
  const [modo, setModo] = useState<ModoPlanta>('Operación');
  const [dniMax, setDniMax] = useState(inputs.DNI);
  const [localActiva, setLocalActiva] = useState(plantaActiva ?? true);

  const activa = plantaActiva ?? localActiva;

  useEffect(() => {
    if (horaSimulada !== undefined) setHora(horaSimulada);
  }, [horaSimulada]);

  useEffect(() => {
    if (plantaActiva !== undefined) setLocalActiva(plantaActiva);
  }, [plantaActiva]);

  useEffect(() => {
    const estimated = getDNIHora(hora, dniMax);
    if (Math.abs(inputs.DNI - estimated) > 15) {
      setDniMax(Math.max(400, inputs.DNI));
    }
  }, [inputs.DNI, hora, dniMax]);

  const dniActual = useMemo(() => {
    if (!activa) return 0;
    return getDNIHora(hora, dniMax);
  }, [activa, dniMax, hora]);

  const progress = Math.max(0, Math.min(100, (dniActual / 1100) * 100));

  const applyHour = (h: number) => {
    setHora(h);
    onHoraChange(h);
    const nextDni = activa ? getDNIHora(h, dniMax) : 0;
    onChange({ ...inputs, DNI: nextDni });
  };

  const handleToggle = () => {
    if (onTogglePlanta) {
      onTogglePlanta();
    } else {
      setLocalActiva((prev) => !prev);
    }

    const targetActive = onTogglePlanta ? !(plantaActiva ?? true) : !localActiva;
    onChange({ ...inputs, DNI: targetActive ? getDNIHora(hora, dniMax) : 0 });
  };

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 no-print">
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Simulador Dinámico</h2>

      <div className="rounded-xl border border-[var(--color-border)] bg-[#10151c] p-3">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-[var(--color-text)]">Hora del día</label>
          <span className="font-mono-data text-sm text-[var(--color-solar)]">{hora.toFixed(1)} h</span>
        </div>
        <div className="relative">
          <input
            type="range"
            min={0}
            max={24}
            step={0.25}
            value={hora}
            onChange={(e) => applyHour(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded bg-[#243040] accent-[var(--color-solar)]"
          />
          <span
            className="pointer-events-none absolute -top-5 text-base"
            style={{ left: `calc(${(hora / 24) * 100}% - 8px)` }}
            aria-hidden="true"
          >
            ☀️
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleToggle}
          className={`relative rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            activa
              ? 'border-green-500/60 bg-green-500/10 text-green-300'
              : 'border-red-500/60 bg-red-500/10 text-red-300'
          }`}
        >
          Planta {activa ? 'ON' : 'OFF'}
          <span
            className={`ml-2 inline-flex h-2.5 w-2.5 rounded-full ${activa ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
          />
        </button>

        <select
          value={modo}
          onChange={(e) => setModo(e.target.value as ModoPlanta)}
          className="rounded-lg border border-[var(--color-border)] bg-[#0d1117] px-2 py-2 text-xs text-[var(--color-text)]"
        >
          <option>Diseño</option>
          <option>Operación</option>
          <option>Mantenimiento</option>
        </select>
      </div>

      <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[#10151c] p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-[var(--color-muted)]">DNI actual</span>
          <span className="font-mono-data text-sm text-[var(--color-text)]">{dniActual.toFixed(1)} W/m²</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded bg-[#243040]">
          <div
            className="h-full bg-gradient-to-r from-[#f0a500] via-[#e07b39] to-[#d94f3d] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-[var(--color-muted)]">Perfil diario: DNI(h) = DNI_max · sin(π·(h−6)/12)</p>
      </div>
    </section>
  );
}
