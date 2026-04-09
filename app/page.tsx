'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  RankineInputs,
  RankineOutputs,
  calcularCicloRankine,
  getDNIHora,
} from '@/utils/thermodynamics/rankine';
import { calculateFresnelBalance, SystemInputs, SystemOutputs } from '@/utils/thermodynamics/balances';
import { ParametrosPanel } from '@/components/panels/ParametrosPanel';
import { KPIPanel } from '@/components/panels/KPIPanel';
import { EstadosTable } from '@/components/panels/EstadosTable';
import { BalancePanel } from '@/components/panels/BalancePanel';
import { SimuladorDinamico } from '@/components/panels/SimuladorDinamico';
import { DiagramaTsChart } from '@/components/charts/DiagramaTsChart';
import { SankeyChart } from '@/components/charts/SankeyChart';
import { SensibilidadChart } from '@/components/charts/SensibilidadChart';
import { ProduccionAnualChart } from '@/components/charts/ProduccionAnualChart';
import { ModuloEducativo } from '@/components/educativo/ModuloEducativo';
import { Escenario, ExportPanel } from '@/components/export/ExportPanel';

const SimulationCanvas = dynamic(() => import('@/components/SimulationCanvas'), { ssr: false });

const DEFAULTS: RankineInputs = {
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

type TabId = 'diagrama' | 'dashboard' | 'graficas' | 'educativo' | 'exportar';

export default function Home() {
  const [inputs, setInputs] = useState<RankineInputs>(DEFAULTS);
  const [outputs, setOutputs] = useState<RankineOutputs | null>(null);
  const [transientOutputs, setTransientOutputs] = useState<RankineOutputs | null>(null);
  const [legacyTransient, setLegacyTransient] = useState<SystemOutputs | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('diagrama');
  const [horaSimulada, setHoraSimulada] = useState<number>(12);
  const [plantaActiva, setPlantaActiva] = useState<boolean>(true);
  const [dniMax, setDniMax] = useState<number>(DEFAULTS.DNI);
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);

  const rankineTargetRef = useRef<RankineOutputs | null>(null);
  const legacyTargetRef = useRef<SystemOutputs | null>(null);

  const handleDesignInputsChange = useCallback((next: RankineInputs) => {
    setInputs(next);
    if (next.DNI > 0) setDniMax(next.DNI);
  }, []);

  const handleHoraChange = useCallback(
    (h: number) => {
      setHoraSimulada(h);
      const dniActual = plantaActiva ? getDNIHora(h, dniMax) : 0;
      setInputs((prev) => ({ ...prev, DNI: dniActual }));
    },
    [dniMax, plantaActiva]
  );

  const legacyInputs: SystemInputs = useMemo(
    () => ({
      massFlowRate: inputs.m_dot,
      inletTemp: inputs.T_amb_C,
      pressure: inputs.P_alta_bar * 100,
      dni: inputs.DNI,
      apertureArea: inputs.n_filas * inputs.ancho_espejo * inputs.largo_fila,
      opticalEfficiency: inputs.eta_optica,
      thermalLossCoeff: 10,
    }),
    [inputs]
  );

  const legacySteady = useMemo(() => calculateFresnelBalance(legacyInputs), [legacyInputs]);

  useEffect(() => {
    const targetOutputs = calcularCicloRankine(inputs);
    rankineTargetRef.current = targetOutputs;
    setOutputs(targetOutputs);

    legacyTargetRef.current = legacySteady;
  }, [inputs, legacySteady]);

  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();
    const thermalTau = 2.0;

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      const rate = 1 - Math.exp(-dt / thermalTau);

      const target = rankineTargetRef.current;
      if (target) {
        setTransientOutputs((prev) => {
          if (!prev) return target;

          const W_neta_kW = prev.W_neta_kW + (target.W_neta_kW - prev.W_neta_kW) * rate;
          const Q_util_kW = prev.Q_util_kW + (target.Q_util_kW - prev.Q_util_kW) * rate;
          const eta_total = prev.eta_total + (target.eta_total - prev.eta_total) * rate;

          return {
            ...target,
            W_neta_kW,
            Q_util_kW,
            eta_total,
          };
        });
      }

      const legacyTarget = legacyTargetRef.current;
      if (legacyTarget) {
        setLegacyTransient((prev) => {
          if (!prev) return legacyTarget;

          const newEnthalpy =
            prev.outletState.enthalpy +
            (legacyTarget.outletState.enthalpy - prev.outletState.enthalpy) * rate;
          const newQ = prev.qAbsorbed + (legacyTarget.qAbsorbed - prev.qAbsorbed) * rate;
          const newEff = prev.efficiency + (legacyTarget.efficiency - prev.efficiency) * rate;
          const newTemp = prev.outletState.temp + (legacyTarget.outletState.temp - prev.outletState.temp) * rate;
          const targetQuality = legacyTarget.outletState.quality || 0;
          const prevQuality = prev.outletState.quality || 0;
          const newQuality = prevQuality + (targetQuality - prevQuality) * rate;

          return {
            qAbsorbed: newQ,
            efficiency: newEff,
            outletState: {
              ...legacyTarget.outletState,
              temp: newTemp,
              enthalpy: newEnthalpy,
              quality: legacyTarget.outletState.phase === 'saturated_mixture' ? newQuality : undefined,
            },
          };
        });
      }

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const guardarEscenario = useCallback(() => {
    if (!outputs) return;

    setEscenarios((prev) => {
      if (prev.length >= 3) return prev;
      const id = [1, 2, 3].find((n) => !prev.some((e) => e.id === n));
      if (!id) return prev;
      const nuevo: Escenario = {
        id,
        nombre: `Escenario ${id}`,
        inputs: { ...inputs },
        outputs: { ...outputs },
        timestamp: new Date(),
      };
      return [...prev, nuevo].sort((a, b) => a.id - b.id);
    });
  }, [inputs, outputs]);

  const cargarEscenario = useCallback(
    (id: number) => {
      const esc = escenarios.find((e) => e.id === id);
      if (!esc) return;
      setInputs({ ...esc.inputs });
      if (esc.inputs.DNI > 0) setDniMax(esc.inputs.DNI);
    },
    [escenarios]
  );

  const eliminarEscenario = useCallback((id: number) => {
    setEscenarios((prev) => prev.filter((e) => e.id !== id));
  }, []);

  useEffect(() => {
    const handleSaveFromPanel = () => guardarEscenario();
    window.addEventListener('rankine-save-scenario', handleSaveFromPanel as EventListener);
    return () => window.removeEventListener('rankine-save-scenario', handleSaveFromPanel as EventListener);
  }, [guardarEscenario]);

  const canvasOutputs = legacyTransient ?? legacySteady;

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-[#30363d] bg-[#161b22]/90 px-4 py-3 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="7" fill="#f0a500" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <line
                key={i}
                x1={16 + 9 * Math.cos((angle * Math.PI) / 180)}
                y1={16 + 9 * Math.sin((angle * Math.PI) / 180)}
                x2={16 + 14 * Math.cos((angle * Math.PI) / 180)}
                y2={16 + 14 * Math.sin((angle * Math.PI) / 180)}
                stroke="#f0a500"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </svg>
          <div>
            <h1 className="text-lg font-black tracking-tight text-[#e6edf3]">
              SolarFresnel <span className="text-[#f0a500]">Pro</span>
            </h1>
            <p className="text-xs text-[#8b949e]">Motor Termodinámico • Felder & Rousseau</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3fb950] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3fb950]" />
            </span>
            Engine Live
          </div>
          {(transientOutputs ?? outputs) && (
            <div className="text-xs font-mono">
              <span className="font-bold text-[#f0a500]">{(transientOutputs ?? outputs)?.W_neta_kW.toFixed(1)} kW</span>
              <span className="ml-1 text-[#8b949e]">neto</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex h-screen overflow-hidden pt-16">
        <aside className="w-[320px] flex-shrink-0 space-y-4 overflow-y-auto border-r border-[#30363d] bg-[#161b22] p-4">
          <ParametrosPanel inputs={inputs} onChange={handleDesignInputsChange} />
          <SimuladorDinamico
            inputs={inputs}
            onChange={setInputs}
            horaSimulada={horaSimulada}
            onHoraChange={handleHoraChange}
            plantaActiva={plantaActiva}
            onTogglePlanta={() => setPlantaActiva((v) => !v)}
          />
        </aside>

        <section className="flex-1 overflow-y-auto bg-[#0d1117]">
          <nav className="sticky top-0 z-10 flex gap-1 border-b border-[#30363d] bg-[#0d1117]/95 px-4 backdrop-blur-sm md:px-6">
            {([
              ['diagrama', '⚡ Diagrama'],
              ['dashboard', '📊 Dashboard'],
              ['graficas', '📈 Gráficas'],
              ['educativo', '📚 Teoría'],
              ['exportar', '📤 Exportar'],
            ] as [TabId, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === id
                    ? 'border-[#f0a500] text-[#f0a500]'
                    : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="p-4 md:p-6">
            {activeTab === 'diagrama' && (
              <div className="space-y-6">
                <SimulationCanvas
                  outletState={canvasOutputs.outletState}
                  inletTemp={legacyInputs.inletTemp}
                  inputs={legacyInputs}
                  rankineOutputs={transientOutputs ?? outputs ?? undefined}
                />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <EstadosTable outputs={transientOutputs ?? outputs} />
                <BalancePanel outputs={transientOutputs ?? outputs} />
              </div>
            )}

            {activeTab === 'graficas' && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <DiagramaTsChart outputs={transientOutputs ?? outputs} />
                <SankeyChart outputs={transientOutputs ?? outputs} />
                <SensibilidadChart baseInputs={inputs} />
                <ProduccionAnualChart outputs={transientOutputs ?? outputs} inputs={inputs} />
              </div>
            )}

            {activeTab === 'educativo' && <ModuloEducativo outputs={transientOutputs ?? outputs} />}

            {activeTab === 'exportar' && (
              <ExportPanel
                outputs={transientOutputs ?? outputs}
                inputs={inputs}
                escenarios={escenarios}
                onGuardarEscenario={guardarEscenario}
                onCargarEscenario={cargarEscenario}
                onEliminarEscenario={eliminarEscenario}
              />
            )}
          </div>
        </section>

        <aside className="w-[280px] flex-shrink-0 overflow-y-auto border-l border-[#30363d] bg-[#161b22] p-4">
          <KPIPanel outputs={transientOutputs ?? outputs} />
        </aside>
      </div>
    </main>
  );
}