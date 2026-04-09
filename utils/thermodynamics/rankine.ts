/**
 * Motor de cálculo del CICLO RANKINE COMPLETO
 * Basado en: Felder & Rousseau, "Principios Elementales de Procesos Químicos"
 * Cap. 7 (Balances de Energía), Cap. 7.4 (Sistemas Abiertos),
 * Cap. 7.5 (Tablas de Vapor), Ej. 7.5-3 (Turbina), Ej. 7.6-1 (Caldera)
 */

import { getSuperheatedEnthalpy, getSatProps, getTsatFromP } from './properties';

// ───────────────────────────────────────────────────
// TIPOS E INTERFACES
// ───────────────────────────────────────────────────

export interface RankineInputs {
  // Campo Fresnel
  n_filas: number;
  ancho_espejo: number;
  largo_fila: number;
  DNI: number;
  eta_optica: number;
  eta_receptor: number;

  // Ciclo de vapor
  T_vapor_C: number;
  P_alta_bar: number;
  P_cond_bar: number;
  eta_turbina: number;
  eta_bomba: number;
  m_dot: number;

  // Operación
  T_amb_C: number;
  horas_dia: number;
  dias_ano: number;
}

export interface EstadoTermo {
  numero: number;
  T: number;
  P_bar: number;
  H: number;
  S: number;
  fase: string;
  calidad?: number;
}

export interface RankineOutputs {
  // Entrada Fresnel
  area_campo_m2: number;
  Q_solar_kW: number;
  Q_util_kW: number;

  // Los 4 estados termodinámicos
  estado_1: EstadoTermo;
  estado_2: EstadoTermo;
  estado_3: EstadoTermo;
  estado_4: EstadoTermo;

  // Balances de energía por equipo
  Q_caldera_kW: number;
  W_turbina_kW: number;
  Q_condensador_kW: number;
  W_bomba_kW: number;

  // Eficiencias
  eta_ciclo: number;
  eta_optica_pct: number;
  eta_total: number;

  // Producción
  W_neta_kW: number;
  energia_diaria_kWh: number;
  energia_anual_MWh: number;
  hogares_abastecidos: number;
  emisiones_evitadas_tCO2: number;

  // Verificación de balance
  balance_error_pct: number;
}

/**
 * CÁLCULO PRINCIPAL DEL CICLO RANKINE
 */
export function calcularCicloRankine(inp: RankineInputs): RankineOutputs {
  const {
    n_filas,
    ancho_espejo,
    largo_fila,
    DNI,
    eta_optica,
    eta_receptor,
    T_vapor_C,
    P_alta_bar,
    P_cond_bar,
    eta_turbina,
    eta_bomba,
    m_dot,
    horas_dia,
    dias_ano,
  } = inp;

  // ─── CAMPO SOLAR FRESNEL ─────────────────────────────
  const area_campo_m2 = n_filas * ancho_espejo * largo_fila;
  const Q_solar_kW = (area_campo_m2 * DNI) / 1000;
  const Q_util_kW = Q_solar_kW * eta_optica * eta_receptor;

  // ─── ESTADO 2: Vapor sobrecalentado (salida caldera) ─
  const [H2, S2] = getSuperheatedEnthalpy(P_alta_bar, T_vapor_C);
  const T_sat_alta = getTsatFromP(P_alta_bar);

  const estado_2: EstadoTermo = {
    numero: 2,
    T: T_vapor_C,
    P_bar: P_alta_bar,
    H: H2,
    S: S2,
    fase: `Vapor sobrecalentado (${(T_vapor_C - T_sat_alta).toFixed(1)}°C de sobrecalentamiento)`,
  };

  // ─── ESTADO 4: Agua líquida saturada (salida condensador) ─
  const T_sat_cond = getTsatFromP(P_cond_bar);
  const satCond = getSatProps(T_sat_cond);
  const H4 = satCond.Hl;
  const S4 = satCond.Sl;

  const estado_4: EstadoTermo = {
    numero: 4,
    T: T_sat_cond,
    P_bar: P_cond_bar,
    H: H4,
    S: S4,
    fase: 'Agua líquida saturada (x = 0)',
    calidad: 0,
  };

  // ─── ESTADO 1: Salida de bomba (agua líquida alta presión) ─
  const V_liq = 0.001; // m³/kg
  const W_bomba_ideal = m_dot * V_liq * (P_alta_bar - P_cond_bar) * 100; // kW (bar -> kPa)
  const W_bomba_kW = W_bomba_ideal / Math.max(eta_bomba, 1e-6);
  const DH_bomba = W_bomba_kW / Math.max(m_dot, 1e-6); // kJ/kg
  const H1 = H4 + DH_bomba;
  const T1_approx = T_sat_cond + DH_bomba / 4.184;

  const estado_1: EstadoTermo = {
    numero: 1,
    T: T1_approx,
    P_bar: P_alta_bar,
    H: H1,
    S: S4,
    fase: 'Agua líquida subenfriada (alta presión)',
  };

  // ─── TURBINA: Expansión isentrópica 2→3 ─
  const denom = satCond.Sv - satCond.Sl;
  const x_iso = denom > 0 ? Math.max(0, Math.min(1, (S2 - satCond.Sl) / denom)) : 0;
  const H3_iso = satCond.Hl + x_iso * (satCond.Hv - satCond.Hl);

  const H3_real = H2 - eta_turbina * (H2 - H3_iso);

  const vapDenom = satCond.Hv - satCond.Hl;
  const x3_real = vapDenom > 0 ? (H3_real - satCond.Hl) / vapDenom : 0;
  const esFaseVapor = H3_real > satCond.Hv;

  let fase3: string;
  let S3: number;
  if (esFaseVapor) {
    fase3 = 'Vapor sobrecalentado';
    S3 = S2;
  } else {
    const xClamped = Math.min(1, Math.max(0, x3_real));
    fase3 = `Mezcla líquido-vapor (x = ${xClamped.toFixed(3)})`;
    S3 = satCond.Sl + xClamped * (satCond.Sv - satCond.Sl);
  }

  const estado_3: EstadoTermo = {
    numero: 3,
    T: T_sat_cond,
    P_bar: P_cond_bar,
    H: H3_real,
    S: S3,
    fase: fase3,
    calidad: Math.min(1, Math.max(0, x3_real)),
  };

  // ─── BALANCES POR EQUIPO ─────────────────────────────
  const Q_caldera_kW = m_dot * (H2 - H1);
  const W_turbina_kW = m_dot * (H2 - H3_real);
  const Q_condensador_kW = m_dot * (H3_real - H4);

  // ─── EFICIENCIAS Y PRODUCCIÓN ───────────────────────
  const W_neta_kW = W_turbina_kW - W_bomba_kW;
  const eta_ciclo = Q_caldera_kW > 0 ? (W_neta_kW / Q_caldera_kW) * 100 : 0;
  const eta_total = eta_optica * eta_receptor * (eta_ciclo / 100) * 100;

  const energia_diaria_kWh = W_neta_kW * horas_dia;
  const energia_anual_MWh = (energia_diaria_kWh * dias_ano) / 1000;
  const hogares_abastecidos = Math.max(0, Math.floor(energia_anual_MWh / 4));
  const emisiones_evitadas_tCO2 = (energia_anual_MWh * 1000 * 0.5) / 1000;

  // ─── VERIFICACIÓN DE BALANCE ─────────────────────────
  const balance_check = Math.abs(Q_caldera_kW - W_turbina_kW + W_bomba_kW - Q_condensador_kW);
  const balance_error_pct = Q_caldera_kW > 0 ? (balance_check / Q_caldera_kW) * 100 : 0;

  return {
    area_campo_m2,
    Q_solar_kW,
    Q_util_kW,
    estado_1,
    estado_2,
    estado_3,
    estado_4,
    Q_caldera_kW,
    W_turbina_kW,
    Q_condensador_kW,
    W_bomba_kW,
    eta_ciclo,
    eta_optica_pct: eta_optica * 100,
    eta_total,
    W_neta_kW,
    energia_diaria_kWh,
    energia_anual_MWh,
    hogares_abastecidos,
    emisiones_evitadas_tCO2,
    balance_error_pct,
  };
}

/**
 * Función de perfil diario de DNI usando curva senoidal.
 * DNI(h) = DNI_max · sin(π·(h-6)/12) para 6 ≤ h ≤ 18, 0 en otro caso.
 */
export function getDNIHora(h: number, DNI_max: number): number {
  if (h < 6 || h > 18) return 0;
  return DNI_max * Math.sin((Math.PI * (h - 6)) / 12);
}

/**
 * Genera curva de sensibilidad: Potencia neta vs DNI para distintas T_vapor.
 */
export function calcularSensibilidad(
  baseInputs: RankineInputs,
  DNI_range: number[],
  T_vapores: number[]
): Record<number, number[]> {
  const resultado: Record<number, number[]> = {};

  for (const Tv of T_vapores) {
    resultado[Tv] = DNI_range.map((dni) => {
      const res = calcularCicloRankine({ ...baseInputs, DNI: dni, T_vapor_C: Tv });
      return res.W_neta_kW;
    });
  }

  return resultado;
}
