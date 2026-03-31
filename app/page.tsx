'use client';
import React, { useState, useEffect } from 'react';
import ControlPanel from '@/components/ControlPanel';
import DataDashboard from '@/components/DataDashboard';
import SimulationCanvas from '@/components/SimulationCanvas';
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
    <main className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Simulador de Generación de Vapor (Fresnel)</h1>
          <p className="text-slate-600 font-medium">Motor de Balances Termodinámicos (Basado en Felder & Rousseau)</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-1/3">
            <ControlPanel inputs={inputs} setInputs={setInputs} />
          </aside>
          
          <section className="w-full lg:w-2/3 flex flex-col gap-6 ">
            {/* Visualización en tiempo Real del Lienzo */}
            {outputs && (
              <SimulationCanvas 
                outletState={outputs.outletState} 
                inletTemp={inputs.inletTemp} 
              />
            )}
            
            {/* Analíticas Numéricas */}
            <DataDashboard outputs={outputs} />
          </section>
        </div>

      </div>
    </main>
  );
}