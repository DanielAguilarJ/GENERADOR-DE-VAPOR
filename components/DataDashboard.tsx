'use client';
import React from 'react';
import { SystemOutputs } from '@/utils/thermodynamics/balances';
import { Activity, Flame, Zap, Droplet, ArrowRight, BarChart3 } from 'lucide-react';

export default function DataDashboard({ outputs }: { outputs: SystemOutputs | null }) {
  if (!outputs) return null;

  const { qAbsorbed, outletState, efficiency } = outputs;
  const { temp, phase, enthalpy, quality } = outletState;

  // Formato para mostrar fases con iconos y colores estilizados
  const phaseConfig: Record<string, { label: string, color: string, icon: React.ReactNode, bg: string }> = {
    'subcooled': { label: 'Líquido Subenfriado', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: <Droplet className="w-5 h-5 text-blue-500" /> },
    'saturated_mixture': { label: 'Mezcla Saturada', color: 'text-indigo-500', bg: 'bg-indigo-500/10', icon: <Activity className="w-5 h-5 text-indigo-500" /> },
    'superheated': { label: 'Vapor Sobrecal.', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: <Flame className="w-5 h-5 text-orange-500" /> }
  };

  const currentPhase = phaseConfig[phase] || phaseConfig['subcooled'];

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl w-full flex flex-col gap-6 relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-slate-300/20 blur-3xl pointer-events-none"></div>

      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
        <div className="bg-slate-900 p-2.5 rounded-xl shadow-inner">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Telemetría</h2>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-0.5">Métricas de Salida</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 z-10 w-full">
        {/* Potencia */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/50 border border-slate-100/50 shadow-sm transition-transform hover:-translate-y-1">
          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500"/>Potencia Absor.</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl font-black text-slate-800 tracking-tighter">{qAbsorbed.toFixed(1)}</span>
            <span className="text-sm font-bold text-slate-400 uppercase">kW</span>
          </div>
        </div>

        {/* Estado de Salida */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/50 border border-slate-100/50 shadow-sm transition-transform hover:-translate-y-1 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1.5 h-full ${currentPhase.bg.replace('/10', '')}`}></div>
          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 ml-2"><ArrowRight className="w-3.5 h-3.5 text-slate-400"/>Fase Salida</span>
          <div className="flex flex-col mt-1 ml-2">
            <div className="flex items-center gap-2">
              {currentPhase.icon}
              <span className={`text-base font-extrabold tracking-tight ${currentPhase.color}`}>{currentPhase.label}</span>
            </div>
            {phase === 'saturated_mixture' && quality !== undefined && (
              <span className="text-xs font-bold text-slate-400 mt-1 bg-slate-100 px-2 py-0.5 rounded-md inline-flex w-max">
                X = {(quality * 100).toFixed(1)}% Vapor
              </span>
            )}
          </div>
        </div>

        {/* Temperatura */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/50 border border-slate-100/50 shadow-sm transition-transform hover:-translate-y-1">
          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-red-500"/>Temp. Final</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl font-black text-slate-800 tracking-tighter">{temp.toFixed(1)}</span>
            <span className="text-sm font-bold text-slate-400 uppercase">°C</span>
          </div>
        </div>

        {/* Eficiencia */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/50 border border-slate-100/50 shadow-sm transition-transform hover:-translate-y-1 relative overflow-hidden">
           <div className="absolute -bottom-6 -right-6 text-emerald-500/10">
              <Zap className="w-24 h-24" />
           </div>
          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 z-10"><Activity className="w-3.5 h-3.5 text-emerald-500"/>Eficiencia Total</span>
          <div className="flex items-baseline gap-1 mt-1 z-10">
            <span className="text-4xl font-black text-emerald-500 tracking-tighter">{efficiency.toFixed(1)}</span>
            <span className="text-sm font-bold text-slate-400 uppercase">%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-5 border-t border-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
            Balance Estacionario Activo:
            <span className="font-mono bg-slate-900 text-white px-2 py-1 rounded-md text-[10px] tracking-wider shadow-inner">
              {'$\\dot{Q}_{abs} = \\dot{m} \\Delta\\hat{H}$'}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Entalpía Salida ($H_{"{out}"}$):</span>
            <span className="text-sm font-black font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                {enthalpy.toFixed(1)} kJ/kg
            </span>
        </div>
      </div>
    </div>
  );
}