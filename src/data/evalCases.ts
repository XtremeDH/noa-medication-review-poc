// Frozen rule unit cases (should fire / should not fire / borderline / missing data).
// Illustrative: real reference answers come from two blinded clinicians.
import { runReview } from '../domain/engine';
import type { L } from '../domain/lang';
import { RULE_BY_ID } from '../domain/rules';
import type { Condition, Lab, Medication, Patient, Severity } from '../domain/types';

type MedSpec = [ingredient: string, dose: number, perDay: number, extra?: Partial<Medication>];

interface Spec {
  age?: number;
  sex?: 'F' | 'M';
  weight?: number | null;
  conds?: string[];
  meds: MedSpec[];
  labs?: Partial<Record<Lab['test'], number | null | [number, string]>>;
  falls?: number;
  anticoagReason?: string;
}

export type CaseKind = 'fire' | 'notFire' | 'borderline' | 'missing';

export const CASE_KIND_LABEL: Record<CaseKind, L> = {
  fire: { es: 'Debe disparar', en: 'Should fire' },
  notFire: { es: 'No debe disparar', en: 'Should not fire' },
  borderline: { es: 'Límite', en: 'Borderline' },
  missing: { es: 'Faltan datos', en: 'Missing data' },
};

export interface EvalCase {
  id: string;
  title: L;
  kind: CaseKind;
  patient: Patient;
  fire?: string[];
  notFire?: string[];
  blocked?: string[];
}

const LAB_DATE = '2026-10-15';
const UNITS: Record<Lab['test'], string> = { creatinine: 'mg/dL', potassium: 'mmol/L', sodium: 'mmol/L', hba1c: '%', inr: '' };
const DEFAULT_LABS: Record<Lab['test'], number> = { creatinine: 0.9, potassium: 4.5, sodium: 140, hba1c: 7, inr: 2.5 };

function mk(s: Spec): Patient {
  const labs: Lab[] = [];
  for (const test of Object.keys(DEFAULT_LABS) as Lab['test'][]) {
    const v = s.labs && test in s.labs ? s.labs[test] : DEFAULT_LABS[test];
    if (v === null || v === undefined) continue;
    const [value, date] = Array.isArray(v) ? v : [v, LAB_DATE];
    labs.push({ test, value, unit: UNITS[test], date, origin: 'Caso sintético' });
  }
  return {
    id: 'eval', recordId: 'EVAL', name: 'Caso sintético', age: s.age ?? 78, sex: s.sex ?? 'F',
    weight_kg: s.weight === null ? undefined : (s.weight ?? 70), weight_date: s.weight === null ? undefined : LAB_DATE,
    insurer: '', visitDate: '2026-11-08', reason: '',
    conditions: (s.conds ?? []).map<Condition>((code) => ({ code, label: code, source: 'record' })),
    medications: s.meds.map(([ingredient, dose, perDay, extra], i) => ({
      id: `e${i}`, name: ingredient, ingredient, dose_mg: dose, doses_per_day: perDay, frequency: null,
      regular: true, status: 'taking', source: 'record', since: '2025-01-01', ...extra,
    })),
    labs, allergies: [],
    context: { falls_last_12m: s.falls ?? 0, pregnancy: false, chemotherapy: false, palliative: false, anticoag_reason: s.anticoagReason },
    transcript: [], extraction: [],
  };
}

const c = (id: string, es: string, en: string, kind: CaseKind, spec: Spec, exp: Pick<EvalCase, 'fire' | 'notFire' | 'blocked'>): EvalCase =>
  ({ id, title: { es, en }, kind, patient: mk(spec), ...exp });

export const EVAL_CASES: EvalCase[] = [
  c('K1-a', 'Metformina 1700 mg/día con FGe 33', 'Metformin 1700 mg/day with eGFR 33', 'fire', { meds: [['metformin', 850, 2]], labs: { creatinine: 1.6 } }, { fire: ['K1'] }),
  c('K1-b', 'Metformina con FGe normal', 'Metformin with normal eGFR', 'notFire', { meds: [['metformin', 850, 2]], labs: { creatinine: 0.8 } }, { notFire: ['K1'] }),
  c('K1-c', 'Metformina con creatinina de hace 5 meses y FGe <45', 'Metformin, creatinine 5 months old and eGFR <45', 'missing', { meds: [['metformin', 850, 2]], labs: { creatinine: [1.6, '2026-06-01'] } }, { blocked: ['K1'] }),
  c('K2-a', 'Apixabán 5 mg/12 h, 58 kg, creatinina 1,6', 'Apixaban 5 mg bd, 58 kg, creatinine 1.6', 'fire', { conds: ['I48'], weight: 58, meds: [['apixaban', 5, 2]], labs: { creatinine: 1.6 } }, { fire: ['K2'] }),
  c('K2-b', 'Apixabán con solo 1 de 3 criterios', 'Apixaban with only 1 of 3 criteria', 'borderline', { conds: ['I48'], weight: 65, meds: [['apixaban', 5, 2]], labs: { creatinine: 1.6 } }, { notFire: ['K2'] }),
  c('K2-c', 'Apixabán ya a 2,5 mg/12 h', 'Apixaban already at 2.5 mg bd', 'notFire', { conds: ['I48'], age: 82, weight: 55, meds: [['apixaban', 2.5, 2]], labs: { creatinine: 1.6 } }, { notFire: ['K2'] }),
  c('K2-d', 'Apixabán sin creatinina registrada', 'Apixaban with no creatinine on record', 'missing', { conds: ['I48'], meds: [['apixaban', 5, 2]], labs: { creatinine: null } }, { blocked: ['K2'] }),
  c('K3-a', 'Rivaroxabán 20 mg con ClCr 27', 'Rivaroxaban 20 mg with CrCl 27', 'fire', { conds: ['I48'], weight: 58, meds: [['rivaroxaban', 20, 1]], labs: { creatinine: 1.6 } }, { fire: ['K3'] }),
  c('K3-b', 'Rivaroxabán sin peso', 'Rivaroxaban with no weight', 'missing', { conds: ['I48'], weight: null, meds: [['rivaroxaban', 20, 1]] }, { blocked: ['K3'] }),
  c('K4-a', 'Nitrofurantoína con FGe 33', 'Nitrofurantoin with eGFR 33', 'fire', { meds: [['nitrofurantoin', 50, 4]], labs: { creatinine: 1.6 } }, { fire: ['K4'] }),
  c('K5-a', 'Gabapentina 1800 mg/día con ClCr 27', 'Gabapentin 1800 mg/day with CrCl 27', 'fire', { weight: 58, meds: [['gabapentin', 600, 3]], labs: { creatinine: 1.6 } }, { fire: ['K5'] }),
  c('K6-a', 'Ibuprofeno pautado con FGe 33', 'Regular ibuprofen with eGFR 33', 'fire', { meds: [['ibuprofen', 400, 3]], labs: { creatinine: 1.6 } }, { fire: ['K6'] }),
  c('K6-b', 'Ibuprofeno a demanda con FGe 33', 'As-needed ibuprofen with eGFR 33', 'notFire', { meds: [['ibuprofen', 400, 1, { regular: false }]], labs: { creatinine: 1.6 } }, { notFire: ['K6'] }),
  c('I1-a', 'Ibuprofeno + ramipril + furosemida', 'Ibuprofen + ramipril + furosemide', 'fire', { meds: [['ibuprofen', 400, 3], ['ramipril', 5, 1], ['furosemide', 40, 1]] }, { fire: ['I1'] }),
  c('I2-a', 'Apixabán + ibuprofeno', 'Apixaban + ibuprofen', 'fire', { conds: ['I48'], meds: [['apixaban', 5, 2], ['ibuprofen', 400, 3]] }, { fire: ['I2'] }),
  c('I2-b', 'Apixabán + clopidogrel con indicación documentada', 'Apixaban + clopidogrel with documented indication', 'notFire', { conds: ['I48', 'I25'], meds: [['apixaban', 5, 2], ['clopidogrel', 75, 1, { indication: 'Stent coronario 2026' }]] }, { notFire: ['I2'] }),
  c('I2-c', 'Acenocumarol + ibuprofeno sin INR reciente', 'Acenocoumarol + ibuprofen without recent INR', 'missing', { conds: ['I48'], meds: [['acenocoumarol', 4, 1], ['ibuprofen', 400, 3]], labs: { inr: [2.4, '2026-08-01'] } }, { blocked: ['I2'] }),
  c('I3-a', 'Espironolactona + ramipril, K 5,4', 'Spironolactone + ramipril, K 5.4', 'fire', { meds: [['spironolactone', 25, 1], ['ramipril', 5, 1]], labs: { potassium: 5.4 } }, { fire: ['I3'] }),
  c('I3-b', 'Espironolactona + ramipril, K 4,8', 'Spironolactone + ramipril, K 4.8', 'notFire', { meds: [['spironolactone', 25, 1], ['ramipril', 5, 1]], labs: { potassium: 4.8 } }, { notFire: ['I3'] }),
  c('I4-a', 'Amiodarona + digoxina 0,25 mg', 'Amiodarone + digoxin 0.25 mg', 'fire', { meds: [['amiodarone', 200, 1], ['digoxin', 0.25, 1]] }, { fire: ['I4'] }),
  c('I4-b', 'Amiodarona + digoxina 0,125 mg', 'Amiodarone + digoxin 0.125 mg', 'borderline', { meds: [['amiodarone', 200, 1], ['digoxin', 0.125, 1]] }, { notFire: ['I4'] }),
  c('I5-a', 'Claritromicina + simvastatina', 'Clarithromycin + simvastatin', 'fire', { meds: [['clarithromycin', 500, 2], ['simvastatin', 20, 1]] }, { fire: ['I5'] }),
  c('I6-a', 'Lorazepam + tramadol', 'Lorazepam + tramadol', 'fire', { meds: [['lorazepam', 1, 1], ['tramadol', 50, 3]] }, { fire: ['I6'] }),
  c('I7-a', 'Enalapril + losartán', 'Enalapril + losartan', 'fire', { meds: [['enalapril', 20, 1], ['losartan', 50, 1]] }, { fire: ['I7'] }),
  c('S1-a', 'Naproxeno en insuficiencia cardiaca', 'Naproxen in heart failure', 'fire', { conds: ['I50.2'], meds: [['naproxen', 550, 2]] }, { fire: ['S1'] }),
  c('S2-a', 'Zolpidem con caída reciente', 'Zolpidem with a recent fall', 'fire', { falls: 1, meds: [['zolpidem', 10, 1]] }, { fire: ['S2'] }),
  c('S2-b', 'Zolpidem sin caídas', 'Zolpidem with no falls', 'notFire', { meds: [['zolpidem', 10, 1]] }, { notFire: ['S2'] }),
  c('S3-a', 'Glibenclamida', 'Glibenclamide', 'fire', { meds: [['glibenclamide', 5, 2]] }, { fire: ['S3'] }),
  c('S4-a', 'Oxibutinina + amitriptilina', 'Oxybutynin + amitriptyline', 'fire', { meds: [['oxybutynin', 5, 2], ['amitriptyline', 25, 1]] }, { fire: ['S4'] }),
  c('S5-a', 'AAS sin indicación', 'Aspirin with no indication', 'fire', { meds: [['aspirin', 100, 1]] }, { fire: ['S5'] }),
  c('S5-b', 'AAS con cardiopatía isquémica', 'Aspirin with ischaemic heart disease', 'notFire', { conds: ['I25'], meds: [['aspirin', 100, 1]] }, { notFire: ['S5'] }),
  c('S6-a', 'Omeprazol 22 meses sin indicación', 'Omeprazole for 22 months with no indication', 'fire', { meds: [['omeprazole', 20, 1]] }, { fire: ['S6'] }),
  c('S7-a', 'Hidroclorotiazida con sodio 128', 'Hydrochlorothiazide with sodium 128', 'fire', { meds: [['hydrochlorothiazide', 25, 1]], labs: { sodium: 128 } }, { fire: ['S7'] }),
  c('T1-a', 'FA sin anticoagulante', 'AF with no anticoagulant', 'fire', { conds: ['I48'], meds: [['bisoprolol', 5, 1]] }, { fire: ['T1'] }),
  c('T1-b', 'FA sin anticoagulante con motivo documentado', 'AF with no anticoagulant, reason documented', 'notFire', { conds: ['I48'], anticoagReason: 'Hemorragia intracraneal 2025', meds: [['bisoprolol', 5, 1]] }, { notFire: ['T1'] }),
  c('T2-a', 'IC-FEr sin IECA/ARA-II/INRA', 'HFrEF with no ACEi/ARB/ARNI', 'fire', { conds: ['I50.2'], meds: [['furosemide', 40, 1]] }, { fire: ['T2'] }),
  c('T3-a', 'DM2 + ERC sin iSGLT2', 'T2DM + CKD with no SGLT2 inhibitor', 'fire', { conds: ['E11', 'N18.3'], meds: [['metformin', 500, 2]], labs: { creatinine: 1.2 } }, { fire: ['T3'] }),
  c('T4-a', 'Tramadol pautado sin laxante', 'Regular tramadol with no laxative', 'fire', { meds: [['tramadol', 50, 3]] }, { fire: ['T4'] }),
  c('T5-a', 'Prednisona 22 meses sin protección ósea', 'Prednisone for 22 months with no bone protection', 'fire', { meds: [['prednisone', 7.5, 1]] }, { fire: ['T5'] }),
];

export interface EvalOutcome {
  case: EvalCase;
  pass: boolean;
  fired: string[];
  blocked: string[];
  missed: string[];
  unexpected: string[];
}

export function runEval(disabledRules?: ReadonlySet<string>): EvalOutcome[] {
  return EVAL_CASES.map((ec) => {
    const r = runReview(ec.patient, ec.patient.medications, { ignoreScope: true, disabledRules });
    const missed = [
      ...(ec.fire ?? []).filter((id) => !r.fired.includes(id)),
      ...(ec.blocked ?? []).filter((id) => !r.blocked.includes(id)),
    ];
    const unexpected = (ec.notFire ?? []).filter((id) => r.fired.includes(id));
    return { case: ec, pass: !missed.length && !unexpected.length, fired: r.fired, blocked: r.blocked, missed, unexpected };
  });
}

export function majorSensitivity(outcomes: EvalOutcome[]) {
  const sev = (id: string): Severity => RULE_BY_ID[id].severity;
  const expected = outcomes.flatMap((o) => (o.case.fire ?? []).filter((id) => sev(id) === 'major'));
  const found = outcomes.flatMap((o) => (o.case.fire ?? []).filter((id) => sev(id) === 'major' && o.fired.includes(id)));
  return { expected: expected.length, found: found.length };
}
