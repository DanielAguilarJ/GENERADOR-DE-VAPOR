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

// ═══════════════════════════════════════════════════
// TABLAS DE VAPOR EXTENDIDAS — Felder Tablas B.5-B.7
// Basadas en el libro: Principios Elementales de
// Procesos Químicos, Felder & Rousseau
// ═══════════════════════════════════════════════════

// Tabla de vapor saturado por temperatura (Tabla B.5 del libro)
// Valores: [T_C, P_bar, H_liq_kJkg, H_vap_kJkg, S_liq_kJkgK, S_vap_kJkgK]
const STEAM_SAT_TABLE: Array<[number, number, number, number, number, number]> = [
  [0, 0.00611, 0.0, 2500.9, 0.0, 9.1562],
  [10, 0.01228, 42.0, 2519.2, 0.1511, 8.8997],
  [20, 0.02338, 83.9, 2537.4, 0.2965, 8.6672],
  [30, 0.04242, 125.7, 2555.6, 0.4367, 8.4533],
  [40, 0.07381, 167.5, 2573.5, 0.5721, 8.257],
  [45.8, 0.1, 191.8, 2583.2, 0.6493, 8.1502],
  [50, 0.12349, 209.3, 2591.3, 0.7038, 8.0763],
  [60, 0.19934, 251.1, 2608.9, 0.8313, 7.9094],
  [65, 0.25014, 272.0, 2617.6, 0.8937, 7.8316],
  [80, 0.47359, 334.9, 2643.8, 1.0753, 7.6122],
  [100, 1.01325, 419.0, 2675.6, 1.3069, 7.3554],
  [120, 1.9853, 503.7, 2706.0, 1.5279, 7.1296],
  [140, 3.6136, 589.1, 2733.9, 1.739, 6.9299],
  [150, 4.7596, 632.2, 2746.5, 1.8418, 6.8365],
  [160, 6.1804, 675.6, 2758.0, 1.9427, 6.7475],
  [180, 10.021, 763.1, 2777.2, 2.1387, 6.5864],
  [200, 15.538, 852.4, 2792.5, 2.3308, 6.4302],
  [210, 19.077, 897.7, 2797.9, 2.4246, 6.3585],
  [220, 23.18, 943.6, 2801.9, 2.5175, 6.2861],
  [240, 33.48, 1037.6, 2803.0, 2.7015, 6.1425],
  [250, 39.762, 1085.8, 2800.9, 2.7932, 6.073],
  [260, 46.94, 1134.9, 2796.5, 2.8849, 6.0019],
  [280, 64.191, 1236.1, 2779.6, 3.0685, 5.8592],
  [300, 85.81, 1344.0, 2748.7, 3.2534, 5.7059],
  [320, 112.89, 1461.5, 2700.6, 3.448, 5.5362],
  [340, 146.08, 1594.5, 2627.0, 3.6594, 5.3357],
  [360, 186.74, 1761.9, 2481.9, 3.9388, 5.0526],
  [374.14, 220.89, 2099.3, 2099.3, 4.412, 4.412],
];

// Tabla de vapor SOBRECALENTADO (Tabla B.6 del libro)
// Datos: { P_bar: { T_C: [H_kJkg, S_kJkgK] } }
const SUPERHEATED_TABLE: Record<number, Record<number, [number, number]>> = {
  1: {
    100: [2675.6, 7.3554],
    150: [2776.4, 7.6143],
    200: [2875.4, 7.8349],
    250: [2974.3, 8.0338],
    300: [3074.4, 8.2158],
    400: [3278.2, 8.5435],
    500: [3488.1, 8.8341],
    600: [3705.4, 9.0975],
  },
  5: {
    152: [2748.7, 6.8213],
    200: [2855.4, 7.0592],
    250: [2961.0, 7.2724],
    300: [3064.2, 7.4599],
    400: [3272.3, 7.7938],
    500: [3484.9, 8.0873],
    600: [3703.2, 8.3522],
  },
  10: {
    180: [2777.2, 6.5865],
    200: [2827.9, 6.694],
    250: [2942.6, 6.9247],
    300: [3051.2, 7.1229],
    350: [3157.7, 7.3011],
    400: [3264.5, 7.4651],
    500: [3478.5, 7.7622],
    600: [3697.9, 8.029],
  },
  20: {
    212: [2799.5, 6.3409],
    250: [2902.5, 6.5453],
    300: [3024.2, 6.7684],
    350: [3137.0, 6.9583],
    400: [3248.7, 7.1271],
    500: [3467.6, 7.4317],
    600: [3690.1, 7.7024],
  },
  40: {
    250: [2800.3, 6.2084],
    300: [2962.0, 6.3615],
    350: [3092.5, 6.5843],
    380: [3166.0, 6.6796],
    400: [3214.5, 6.7714],
    450: [3331.2, 6.9614],
    500: [3445.3, 7.1363],
    600: [3674.4, 7.4085],
  },
  60: {
    280: [2784.3, 6.0696],
    300: [2885.5, 6.2084],
    350: [3043.4, 6.4493],
    400: [3178.3, 6.6483],
    500: [3422.2, 6.9945],
    600: [3658.4, 7.2724],
  },
  80: {
    295: [2758.7, 5.745],
    300: [2786.5, 5.7937],
    350: [2988.1, 6.1321],
    400: [3139.4, 6.3658],
    500: [3399.5, 6.7266],
    600: [3642.0, 7.01],
  },
  100: {
    311: [2724.7, 5.6141],
    350: [2924.5, 5.945],
    400: [3096.5, 6.212],
    500: [3373.7, 6.5966],
    600: [3625.3, 6.9029],
  },
};

/**
 * Interpola bilinealmente en la tabla de vapor sobrecalentado.
 * Implementa el método de interpolación del Apéndice B Felder.
 * @param P_bar Presión en bar
 * @param T_C   Temperatura en °C
 * @returns [H en kJ/kg, S en kJ/(kg K)]
 */
export function getSuperheatedEnthalpy(P_bar: number, T_C: number): [number, number] {
  const pressures = Object.keys(SUPERHEATED_TABLE)
    .map(Number)
    .sort((a, b) => a - b);

  // Clamp P al rango disponible
  const P_clamped = Math.max(pressures[0], Math.min(pressures[pressures.length - 1], P_bar));

  // Encontrar presiones de interpolación
  let P_lo = pressures[0];
  let P_hi = pressures[pressures.length - 1];
  for (let i = 0; i < pressures.length - 1; i += 1) {
    if (pressures[i] <= P_clamped && pressures[i + 1] >= P_clamped) {
      P_lo = pressures[i];
      P_hi = pressures[i + 1];
      break;
    }
  }

  function interpolateAtP(P: number, T: number): [number, number] {
    const table = SUPERHEATED_TABLE[P];
    const temps = Object.keys(table)
      .map(Number)
      .sort((a, b) => a - b);

    const T_clamp = Math.max(temps[0], Math.min(temps[temps.length - 1], T));
    let T_lo = temps[0];
    let T_hi = temps[temps.length - 1];

    for (let i = 0; i < temps.length - 1; i += 1) {
      if (temps[i] <= T_clamp && temps[i + 1] >= T_clamp) {
        T_lo = temps[i];
        T_hi = temps[i + 1];
        break;
      }
    }

    if (T_lo === T_hi) return table[T_lo];
    const f = (T_clamp - T_lo) / (T_hi - T_lo);
    const [H0, S0] = table[T_lo];
    const [H1, S1] = table[T_hi];
    return [H0 + f * (H1 - H0), S0 + f * (S1 - S0)];
  }

  if (P_lo === P_hi) return interpolateAtP(P_lo, T_C);

  const fP = (P_clamped - P_lo) / (P_hi - P_lo);
  const [H_lo, S_lo] = interpolateAtP(P_lo, T_C);
  const [H_hi, S_hi] = interpolateAtP(P_hi, T_C);
  return [H_lo + fP * (H_hi - H_lo), S_lo + fP * (S_hi - S_lo)];
}

/**
 * Obtiene propiedades de vapor saturado interpolando en la tabla B.5.
 * Felder establece el estado de referencia: agua líquida a 0°C -> H = 0, S = 0.
 */
export function getSatProps(
  T_C: number
): { Hl: number; Hv: number; P_bar: number; Sl: number; Sv: number } {
  const T_clamp = Math.max(0, Math.min(374, T_C));

  for (let i = 0; i < STEAM_SAT_TABLE.length - 1; i += 1) {
    const [T0, P0, Hl0, Hv0, Sl0, Sv0] = STEAM_SAT_TABLE[i];
    const [T1, P1, Hl1, Hv1, Sl1, Sv1] = STEAM_SAT_TABLE[i + 1];
    if (T0 <= T_clamp && T1 >= T_clamp) {
      const f = (T_clamp - T0) / (T1 - T0);
      return {
        Hl: Hl0 + f * (Hl1 - Hl0),
        Hv: Hv0 + f * (Hv1 - Hv0),
        P_bar: P0 + f * (P1 - P0),
        Sl: Sl0 + f * (Sl1 - Sl0),
        Sv: Sv0 + f * (Sv1 - Sv0),
      };
    }
  }

  const last = STEAM_SAT_TABLE[STEAM_SAT_TABLE.length - 1];
  return { Hl: last[2], Hv: last[3], P_bar: last[1], Sl: last[4], Sv: last[5] };
}

/**
 * T_sat desde P_bar usando interpolación en tabla B.5 (más precisa que Antoine para P>5 bar).
 * Felder Tabla B.5, columnas T y P*.
 */
export function getTsatFromP(P_bar: number): number {
  const first = STEAM_SAT_TABLE[0];
  const last = STEAM_SAT_TABLE[STEAM_SAT_TABLE.length - 1];
  if (P_bar <= first[1]) return first[0];
  if (P_bar >= last[1]) return last[0];

  for (let i = 0; i < STEAM_SAT_TABLE.length - 1; i += 1) {
    const [T0, P0] = STEAM_SAT_TABLE[i];
    const [T1, P1] = STEAM_SAT_TABLE[i + 1];
    if (P0 <= P_bar && P1 >= P_bar) {
      const f = (P_bar - P0) / (P1 - P0);
      return T0 + f * (T1 - T0);
    }
  }

  return last[0];
}