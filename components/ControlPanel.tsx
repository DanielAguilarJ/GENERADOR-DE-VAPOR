'use client';
import React from 'react';
import { SystemInputs } from '@/utils/thermodynamics/balances';

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
    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm border border-slate-100 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Panel de Control</h2>
      
      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-slate-600 flex justify-between">
          <span>DNI (Radiación Solar)</span>
          <span className="text-blue-600">{inputs.dni} W/m²</span>
        </label>
        <input 
          type="range" name="dni" min="0" max="1200" step="10" 
          value={inputs.dni} onChange={handleChange}
          className="w-full accent-blue-600"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-slate-600 flex justify-between">
          <span>Flujo Másico ($\dot{m}$)</span>
          <span className="text-blue-600">{inputs.massFlowRate.toFixed(2)} kg/s</span>
        </label>
        <input 
          type="range" name="massFlowRate" min="0.1" max="10" step="0.1" 
          value={inputs.massFlowRate} onChange={handleChange}
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-slate-600 flex justify-between">
          <span>Presión Operativa</span>
          <span className="text-blue-600">{inputs.pressure} kPa</span>
        </label>
        <input 
          type="range" name="pressure" min="101.325" max="5000" step="50" 
          value={inputs.pressure} onChange={handleChange}
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-slate-600 flex justify-between">
          <span>Temperatura de Entrada</span>
          <span className="text-blue-600">{inputs.inletTemp} °C</span>
        </label>
        <input 
          type="range" name="inletTemp" min="10" max="250" step="1" 
          value={inputs.inletTemp} onChange={handleChange}
          className="w-full"
        />
      </div>
    </div>
  );
}