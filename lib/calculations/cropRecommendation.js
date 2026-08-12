// Biostimulant abiotic stress engine — cardinal temperature formulas.

export const CROP_THRESHOLDS = {
  Soybean: { tMaxOpt: 32, tMaxLimit: 45, tMinOpt: 22, tMinLimit: 28, tBase: 10, gddOpt: 1400, pOpt: 6, phOpt: 6.5, nOpt: 100 },
  Corn: { tMaxOpt: 33, tMaxLimit: 44, tMinOpt: 22, tMinLimit: 28, tBase: 10, gddOpt: 1500, pOpt: 6, phOpt: 6.2, nOpt: 150 },
  Cotton: { tMaxOpt: 32, tMaxLimit: 38, tMinOpt: 20, tMinLimit: 25, tBase: 15, gddOpt: 1600, pOpt: 5, phOpt: 6.5, nOpt: 120 },
  Rice: { tMaxOpt: 32, tMaxLimit: 38, tMinOpt: 22, tMinLimit: 28, tBase: 10, gddOpt: 1300, pOpt: 8, phOpt: 6.0, nOpt: 120 },
  Wheat: { tMaxOpt: 25, tMaxLimit: 32, tMinOpt: 15, tMinLimit: 20, tBase: 5, gddOpt: 1100, pOpt: 4, phOpt: 6.8, nOpt: 120 },
};

export const CROP_LIST = Object.keys(CROP_THRESHOLDS);

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function resolveCrop(crop) {
  if (!crop) return CROP_THRESHOLDS.Rice;
  const key = Object.keys(CROP_THRESHOLDS).find(
    (c) => c.toLowerCase() === String(crop).toLowerCase()
  );
  return CROP_THRESHOLDS[key] || CROP_THRESHOLDS.Rice;
}

// A. Diurnal Daytime Heat Stress (0..9)
export function diurnalHeatStress(tmax, crop) {
  const t = resolveCrop(crop);
  if (tmax === null || tmax === undefined) return 0;
  if (tmax <= t.tMaxOpt) return 0;
  if (tmax >= t.tMaxLimit) return 9;
  return clamp(9 * ((tmax - t.tMaxOpt) / (t.tMaxLimit - t.tMaxOpt)), 0, 9);
}

// B. Nighttime Heat Stress (0..9)
export function nightHeatStress(tmin, crop) {
  const t = resolveCrop(crop);
  if (tmin === null || tmin === undefined) return 0;
  if (tmin < t.tMinOpt) return 0;
  if (tmin >= t.tMinLimit) return 9;
  return clamp(9 * ((tmin - t.tMinOpt) / (t.tMinLimit - t.tMinOpt)), 0, 9);
}

// C. Frost Stress (0..9) — only when TMIN <= 4C
export function frostStress(tmin) {
  if (tmin === null || tmin === undefined) return 0;
  if (tmin > 4) return 0;
  if (tmin <= -3) return 9;
  return clamp(9 * (Math.abs(tmin - 4) / Math.abs(-3 - 4)), 0, 9);
}

// D. Drought Risk Index (DI)
export function droughtIndex(P, E, SM, T) {
  if (T === null || T === undefined || T === 0) return null;
  const di = ((P - E) + SM) / T;
  let risk = 'Medium Risk';
  if (di > 1) risk = 'No Risk';
  else if (di < 1) risk = 'High Risk';
  return { value: di, risk };
}

// E. Yield Risk Index (YR)
export function yieldRisk({ tmax, tmin, precip, ph, nitrogen, crop }) {
  const t = resolveCrop(crop);
  const gdd = (tmax + tmin) / 2 - t.tBase;
  const phVal = ph ?? t.phOpt;
  const nVal = nitrogen ?? t.nOpt;
  const yr =
    0.3 * Math.pow(gdd - t.gddOpt, 2) +
    0.3 * Math.pow((precip ?? t.pOpt) - t.pOpt, 2) +
    0.2 * Math.pow(phVal - t.phOpt, 2) +
    0.2 * Math.pow(nVal - t.nOpt, 2);
  return { value: yr, gdd };
}

// F. Product Matching Engine
export function recommendProduct({ diurnal, night, frost, di }) {
  const diVal = di?.value ?? 0;
  if (diurnal > 4 || night > 4 || frost > 0) {
    return {
      product: 'Syngenta Stress Buster',
      brand: 'Quantis / Isabion',
      rationale:
        'Elevated heat or frost stress detected. A biostimulant that protects cellular function and speeds recovery is advised.',
      category: 'stress',
    };
  }
  if (diurnal <= 4 && night <= 4 && diVal >= 1) {
    return {
      product: 'Syngenta Yield Booster',
      brand: 'YieldOn',
      rationale:
        'Stress is low and moisture is adequate — an ideal window to push productivity and grain/fruit fill.',
      category: 'yield',
    };
  }
  return {
    product: 'Syngenta Yield Booster',
    brand: 'YieldOn',
    rationale: 'Conditions are moderate. Support crop vigour to maintain yield potential.',
    category: 'yield',
  };
}

// Smart Pump-Count Dosing Calculator
export function computeDosing(acres) {
  const a = Math.max(1, Math.round(Number(acres) || 1));
  const capsPerTank = 4; // 4 caps x 15ml = 60ml per 15L pump
  const pumpsPerAcre = 4;
  const totalPumps = pumpsPerAcre * a;
  const totalCaps = capsPerTank * totalPumps;
  const totalMl = totalCaps * 15;
  return {
    acres: a,
    capsPerTank,
    pumpsPerAcre,
    totalPumps,
    totalCaps,
    totalLitres: +(totalMl / 1000).toFixed(2),
    message: `For ${a} acre${a > 1 ? 's' : ''}, mix ${capsPerTank} bottle caps (15 ml each) per 15L sprayer pump tank. Apply ${pumpsPerAcre} pumps per acre (${totalPumps} pumps total).`,
  };
}

// Full diagnostic — combine everything.
export function computeStressDiagnostic({ weather, crop, areaInAcres, soilPh, nitrogenKgPerHa }) {
  const { tmax, tmin, precip, soilMoisturePct, evaporation, tavg } = weather;
  const diurnal = +diurnalHeatStress(tmax, crop).toFixed(2);
  const night = +nightHeatStress(tmin, crop).toFixed(2);
  const frost = +frostStress(tmin).toFixed(2);
  const di = droughtIndex(precip ?? 0, evaporation ?? 0, soilMoisturePct ?? 0, tavg ?? 0);
  const yr = yieldRisk({ tmax, tmin, precip, ph: soilPh, nitrogen: nitrogenKgPerHa, crop });
  const product = recommendProduct({ diurnal, night, frost, di });
  const dosing = computeDosing(areaInAcres);
  return {
    crop,
    tmax,
    tmin,
    tavg,
    precip,
    soilMoisturePct,
    evaporation,
    scores: { diurnal, night, frost },
    droughtIndex: di,
    yieldRisk: yr,
    product,
    dosing,
  };
}
