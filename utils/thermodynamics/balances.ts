import { getStateFromEnthalpy, calculateSpecificEnthalpy, ThermoState } from './properties';

export interface SystemInputs {
  massFlowRate: number; // m_dot en kg/s
  inletTemp: number; // T_in en °C
  pressure: number; // P en kPa
  dni: number; // Direct Normal Irradiance en W/m^2
  apertureArea: number; // Area del concentrador en m^2
  opticalEfficiency: number; // Rendimiento óptico (0 - 1)
  thermalLossCoeff: number; // W/(m^2 K) - simplificación para pérdidas de calor
}

export interface SystemOutputs {
  qAbsorbed: number; // kW
  outletState: ThermoState;
  efficiency: number; // %
}

/**
 * Balance de Energía en Estado Estacionario (Capítulo 7.4)
 * Q_absorbido = m_dot * delta(H)
 * @param inputs Variables operativas del sistema Fresnel
 */
export function calculateFresnelBalance(inputs: SystemInputs): SystemOutputs {
  const { massFlowRate, inletTemp, pressure, dni, apertureArea, opticalEfficiency, thermalLossCoeff } = inputs;
  
  // 1. Calcular Entalpía a la entrada
  const inlet = calculateSpecificEnthalpy(inletTemp, pressure);
  const H_in = inlet.enthalpy;

  // 2. Cálculo de calor solar disponible (Q_in)
  // Q_solar = DNI * Area * eta_optico (en W) -> Convertido a kW
  const q_solar_kW = (dni * apertureArea * opticalEfficiency) / 1000;

  // 3. Pérdidas térmicas aproximadas referenciando diferencia con el ambiente (T_amb = 25°C)
  // Temperatura media asumida para pérdidas (Aproximada antes de iterar, simplificado aquí)
  const T_amb = 25;
  const T_mean_est = inletTemp + 50; // Suposición inicial
  const q_loss_kW = (thermalLossCoeff * apertureArea * (T_mean_est - T_amb)) / 1000;

  // 4. Calor absorbido neto
  const q_absorbed_kW = Math.max(0, q_solar_kW - q_loss_kW);

  // 5. Balance de Energía: Q = m_dot * (H_out - H_in) --> H_out = H_in + Q / m_dot
  // m_dot > 0 para evitar divisiones por cero
  let H_out = H_in;
  if (massFlowRate > 0) {
    H_out = H_in + (q_absorbed_kW / massFlowRate);
  }

  // 6. Determinar el estado de salida desde la Entalpía resuelta
  const outletState = getStateFromEnthalpy(H_out, pressure);

  // 7. Cálculo de eficiencia térmica del colector
  const efficiency = dni > 0 ? (q_absorbed_kW / ((dni * apertureArea) / 1000)) * 100 : 0;

  return {
    qAbsorbed: q_absorbed_kW,
    outletState,
    efficiency
  };
}