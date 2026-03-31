export interface ThermoState {
  temp: number; // in Celsius
  pressure: number; // in kPa or bar (let's use kPa)
  enthalpy: number; // in kJ/kg
  phase: 'subcooled' | 'saturated_mixture' | 'superheated';
  quality?: number; // 0 to 1
}

// Apéndice B.4 Felder: Constantes de Antoine para el agua
// log10(P*) = A - B / (T + C), T in Celsius, P* in mm Hg
const waterAntoineConstants = {
  A: 8.10765,
  B: 1750.286,
  C: 235.0,
};

/**
 * Calcula la presión de vapor usando la Ecuación de Antoine (Cap 6).
 * @param T Temperatura en °C
 * @returns Presión de vapor en kPa
 */
export function calculateVaporPressure(T: number): number {
  const { A, B, C } = waterAntoineConstants;
  const pStarMmHg = Math.pow(10, A - B / (T + C));
  // Convert mm Hg to kPa (1 mm Hg = 0.133322 kPa)
  return pStarMmHg * 0.133322;
}

/**
 * Calcula la temperatura de saturación dada la presión usando Antoine invertida.
 * @param P Presión en kPa
 * @returns Temperatura de saturación en °C
 */
export function calculateSaturationTemperature(P: number): number {
  const pMmHg = P / 0.133322;
  const { A, B, C } = waterAntoineConstants;
  return B / (A - Math.log10(pMmHg)) - C;
}

// Apéndice B.2 Felder: Constantes de Capacidad Calorífica (Cp)
// Para Agua (Líquido) aprox: 4.184 kJ/kg°C o usamos el polinomio para vapor
// Cp [kJ/(mol °C)] = a + bT + cT^2 + dT^3
const waterLiquidCp = 4.184; // kJ/(kg °C)
const waterVaporCpConstants = { // convertidas a kJ/(kg °C) aprox. para simplificar el modelo
  a: 33.46 * 1000 / 18.015 / 1000, 
  b: 0.6880e-2 * 1000 / 18.015 / 1000,
  c: 0.7604e-5 * 1000 / 18.015 / 1000,
  d: -3.593e-9 * 1000 / 18.015 / 1000,
};

/**
 * Integra la capacidad calorífica del agua líquida desde T_ref hasta T.
 */
function integrateLiquidCp(T_ref: number, T: number): number {
  return waterLiquidCp * (T - T_ref);
}

/**
 * Calcula el calor latente de vaporización aproximado (kJ/kg) a la temperatura de saturación.
 */
function calculateLatentHeat(T_sat: number): number {
  // Aprox lineal (entalpía de vaporización del agua disminuye con T)
  // a 100°C es ~2257 kJ/kg. Usamos una aproximación algorítmica simplificada:
  const H_v_100 = 2257; 
  const slope = -2.5; // Aproximadamente -2.5 kJ/kg por grado C
  return H_v_100 + slope * (T_sat - 100);
}

/**
 * Integra la capacidad calorífica del agua vapor desde T_sat hasta T.
 */
function integrateVaporCp(T_sat: number, T: number): number {
  const { a, b, c, d } = waterVaporCpConstants;
  const integral = (t: number) => a * t + (b / 2) * t ** 2 + (c / 3) * t ** 3 + (d / 4) * t ** 4;
  return integral(T) - integral(T_sat);
}

/**
 * Tablas de Vapor Algorítmicas
 * @param T Temperatura en °C
 * @param P Presión del sistema en kPa
 * @returns Entalpía específica local H hat (kJ/kg) y la fase actual.
 */
export function calculateSpecificEnthalpy(
  T: number, 
  P: number
): { enthalpy: number, phase: 'subcooled' | 'saturated_mixture' | 'superheated', quality: number, T_sat: number } {
  const T_ref = 0.01; // Referencia Felder: Estado líquido triple point (~0.01 °C -> H=0)
  const T_sat = calculateSaturationTemperature(P);
  
  if (T < T_sat - 0.01) {
    // Líquido Subenfriado
    const H = integrateLiquidCp(T_ref, T);
    return { enthalpy: H, phase: 'subcooled', quality: 0, T_sat };
  } else if (Math.abs(T - T_sat) <= 0.01) {
    // Mezcla saturada (En la práctica, la calidad depende del calor entrante, no de T y P solos)
    // Para simplificar algorítmicamente desde T, si T == T_sat, necesitamos inputs externos, 
    // asumiremos líquido saturado para esta función inversa parcial.
    const H = integrateLiquidCp(T_ref, T_sat);
    return { enthalpy: H, phase: 'saturated_mixture', quality: 0, T_sat };
  } else {
    // Vapor Sobrecalentado
    const H_l = integrateLiquidCp(T_ref, T_sat);
    const dH_v = calculateLatentHeat(T_sat);
    const dH_superheat = integrateVaporCp(T_sat, T);
    const H = H_l + dH_v + dH_superheat;
    return { enthalpy: H, phase: 'superheated', quality: 1, T_sat };
  }
}

/**
 * Calcula estado térmico a partir de la Entalpía (útil tras resolver balance de energía).
 * @param H Entalpía específica (kJ/kg)
 * @param P Presión iterativa del sistema (kPa)
 */
export function getStateFromEnthalpy(H: number, P: number): ThermoState {
  const T_ref = 0.01;
  const T_sat = calculateSaturationTemperature(P);
  const H_l_sat = integrateLiquidCp(T_ref, T_sat);
  const dH_v = calculateLatentHeat(T_sat);
  const H_v_sat = H_l_sat + dH_v;

  if (H < H_l_sat) {
    return {
      temp: T_ref + H / waterLiquidCp,
      pressure: P,
      enthalpy: H,
      phase: 'subcooled',
      quality: 0
    };
  } else if (H >= H_l_sat && H <= H_v_sat) {
    const quality = (H - H_l_sat) / dH_v;
    return {
      temp: T_sat,
      pressure: P,
      enthalpy: H,
      phase: 'saturated_mixture',
      quality: Math.min(Math.max(quality, 0), 1)
    };
  } else {
    // APROX: Usando Cp vapor medio para no requerir solver numérico inverso completo del polinomio.
    // Felder recomienda Newton-Raphson si fuera necesario exactitud máxima.
    const cpV_avg = 1.996; // kJ/(kg C)
    const T_superheat = T_sat + (H - H_v_sat) / cpV_avg;
    return {
      temp: T_superheat,
      pressure: P,
      enthalpy: H,
      phase: 'superheated',
      quality: 1
    };
  }
}