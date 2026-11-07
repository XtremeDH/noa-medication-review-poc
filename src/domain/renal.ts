/** CKD-EPI 2021 (race-free), creatinine in mg/dL. Returns mL/min/1.73 m². */
export function ckdEpi2021(scr: number, age: number, sex: 'F' | 'M'): number {
  const k = sex === 'F' ? 0.7 : 0.9;
  const a = sex === 'F' ? -0.241 : -0.302;
  const r = scr / k;
  const v = 142 * Math.min(r, 1) ** a * Math.max(r, 1) ** -1.2 * 0.9938 ** age * (sex === 'F' ? 1.012 : 1);
  return Math.round(v);
}

/** Cockcroft-Gault creatinine clearance, creatinine in mg/dL, weight in kg. Returns mL/min. */
export function cockcroftGault(scr: number, age: number, weightKg: number, sex: 'F' | 'M'): number {
  return Math.round((((140 - age) * weightKg) / (72 * scr)) * (sex === 'F' ? 0.85 : 1));
}
