'use client';
import React, { useState, useEffect } from 'react';
import ControlPanel from '@/components/ControlPanel';
import DataDashboard from '@/components/DataDashboard';
import dynamic from 'next/dynamic';
const SimulationCanvas = dynamic(() => import('@/components/SimulationCanvas'), { ssr: false });
import { calculateFresnelBalance, SystemInputs, SystemOutputs } from '@/utils/thermodynamics/balances';

export default function Home() {
  const [inputs, setInputs] = useState<SystemInputs>({
    massFlowRate: 2.0,
    inletTemp: 25.0,
    pressure: 101.325, // Presión atmosférica por defecto
    dni: 800, // W/m^2 asoleado
    apertureArea: 500, // m^2
    opticalEfficiency: 0.70,
    thermalLossCoeff: 10 // W/m^2K
  });

  const [outputs, setOutputs] = useState<SystemOutputs | null>(null);

  // Módulo de régimen transitorio emulado - amortiguación exponencial (Inercia térmica del tubo)
  // Ecuación General de Balance (Capítulo 11) - Simulando acumulación simple
  const [transientTarget, setTransientTarget] = useState<SystemOutputs | null>(null);

  useEffect(() => {
    // Calculamos el estado estacionario final objetivo 
    const steadyStateResult = calculateFresnelBalance(inputs);
    setTransientTarget(steadyStateResult);
  }, [inputs]);

  useEffect(() => {
    // Loop de inercia / Régimen Transitorio simple
    let animationFrame: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000; // segundos
      lastTime = time;

      if (transientTarget) {
        setOutputs(prev => {
          if (!prev) return transientTarget;
          
          // Factor de inercia representativo para el sistema
          // A menor valor de dt/tau más lento converge (acumulación / retardo térmico)
          const thermalTau = 2.0; // constante de tiempo ficticia en segundos simulados
          const rate = 1 - Math.exp(-dt / thermalTau);

          // Interpolación de entalpía y re-cálculo para emular inercia térmica real de la masa del sistema
          const newEnthalpy = prev.outletState.enthalpy + (transientTarget.outletState.enthalpy - prev.outletState.enthalpy) * rate;
          const newQ = prev.qAbsorbed + (transientTarget.qAbsorbed - prev.qAbsorbed) * rate;
          const newEff = prev.efficiency + (transientTarget.efficiency - prev.efficiency) * rate;
          
          // Obtenemos un T y quality aproximados desde el target para simplificar rendering interpolado (idealmente recalculamos desde H)
          const newTemp = prev.outletState.temp + (transientTarget.outletState.temp - prev.outletState.temp) * rate;
          const targetQ = transientTarget.outletState.quality || 0;
          const prevQ = prev.outletState.quality || 0;
          const newQuality = prevQ + (targetQ - prevQ) * rate;

          return {
            qAbsorbed: newQ,
            efficiency: newEff,
            outletState: {
              ...transientTarget.outletState,
              temp: newTemp,
              enthalpy: newEnthalpy,
              quality: transientTarget.outletState.phase === 'saturated_mixture' ? newQuality : undefined
            }
          };
        });
      }
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, [transientTarget]);

  return (
    <main className="min-h-screen text-slate-800 p-4 md:p-8 font-sans selection:bg-blue-200">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header Ultra Premium */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest w-fit mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Engine Live
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Generador de Vapor <span className="text-blue-600">Fresnel</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg flex items-center gap-2">
              Motor Termodinámico Estricto <span className="hidden md:inline text-slate-300">•</span> Basado en Felder & Rousseau
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-mono text-slate-400 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase.tracking-wider">Resolution Time</span>
              <span className="text-slate-700 font-bold">16ms</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase.tracking-wider">Model</span>
              <span className="text-slate-700 font-bold">Transient</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Panel Izquierdo */}
          <aside className="w-full xl:col-span-3">
            <ControlPanel inputs={inputs} setInputs={setInputs} />
          </aside>
          
          {/* Contenido Principal (Canvas + Data) */}
          <section className="w-full xl:col-span-9 flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6">
              {outputs && (
                <div className="w-full rounded-3xl overflow-hidden glass-panel p-2">
                  <SimulationCanvas 
                    outletState={outputs.outletState} 
                    inletTemp={inputs.inletTemp}
                    inputs={inputs}
                  />
                </div>
              )}
            </div>
            
            <DataDashboard outputs={outputs} />
          </section>
        </div>

      </div>
    </main>
  );
}