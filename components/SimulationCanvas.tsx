'use client';
import React, { useRef, useEffect } from 'react';
import { ThermoState } from '@/utils/thermodynamics/properties';

interface CanvasProps {
  outletState: ThermoState;
  inletTemp: number;
}

export default function SimulationCanvas({ outletState, inletTemp }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.05;
      
      const width = canvas.width;
      const height = canvas.height;

      // Limpiar canvas
      ctx.clearRect(0, 0, width, height);

      // Dibujar concentrador Fresnel (espejos)
      ctx.fillStyle = '#94a3b8'; // plateado
      for (let i = 0; i < 5; i++) {
        const xOffset = 50 + i * 150;
        ctx.beginPath();
        ctx.ellipse(xOffset, height - 40, 60, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(xOffset, height - 40);
        ctx.lineTo(width / 2, 80); // Foco en el tubo
        ctx.strokeStyle = `rgba(253, 224, 71, ${Math.max(0.1, (outletState.temp - inletTemp)/300)})`; // Sol reflejado amarillo
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Estilo dinámico del tubo según propiedades (Calidad / Temperatura)
      // Azul = frio/agua, Rojo = caliente, Blanco/Gris = Vapor
      let tubeGradient = ctx.createLinearGradient(0, 0, width, 0);
      
      // Entrada es siempre temperatura inlet
      tubeGradient.addColorStop(0, `rgb(59, 130, 246)`); 

      if (outletState.phase === 'subcooled') {
        const intensity = Math.min(255, Math.floor((outletState.temp / 200) * 255));
        tubeGradient.addColorStop(1, `rgb(${intensity}, 50, ${255 - intensity})`);
      } else if (outletState.phase === 'saturated_mixture') {
        // La mezcla saturada va de rojo líquido (T_sat) hacia blanco (Vapor) según la calidad 'x'
        const q = outletState.quality || 0;
        const color = 255 - Math.floor((1 - q) * 100);
        tubeGradient.addColorStop(1, `rgb(255, ${color}, ${color})`);
      } else {
        // Vapor sobrecalentado = blanco parpadeante / gris claro
        tubeGradient.addColorStop(1, `rgb(240, 240, 255)`);
      }

      // Tubo receptor
      ctx.fillStyle = tubeGradient;
      ctx.beginPath();
      ctx.roundRect(100, 70, width - 200, 20, 10);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Animación de flujo (partículas en movimiento dentro del tubo)
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for(let p = 0; p < 10; p++) {
        const pX = 100 + ((time * 50 + p * ((width - 200)/10)) % (width - 200));
        ctx.beginPath();
        ctx.arc(pX, 80, 4 + Math.sin(time + p) * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [outletState, inletTemp]);

  return (
    <div className="w-full bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={300} 
        className="w-full h-auto block"
      />
    </div>
  );
}