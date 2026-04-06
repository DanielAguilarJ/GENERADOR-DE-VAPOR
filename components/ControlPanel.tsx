'use client';
import React from 'react';
import { SystemInputs } from '@/utils/thermodynamics/balances';
import { Sun, Droplets, Gauge, Thermometer } from 'lucide-react';

interface ControlPanelProps {
  inputs: SystemInputs;
  setInputs: React.Dispatch<React.SetStateAction<SystemInputs>>;
}

export default function ControlPanel({ inputs, setInputs }: ControlPanelProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl w-full flex flex-col gap-8 relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 opacity-90"></div>

      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
        <div className="bg-slate-900 p-2.5 rounded-xl shadow-inner">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Parámetros</h2>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-0.5">Control de Variables</p>
        </div>
      </div>

      <div className="flex flex-col gap-7">
        {/* DNI */}
        <div className="flex flex-col gap-3 group">
          <label className="text-sm font-bold text-slate-700 flex justify-between items-end">
            <span className="flex items-center gap-2 text-slate-600">
              <Sun className="w-4 h-4 text-amber-500" />
              Radiación DNI
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-amber-600 font-mono">{inputs.dni.toFixed(0)}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">W/m²</span>
            </div>
          </label>
          <div className="relative flex items-center">
            <input 
              type="range" name="dni" min="0" max="1200" step="10" 
              value={inputs.dni} onChange={handleChange}
              className="w-full h-2 bg-slate-200/50 rounded-lg appearance-none cursor-pointer accent-amber-500 shadow-inner"
            />
          </div>
        </div>

        {/* Flujo Másico */}
        <div className="flex flex-col gap-3 group">
          <label className="text-sm font-bold text-slate-700 flex justify-between items-end">
            <span className="flex items-center gap-2 text-slate-600">
              <Droplets className="w-4 h-4 text-emerald-500" />
              Flujo Másico {'(\\dot{m})'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-emerald-600 font-mono">{inputs.massFlowRate.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">kg/s</span>
            </div>
          </label>
          <input 
            type="range" name="massFlowRate" min="0.1" max="10" step="0.1" 
            value={inputs.massFlowRate} onChange={handleChange}
            className="w-full h-2 bg-slate-200/50 rounded-lg appearance-none cursor-pointer accent-emerald-500 shadow-inner"
          />
        </div>

        {/* Presión */}
        <div className="flex flex-col gap-3 group">
          <label className="text-sm font-bold text-slate-700 flex justify-between items-end">
            <span className="flex items-center gap-2 text-slate-600">
              <Gauge className="w-4 h-4 text-blue-500" />
              Presión (P)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-blue-600 font-mono">{inputs.pressure.toFixed(0)}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">kPa</span>
            </div>
          </label>
          <input 
            type="range" name="pressure" min="101.325" max="5000" step="50" 
            value={inputs.pressure} onChange={handleChange}
            className="w-full h-2 bg-slate-200/50 rounded-lg appearance-none cursor-pointer accent-blue-500 shadow-inner"
          />
        </div>

        {/* Temperatura */}
        <div className="flex flex-col gap-3 group">
          <label className="text-sm font-bold text-slate-700 flex justify-between items-end">
            <span className="flex items-center gap-2 text-slate-600">
              <Thermometer className="w-4 h-4 text-red-500" />
              Temp. Entrada
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-red-600 font-mono">{inputs.inletTemp.toFixed(1)}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">°C</span>
            </div>
          </label>
          <input 
            type="range" name="inletTemp" min="10" max="250" step="1" 
            value={inputs.inletTemp} onChange={handleChange}
            className="w-full h-2 bg-slate-200/50 rounded-lg appearance-none cursor-pointer accent-red-500 shadow-inner"
          />
        </div>
      </div>
    </div>
  );
}