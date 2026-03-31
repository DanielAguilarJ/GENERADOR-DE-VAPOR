'use client';
import React from 'react';
import { SystemOutputs } from '@/utils/thermodynamics/balances';

export default function DataDashboard({ outputs }: { outputs: SystemOutputs | null }) {
  if (!outputs) return null;

  const { qAbsorbed, outletState, efficiency } = outputs;
  const { temp, phase, enthalpy, quality } = outletState;

  // Formato para mostrar fases
  const phaseLabels: Record<string, string> = {
    'subcooled': 'Líquido Subenfriado',
    'saturated_mixture': 'Mezcla Saturada',
    'superheated': 'Vapor Sobrecalentado'
  };

  return (
    <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      <div className="flex flex-col">
        <span className="text-slate-400 text-sm">Potencia Térmica Útil</span>
        <span className="text-2xl font-bold text-amber-400">{qAbsorbed.toFixed(2)} kW</span>
      </div>

      <div className="flex flex-col">
        <span className="text-slate-400 text-sm">Estado de Salida</span>
        <span className="text-xl font-bold text-cyan-300">{phaseLabels[phase]}</span>
        {phase === 'saturated_mixture' && quality !== undefined && (
          <span className="text-xs text-cyan-100">Calidad (x): {(quality * 100).toFixed(1)}%</span>
        )}
      </div>

      <div className="flex flex-col">
        <span className="text-slate-400 text-sm">Temperatura Final</span>
        <span className="text-2xl font-bold text-red-400">{temp.toFixed(2)} °C</span>
      </div>

      <div className="flex flex-col">
        <span className="text-slate-400 text-sm">Eficiencia Térmica</span>
        <span className="text-2xl font-bold text-green-400">{efficiency.toFixed(2)} %</span>
      </div>

      <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2 pt-2 border-t border-slate-700">
        <span className="text-sm text-slate-300 block">Balance Ecuación: $\dot{Q}_{abs} = \dot{m} \Delta\hat{H}$ (Verificado por Controlador)</span>
        <span className="text-xs text-slate-500">Entalpía Especifica (H): {enthalpy.toFixed(2)} kJ/kg</span>
      </div>
    </div>
  );
}