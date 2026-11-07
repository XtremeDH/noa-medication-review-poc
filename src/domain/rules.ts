import type { DrugClass } from './drugs';
import { dailyDose, egfrUnit, type RuleContext } from './context';
import { daysBetween } from './dates';
import { td, type L, type Lang } from './lang';
import type { Criterion, Fact, InputKey, Medication, RuleType, Severity } from './types';

export interface RuleHit {
  primary: string;
  primaryLabel: string;
  meds: Medication[];
  severity?: Severity;
  message: string;
  action: string;
  criteria: Criterion[];
  facts: Fact[];
  actionToday?: boolean;
  needsJudgement?: string;
}

export interface Rule {
  id: string;
  version: string;
  type: RuleType;
  severity: Severity;
  summary: L;
  sourceId: string;
  requires: InputKey[] | ((c: RuleContext) => InputKey[]);
  /** Must only look at medicines, conditions and context, never at labs (labs are gated by `requires`). */
  applies: (c: RuleContext) => boolean;
  evaluate: (c: RuleContext) => RuleHit | null;
  author: L;
  reviewedBy: L;
  lastReviewed: string;
}

const META = {
  author: { es: 'Farmacéutico clínico (ilustrativo)', en: 'Clinical pharmacist (illustrative)' },
  reviewedBy: { es: 'Médico (ilustrativo)', en: 'Physician (illustrative)' },
  lastReviewed: '2026-10-01',
};
const crit = (label: string, expected: string, found: string, met = true): Criterion => ({ label, expected, found, met });
const on = (c: RuleContext, m: Medication) => ({ primary: m.ingredient ?? m.name, primaryLabel: c.name(m) });
const names = (c: RuleContext, ms: Medication[]) => ms.map(c.name).join(', ');
const present = (c: RuleContext) => c.t('Presente', 'Present');
const absent = (c: RuleContext) => c.t('Ausente', 'Absent');
const raas = (c: RuleContext) => [...c.of('acei'), ...c.of('arb'), ...c.of('arni')];
const anticoags = (c: RuleContext) => [...c.of('doac'), ...c.of('vka')];
const sedatives = (c: RuleContext) => [...c.of('benzo'), ...c.of('zdrug')];
const diuretics = (c: RuleContext) => [...c.of('loop'), ...c.of('thiazide'), ...c.of('mra')];
const SECONDARY_PREVENTION = ['I20', 'I21', 'I22', 'I23', 'I24', 'I25', 'I63', 'I64', 'I70', 'I73', 'Z95'];

function duplication(c: RuleContext): { a: Medication; b: Medication; label: string } | null {
  const r = raas(c);
  if (r.length >= 2)
    return { a: r[0], b: r[1], label: c.t('doble bloqueo del sistema renina-angiotensina', 'dual renin-angiotensin system blockade') };
  const groups: [DrugClass, string, string][] = [
    ['nsaid', 'dos AINE', 'two NSAIDs'],
    ['benzo', 'dos benzodiacepinas', 'two benzodiazepines'],
    ['ppi', 'dos IBP', 'two PPIs'],
    ['doac', 'dos anticoagulantes orales directos', 'two direct oral anticoagulants'],
    ['opioid', 'dos opioides', 'two opioids'],
  ];
  for (const [k, es, en] of groups) {
    const ms = c.of(k);
    if (ms.length >= 2) return { a: ms[0], b: ms[1], label: c.t(es, en) };
  }
  return null;
}

const gabapentinoidMax = (ingredient: string, cl: number) =>
  ingredient === 'gabapentin'
    ? cl >= 80 ? 3600 : cl >= 50 ? 1800 : cl >= 30 ? 900 : cl >= 15 ? 600 : 300
    : cl >= 60 ? 600 : cl >= 30 ? 300 : cl >= 15 ? 150 : 75;

export const RULES: Rule[] = [
  {
    id: 'K1', version: '1.0.0', type: 'kidney_dosing', severity: 'major', sourceId: 'smpc-metformin',
    summary: {
      es: 'Metformina con FGe <30: suspender; FGe 30-44: reducir dosis máxima',
      en: 'Metformin with eGFR <30: stop; eGFR 30-44: reduce maximum dose',
    },
    requires: ['creatinine'],
    applies: (c) => c.has('biguanide'),
    evaluate: (c) => {
      const m = c.of('biguanide')[0];
      const e = c.egfr!;
      const d = dailyDose(m);
      const facts = [c.fMed(m), c.fEgfr()];
      const eg = c.t('FGe', 'eGFR');
      if (e < 30)
        return {
          ...on(c, m), meds: [m], severity: 'major', facts,
          message: c.t(`Metformina con FGe ${e} ${egfrUnit('es')} (menor de 30).`, `Metformin with eGFR ${e} ${egfrUnit('en')} (below 30).`),
          action: c.t('Suspender metformina: contraindicada con FGe menor de 30 según ficha técnica.', 'Stop metformin: contraindicated with eGFR below 30 per the SmPC.'),
          criteria: [crit(eg, '< 30', `${e}`)],
        };
      if (e < 45 && d !== null && d > 1000)
        return {
          ...on(c, m), meds: [m], severity: 'moderate', facts,
          message: c.t(
            `Metformina ${c.num(d)} mg/día con FGe ${e}; con FGe 30-44 la dosis máxima es 1000 mg/día.`,
            `Metformin ${c.num(d)} mg/day with eGFR ${e}; with eGFR 30-44 the maximum dose is 1000 mg/day.`,
          ),
          action: c.t('Reducir metformina a un máximo de 1000 mg/día y vigilar la función renal.', 'Reduce metformin to a maximum of 1000 mg/day and monitor kidney function.'),
          criteria: [crit(eg, '30-44', `${e}`), crit(c.t('Dosis diaria', 'Daily dose'), '> 1000 mg', `${c.num(d)} mg`)],
        };
      return null;
    },
    ...META,
  },
  {
    id: 'K2', version: '1.2.0', type: 'kidney_dosing', severity: 'major', sourceId: 'smpc-apixaban',
    summary: {
      es: 'Apixabán 5 mg dos veces al día con 2 de 3: edad ≥80, peso ≤60 kg, creatinina ≥1,5 mg/dL',
      en: 'Apixaban 5 mg twice daily with 2 of 3: age ≥80, weight ≤60 kg, creatinine ≥1.5 mg/dL',
    },
    requires: ['weight', 'creatinine'],
    applies: (c) => !!c.ing('apixaban') && !!c.cond('I48'),
    evaluate: (c) => {
      const m = c.ing('apixaban')!;
      const cr = c.lab('creatinine')!;
      const w = c.patient.weight_kg!;
      const age = c.patient.age;
      const cs = [
        crit(c.t('Edad', 'Age'), c.t('≥ 80 años', '≥ 80 years'), c.t(`${age} años`, `${age} years`), age >= 80),
        crit(c.t('Peso', 'Weight'), '≤ 60 kg', `${c.num(w)} kg`, w <= 60),
        crit(c.t('Creatinina', 'Creatinine'), c.t('≥ 1,5 mg/dL', '≥ 1.5 mg/dL'), `${c.num(cr.value)} mg/dL`, cr.value >= 1.5),
      ];
      const n = cs.filter((x) => x.met).length;
      const d = dailyDose(m);
      if (n < 2 || d === null || d <= 5) return null;
      return {
        ...on(c, m), meds: [m],
        message: c.t(
          `Dosis de apixabán posiblemente alta: se cumplen ${n} de 3 criterios de reducción de dosis.`,
          `Apixaban dose may be too high: ${n} of 3 dose-reduction criteria met.`,
        ),
        action: c.t(
          'Revisar dosis: con 2 o más criterios, la dosis de ficha técnica es 2,5 mg dos veces al día.',
          'Review dose: with 2 or more criteria, the label dose is 2.5 mg twice daily.',
        ),
        criteria: [...cs, crit(c.t('Dosis diaria', 'Daily dose'), '> 5 mg', `${c.num(d)} mg`)],
        facts: [c.fMed(m), c.fAge(), c.fWeight(), c.fLab(cr)],
      };
    },
    ...META,
  },
  {
    id: 'K3', version: '1.0.0', type: 'kidney_dosing', severity: 'major', sourceId: 'smpc-rivaroxaban',
    summary: {
      es: 'Rivaroxabán en FA con ClCr 15-49 mL/min no a 15 mg; ClCr <15: evitar',
      en: 'Rivaroxaban in AF with CrCl 15-49 mL/min not at 15 mg; CrCl <15: avoid',
    },
    requires: ['weight', 'creatinine'],
    applies: (c) => !!c.ing('rivaroxaban') && !!c.cond('I48'),
    evaluate: (c) => {
      const m = c.ing('rivaroxaban')!;
      const cl = c.crcl!;
      const d = dailyDose(m);
      const facts = [c.fMed(m), c.fCrcl(), c.fLab(c.lab('creatinine')!), c.fWeight(), c.fAge()];
      const clLabel = c.t('ClCr (Cockcroft-Gault)', 'CrCl (Cockcroft-Gault)');
      if (cl < 15)
        return {
          ...on(c, m), meds: [m], facts,
          message: c.t(`Rivaroxabán con ClCr ${cl} mL/min (menor de 15).`, `Rivaroxaban with CrCl ${cl} mL/min (below 15).`),
          action: c.t('Evitar rivaroxabán; valorar alternativa.', 'Avoid rivaroxaban; consider an alternative.'),
          criteria: [crit(clLabel, '< 15 mL/min', `${cl} mL/min`)],
        };
      if (cl < 50 && d !== null && d !== 15)
        return {
          ...on(c, m), meds: [m], facts,
          message: c.t(
            `Rivaroxabán ${c.num(d)} mg/día con ClCr ${cl} mL/min; en FA con ClCr 15-49 la dosis es 15 mg/día.`,
            `Rivaroxaban ${c.num(d)} mg/day with CrCl ${cl} mL/min; in AF with CrCl 15-49 the dose is 15 mg/day.`,
          ),
          action: c.t('Revisar dosis: 15 mg una vez al día.', 'Review dose: 15 mg once daily.'),
          criteria: [crit(clLabel, '15-49 mL/min', `${cl} mL/min`), crit(c.t('Dosis diaria', 'Daily dose'), '≠ 15 mg', `${c.num(d)} mg`)],
        };
      return null;
    },
    ...META,
  },
  {
    id: 'K4', version: '1.0.0', type: 'kidney_dosing', severity: 'moderate', sourceId: 'smpc-nitrofurantoin',
    summary: { es: 'Nitrofurantoína con FGe <45', en: 'Nitrofurantoin with eGFR <45' },
    requires: ['creatinine'],
    applies: (c) => c.has('nitrofurantoin'),
    evaluate: (c) => {
      const m = c.of('nitrofurantoin')[0];
      if (c.egfr! >= 45) return null;
      return {
        ...on(c, m), meds: [m],
        message: c.t(
          `Nitrofurantoína con FGe ${c.egfr}: eficacia reducida y más toxicidad.`,
          `Nitrofurantoin with eGFR ${c.egfr}: reduced efficacy and more toxicity.`,
        ),
        action: c.t('Evitar nitrofurantoína; elegir otro antibiótico según antibiograma.', 'Avoid nitrofurantoin; choose another antibiotic guided by culture.'),
        criteria: [crit(c.t('FGe', 'eGFR'), '< 45', `${c.egfr}`)],
        facts: [c.fMed(m), c.fEgfr()],
      };
    },
    ...META,
  },
  {
    id: 'K5', version: '1.0.0', type: 'kidney_dosing', severity: 'moderate', sourceId: 'smpc-gabapentinoids',
    summary: {
      es: 'Gabapentina o pregabalina por encima de la dosis para el ClCr del paciente',
      en: "Gabapentin or pregabalin above the dose for the patient's CrCl",
    },
    requires: ['weight', 'creatinine'],
    applies: (c) => c.has('gabapentinoid'),
    evaluate: (c) => {
      const m = c.of('gabapentinoid')[0];
      const d = dailyDose(m);
      const max = gabapentinoidMax(m.ingredient!, c.crcl!);
      if (d === null || d <= max) return null;
      return {
        ...on(c, m), meds: [m],
        message: c.t(
          `${c.name(m)} ${c.num(d)} mg/día con ClCr ${c.crcl} mL/min; máximo ${max} mg/día.`,
          `${c.name(m)} ${c.num(d)} mg/day with CrCl ${c.crcl} mL/min; maximum ${max} mg/day.`,
        ),
        action: c.t(`Ajustar a un máximo de ${max} mg/día.`, `Adjust to a maximum of ${max} mg/day.`),
        criteria: [
          crit(c.t('ClCr (Cockcroft-Gault)', 'CrCl (Cockcroft-Gault)'), c.t('Tramo de dosis', 'Dose band'), `${c.crcl} mL/min`),
          crit(c.t('Dosis diaria', 'Daily dose'), `> ${max} mg`, `${c.num(d)} mg`),
        ],
        facts: [c.fMed(m), c.fCrcl(), c.fWeight()],
      };
    },
    ...META,
  },
  {
    id: 'K6', version: '1.0.0', type: 'kidney_dosing', severity: 'major', sourceId: 'stopp-nsaid-renal',
    summary: { es: 'AINE pautado con FGe <50', en: 'Regular NSAID with eGFR <50' },
    requires: ['creatinine'],
    applies: (c) => c.of('nsaid').some((m) => m.regular),
    evaluate: (c) => {
      const m = c.of('nsaid').find((x) => x.regular)!;
      if (c.egfr! >= 50) return null;
      return {
        ...on(c, m), meds: [m],
        message: c.t(
          `${c.name(m)} de uso habitual con FGe ${c.egfr}: riesgo de deterioro de la función renal.`,
          `Regular ${c.name(m).toLowerCase()} with eGFR ${c.egfr}: risk of worsening kidney function.`,
        ),
        action: c.t('Retirar el AINE; valorar analgesia alternativa.', 'Stop the NSAID; consider alternative analgesia.'),
        criteria: [crit(c.t('Uso', 'Use'), c.t('Habitual', 'Regular'), c.t('Habitual', 'Regular')), crit(c.t('FGe', 'eGFR'), '< 50', `${c.egfr}`)],
        facts: [c.fMed(m), c.fEgfr()],
      };
    },
    ...META,
  },
  {
    id: 'I1', version: '1.0.0', type: 'interaction', severity: 'major', sourceId: 'stopp-triple-whammy',
    summary: {
      es: 'AINE + IECA o ARA-II + diurético (riesgo de fracaso renal agudo)',
      en: 'NSAID + ACE inhibitor or ARB + diuretic (acute kidney injury risk)',
    },
    requires: [],
    applies: (c) => c.has('nsaid') && raas(c).length > 0 && diuretics(c).length > 0,
    evaluate: (c) => {
      const n = c.of('nsaid')[0];
      const r = raas(c)[0];
      const di = diuretics(c)[0];
      return {
        ...on(c, n), meds: [n, r, di],
        message: c.t(
          `${c.name(n)} con ${c.name(r)} y ${c.name(di)}: riesgo de fracaso renal agudo.`,
          `${c.name(n)} with ${c.name(r)} and ${c.name(di)}: risk of acute kidney injury.`,
        ),
        action: c.t('Retirar el AINE o sustituirlo; si se mantiene, controlar creatinina.', 'Stop or replace the NSAID; if continued, check creatinine.'),
        criteria: [
          crit(c.t('AINE', 'NSAID'), present(c), c.name(n)),
          crit(c.t('IECA / ARA-II', 'ACE inhibitor / ARB'), present(c), c.name(r)),
          crit(c.t('Diurético', 'Diuretic'), present(c), c.name(di)),
        ],
        facts: [c.fMed(n), c.fMed(r), c.fMed(di)],
      };
    },
    ...META,
  },
  {
    id: 'I2', version: '1.1.0', type: 'interaction', severity: 'major', sourceId: 'stopp-anticoag-bleeding',
    summary: {
      es: 'Anticoagulante + AINE o antiagregante sin indicación documentada',
      en: 'Anticoagulant + NSAID or antiplatelet without a documented indication',
    },
    requires: (c) => (c.has('vka') ? ['inr'] : []),
    applies: (c) =>
      anticoags(c).length > 0 && (c.has('nsaid') || c.of('antiplatelet').some((m) => !m.indication)),
    evaluate: (c) => {
      const ac = anticoags(c)[0];
      const other = c.of('nsaid')[0] ?? c.of('antiplatelet').find((m) => !m.indication)!;
      const isNsaid = c.has('nsaid');
      return {
        ...on(c, other), meds: [other, ac],
        message: c.t(
          `${c.name(ac)} con ${c.name(other)}${isNsaid ? '' : ' sin indicación documentada'}: riesgo de hemorragia.`,
          `${c.name(ac)} with ${c.name(other)}${isNsaid ? '' : ' without a documented indication'}: bleeding risk.`,
        ),
        action: isNsaid
          ? c.t('Evitar el AINE; valorar paracetamol u otra analgesia.', 'Avoid the NSAID; consider paracetamol or other analgesia.')
          : c.t('Documentar la indicación del antiagregante o valorar retirarlo.', 'Document the antiplatelet indication or consider stopping it.'),
        criteria: [
          crit(c.t('Anticoagulante', 'Anticoagulant'), present(c), c.name(ac)),
          crit(isNsaid ? c.t('AINE', 'NSAID') : c.t('Antiagregante sin indicación', 'Antiplatelet without indication'), present(c), c.name(other)),
        ],
        facts: [c.fMed(ac), c.fMed(other)],
      };
    },
    ...META,
  },
  {
    id: 'I3', version: '1.0.0', type: 'interaction', severity: 'major', sourceId: 'smpc-mra-potassium',
    summary: {
      es: 'Espironolactona o eplerenona + IECA o ARA-II con potasio >5,0',
      en: 'Spironolactone or eplerenone + ACE inhibitor or ARB with potassium >5.0',
    },
    requires: ['potassium'],
    applies: (c) => c.has('mra') && raas(c).length > 0,
    evaluate: (c) => {
      const m = c.of('mra')[0];
      const r = raas(c)[0];
      const k = c.lab('potassium')!;
      if (k.value <= 5.0) return null;
      const today = k.value > 5.5;
      const kv = `${c.num(k.value)} mmol/L`;
      return {
        ...on(c, m), meds: [m, r], actionToday: today,
        message: c.t(`${c.name(m)} con ${c.name(r)} y potasio ${kv}.`, `${c.name(m)} with ${c.name(r)} and potassium ${kv}.`),
        action: today
          ? c.t('Actuar hoy: suspender el antagonista de aldosterona y repetir potasio.', 'Act today: stop the aldosterone antagonist and repeat potassium.')
          : c.t('Revisar la dosis del antagonista de aldosterona y repetir potasio.', 'Review the aldosterone antagonist dose and repeat potassium.'),
        criteria: [
          crit(c.t('Potasio', 'Potassium'), c.t('> 5,0 mmol/L', '> 5.0 mmol/L'), kv),
          crit(c.t('Actuar hoy', 'Act today'), c.t('> 5,5 mmol/L', '> 5.5 mmol/L'), kv, today),
        ],
        facts: [c.fMed(m), c.fMed(r), c.fLab(k)],
      };
    },
    ...META,
  },
  {
    id: 'I4', version: '1.0.0', type: 'interaction', severity: 'moderate', sourceId: 'smpc-digoxin',
    summary: {
      es: 'Amiodarona + digoxina sin reducción de dosis de digoxina',
      en: 'Amiodarone + digoxin without a digoxin dose reduction',
    },
    requires: [],
    applies: (c) => c.has('amiodarone') && c.has('digoxin'),
    evaluate: (c) => {
      const dg = c.of('digoxin')[0];
      const am = c.of('amiodarone')[0];
      const d = dailyDose(dg);
      if (d === null || d <= 0.125) return null;
      return {
        ...on(c, dg), meds: [dg, am],
        message: c.t(
          `Amiodarona con digoxina ${c.num(d)} mg/día sin reducción de dosis.`,
          `Amiodarone with digoxin ${c.num(d)} mg/day without a dose reduction.`,
        ),
        action: c.t(
          'Reducir la dosis de digoxina (aproximadamente a la mitad) y valorar digoxinemia.',
          'Reduce the digoxin dose (roughly by half) and consider a digoxin level.',
        ),
        criteria: [
          crit(c.t('Amiodarona', 'Amiodarone'), present(c), c.name(am)),
          crit(c.t('Digoxina diaria', 'Daily digoxin'), c.t('> 0,125 mg', '> 0.125 mg'), `${c.num(d)} mg`),
        ],
        facts: [c.fMed(dg), c.fMed(am)],
      };
    },
    ...META,
  },
  {
    id: 'I5', version: '1.0.0', type: 'interaction', severity: 'major', sourceId: 'smpc-simvastatin',
    summary: { es: 'Claritromicina + simvastatina', en: 'Clarithromycin + simvastatin' },
    requires: [],
    applies: (c) => c.has('macrolide_cyp3a4') && c.has('statin_cyp3a4'),
    evaluate: (c) => {
      const s = c.of('statin_cyp3a4')[0];
      const mc = c.of('macrolide_cyp3a4')[0];
      return {
        ...on(c, s), meds: [s, mc],
        message: c.t(
          `${c.name(mc)} con ${c.name(s)}: combinación contraindicada, riesgo de miopatía y rabdomiólisis.`,
          `${c.name(mc)} with ${c.name(s)}: contraindicated combination, risk of myopathy and rhabdomyolysis.`,
        ),
        action: c.t(
          'Suspender simvastatina mientras dure la claritromicina o elegir otro antibiótico.',
          'Pause simvastatin for the clarithromycin course or choose another antibiotic.',
        ),
        criteria: [
          crit(c.t('Inhibidor potente CYP3A4', 'Strong CYP3A4 inhibitor'), present(c), c.name(mc)),
          crit(c.t('Estatina dependiente de CYP3A4', 'CYP3A4-dependent statin'), present(c), c.name(s)),
        ],
        facts: [c.fMed(s), c.fMed(mc)],
      };
    },
    ...META,
  },
  {
    id: 'I6', version: '1.0.0', type: 'interaction', severity: 'major', sourceId: 'stopp-benzo-opioid',
    summary: { es: 'Benzodiacepina o fármaco Z + opioide', en: 'Benzodiazepine or Z-drug + opioid' },
    requires: [],
    applies: (c) => sedatives(c).length > 0 && c.has('opioid'),
    evaluate: (c) => {
      const s = sedatives(c)[0];
      const o = c.of('opioid')[0];
      return {
        ...on(c, s), meds: [s, o],
        message: c.t(
          `${c.name(s)} con ${c.name(o)}: riesgo de sedación excesiva y depresión respiratoria.`,
          `${c.name(s)} with ${c.name(o)}: risk of excessive sedation and respiratory depression.`,
        ),
        action: c.t(
          'Revisar la necesidad de ambos; reducir o retirar el sedante de forma gradual.',
          'Review the need for both; taper or stop the sedative gradually.',
        ),
        criteria: [
          crit(c.t('Benzodiacepina o fármaco Z', 'Benzodiazepine or Z-drug'), present(c), c.name(s)),
          crit(c.t('Opioide', 'Opioid'), present(c), c.name(o)),
        ],
        facts: [c.fMed(s), c.fMed(o)],
      };
    },
    ...META,
  },
  {
    id: 'I7', version: '1.0.0', type: 'duplication', severity: 'major', sourceId: 'stopp-duplication',
    summary: {
      es: 'Dos fármacos de la misma clase (por ejemplo IECA + ARA-II)',
      en: 'Two drugs from the same class (for example ACE inhibitor + ARB)',
    },
    requires: [],
    applies: (c) => duplication(c) !== null,
    evaluate: (c) => {
      const dup = duplication(c)!;
      return {
        ...on(c, dup.b), meds: [dup.b, dup.a],
        message: c.t(
          `Duplicidad: ${c.name(dup.a)} y ${c.name(dup.b)} (${dup.label}).`,
          `Duplication: ${c.name(dup.a)} and ${c.name(dup.b)} (${dup.label}).`,
        ),
        action: c.t('Mantener solo uno de los dos.', 'Keep only one of the two.'),
        criteria: [crit(c.t('Misma clase', 'Same class'), c.t('2 o más fármacos', '2 or more drugs'), names(c, [dup.a, dup.b]))],
        facts: [c.fMed(dup.a), c.fMed(dup.b)],
      };
    },
    ...META,
  },
  {
    id: 'S1', version: '1.0.0', type: 'inappropriate', severity: 'major', sourceId: 'stopp-nsaid-hf',
    summary: { es: 'AINE en insuficiencia cardiaca', en: 'NSAID in heart failure' },
    requires: [],
    applies: (c) => c.has('nsaid') && !!c.cond('I50'),
    evaluate: (c) => {
      const n = c.of('nsaid')[0];
      const hf = c.cond('I50')!;
      return {
        ...on(c, n), meds: [n],
        message: c.t(
          `${c.name(n)} en insuficiencia cardiaca: riesgo de descompensación.`,
          `${c.name(n)} in heart failure: risk of decompensation.`,
        ),
        action: c.t('Retirar el AINE; valorar analgesia alternativa.', 'Stop the NSAID; consider alternative analgesia.'),
        criteria: [
          crit(c.t('AINE', 'NSAID'), present(c), c.name(n)),
          crit(c.t('Insuficiencia cardiaca', 'Heart failure'), c.t('CIE-10 I50', 'ICD-10 I50'), hf.code),
        ],
        facts: [c.fMed(n), c.fCond(hf)],
      };
    },
    ...META,
  },
  {
    id: 'S2', version: '1.0.0', type: 'inappropriate', severity: 'major', sourceId: 'stopp-benzo-falls',
    summary: {
      es: 'Benzodiacepina o fármaco Z con caída en los últimos 12 meses',
      en: 'Benzodiazepine or Z-drug with a fall in the last 12 months',
    },
    requires: [],
    applies: (c) => sedatives(c).length > 0 && c.patient.context.falls_last_12m > 0,
    evaluate: (c) => {
      const s = sedatives(c)[0];
      const n = c.patient.context.falls_last_12m;
      const fallsLabel = c.t('Caídas en 12 meses', 'Falls in 12 months');
      return {
        ...on(c, s), meds: [s],
        message: c.t(
          `${c.name(s)} con ${n} caída${n > 1 ? 's' : ''} en los últimos 12 meses.`,
          `${c.name(s)} with ${n} fall${n > 1 ? 's' : ''} in the last 12 months.`,
        ),
        action: c.t('Valorar retirada gradual del hipnótico o benzodiacepina.', 'Consider a gradual taper of the hypnotic or benzodiazepine.'),
        criteria: [crit(c.t('Sedante', 'Sedative'), present(c), c.name(s)), crit(fallsLabel, '≥ 1', `${n}`)],
        facts: [
          c.fMed(s),
          {
            key: `falls|${n}`, label: fallsLabel, value: `${n}`,
            origin: c.t('Referido en consulta', 'Reported in consultation'),
            evidence: c.patient.context.falls_evidence && td(c.patient.context.falls_evidence, c.lang),
          },
        ],
      };
    },
    ...META,
  },
  {
    id: 'S3', version: '1.0.0', type: 'inappropriate', severity: 'moderate', sourceId: 'stopp-sulfonylurea',
    summary: {
      es: 'Sulfonilurea de acción larga (por ejemplo glibenclamida)',
      en: 'Long-acting sulfonylurea (for example glibenclamide)',
    },
    requires: ['hba1c'],
    applies: (c) => c.has('su_long'),
    evaluate: (c) => {
      const m = c.of('su_long')[0];
      const h = c.lab('hba1c')!;
      return {
        ...on(c, m), meds: [m],
        message: c.t(
          `${c.name(m)}: sulfonilurea de acción larga, riesgo de hipoglucemia prolongada (HbA1c ${c.num(h.value)} %).`,
          `${c.name(m)}: long-acting sulfonylurea, risk of prolonged hypoglycaemia (HbA1c ${c.num(h.value)}%).`,
        ),
        action: c.t(
          'Valorar cambio a una alternativa con menor riesgo de hipoglucemia.',
          'Consider switching to an alternative with lower hypoglycaemia risk.',
        ),
        criteria: [crit(c.t('Sulfonilurea de acción larga', 'Long-acting sulfonylurea'), present(c), c.name(m))],
        facts: [c.fMed(m), c.fLab(h)],
      };
    },
    ...META,
  },
  {
    id: 'S4', version: '1.0.0', type: 'inappropriate', severity: 'moderate', sourceId: 'stopp-anticholinergic',
    summary: {
      es: 'Dos o más fármacos con efecto anticolinérgico marcado',
      en: 'Two or more drugs with strong anticholinergic effects',
    },
    requires: [],
    applies: (c) => c.of('anticholinergic').length >= 2,
    evaluate: (c) => {
      const ms = c.of('anticholinergic');
      return {
        ...on(c, ms[0]), meds: ms,
        message: c.t(`Carga anticolinérgica alta: ${names(c, ms)}.`, `High anticholinergic burden: ${names(c, ms)}.`),
        action: c.t(
          'Reducir la carga anticolinérgica: retirar o sustituir uno de ellos.',
          'Reduce the anticholinergic burden: stop or replace one of them.',
        ),
        criteria: [crit(c.t('Fármacos anticolinérgicos', 'Anticholinergic drugs'), '≥ 2', `${ms.length}`)],
        facts: ms.map(c.fMed),
      };
    },
    ...META,
  },
  {
    id: 'S5', version: '1.0.0', type: 'inappropriate', severity: 'moderate', sourceId: 'stopp-aspirin-primary',
    summary: { es: 'Ácido acetilsalicílico solo en prevención primaria', en: 'Aspirin for primary prevention only' },
    requires: [],
    applies: (c) => c.of('aspirin').some((m) => !m.indication) && !c.cond(...SECONDARY_PREVENTION),
    evaluate: (c) => {
      const m = c.of('aspirin').find((x) => !x.indication)!;
      const none = c.t('Ninguna', 'None');
      return {
        ...on(c, m), meds: [m],
        message: c.t(
          'Ácido acetilsalicílico sin enfermedad cardiovascular establecida ni indicación documentada.',
          'Aspirin without established cardiovascular disease or a documented indication.',
        ),
        action: c.t(
          'Documentar la indicación o valorar retirarlo (prevención primaria).',
          'Document the indication or consider stopping it (primary prevention).',
        ),
        criteria: [
          crit(c.t('Indicación documentada', 'Documented indication'), none, none),
          crit(c.t('Prevención secundaria', 'Secondary prevention'), c.t('Sin diagnóstico', 'No diagnosis'), c.t('Sin diagnóstico', 'No diagnosis')),
        ],
        facts: [c.fMed(m)],
      };
    },
    ...META,
  },
  {
    id: 'S6', version: '1.0.0', type: 'inappropriate', severity: 'minor', sourceId: 'stopp-ppi',
    summary: {
      es: 'IBP a dosis plena más de 8 semanas sin indicación documentada',
      en: 'PPI at full dose for over 8 weeks without a documented indication',
    },
    requires: [],
    applies: (c) => c.has('ppi'),
    evaluate: (c) => {
      const m = c.of('ppi').find((x) => !x.indication && x.since && daysBetween(x.since, c.today) > 56);
      if (!m) return null;
      const weeks = Math.floor(daysBetween(m.since!, c.today) / 7);
      const none = c.t('Ninguna', 'None');
      return {
        ...on(c, m), meds: [m],
        message: c.t(
          `${c.name(m)} ${c.num(m.dose_mg ?? 0)} mg durante ${weeks} semanas sin indicación documentada.`,
          `${c.name(m)} ${c.num(m.dose_mg ?? 0)} mg for ${weeks} weeks without a documented indication.`,
        ),
        action: c.t('Valorar reducir a dosis de mantenimiento o retirar.', 'Consider stepping down to a maintenance dose or stopping.'),
        criteria: [
          crit(c.t('Duración', 'Duration'), c.t('> 8 semanas', '> 8 weeks'), c.t(`${weeks} semanas`, `${weeks} weeks`)),
          crit(c.t('Indicación documentada', 'Documented indication'), none, none),
        ],
        facts: [c.fMed(m)],
      };
    },
    ...META,
  },
  {
    id: 'S7', version: '1.0.0', type: 'inappropriate', severity: 'major', sourceId: 'stopp-thiazide-sodium',
    summary: { es: 'Tiazida con sodio <130 mmol/L', en: 'Thiazide with sodium <130 mmol/L' },
    requires: ['sodium'],
    applies: (c) => c.has('thiazide'),
    evaluate: (c) => {
      const m = c.of('thiazide')[0];
      const na = c.lab('sodium')!;
      if (na.value >= 130) return null;
      const nv = `${c.num(na.value)} mmol/L`;
      return {
        ...on(c, m), meds: [m], actionToday: na.value < 125,
        message: c.t(`${c.name(m)} con sodio ${nv}.`, `${c.name(m)} with sodium ${nv}.`),
        action: c.t('Suspender la tiazida y repetir el sodio.', 'Stop the thiazide and repeat sodium.'),
        criteria: [crit(c.t('Sodio', 'Sodium'), '< 130 mmol/L', nv)],
        facts: [c.fMed(m), c.fLab(na)],
      };
    },
    ...META,
  },
  {
    id: 'T1', version: '1.0.0', type: 'missing_treatment', severity: 'major', sourceId: 'esc-af',
    summary: {
      es: 'Fibrilación auricular sin anticoagulante ni motivo documentado',
      en: 'Atrial fibrillation with no anticoagulant and no documented reason',
    },
    requires: [],
    applies: (c) => !!c.cond('I48') && anticoags(c).length === 0 && !c.patient.context.anticoag_reason,
    evaluate: (c) => {
      const af = c.cond('I48')!;
      return {
        primary: 'cond:I48', primaryLabel: c.t('Fibrilación auricular', 'Atrial fibrillation'), meds: [],
        message: c.t(
          'Fibrilación auricular sin anticoagulante ni motivo documentado.',
          'Atrial fibrillation with no anticoagulant and no documented reason.',
        ),
        action: c.t(
          'Valorar anticoagulación según riesgo tromboembólico o documentar el motivo.',
          'Consider anticoagulation based on thromboembolic risk, or document the reason.',
        ),
        criteria: [
          crit(c.t('Fibrilación auricular', 'Atrial fibrillation'), c.t('CIE-10 I48', 'ICD-10 I48'), af.code),
          crit(c.t('Anticoagulante', 'Anticoagulant'), absent(c), absent(c)),
        ],
        facts: [c.fCond(af)],
      };
    },
    ...META,
  },
  {
    id: 'T2', version: '1.0.0', type: 'missing_treatment', severity: 'moderate', sourceId: 'esc-hf',
    summary: {
      es: 'IC con FE reducida sin IECA, ARA-II ni INRA',
      en: 'Heart failure with reduced EF and no ACE inhibitor, ARB or ARNI',
    },
    requires: [],
    applies: (c) => {
      const hf = c.cond('I50');
      return !!hf && (hf.code.startsWith('I50.2') || (hf.ef ?? 100) < 40) && raas(c).length === 0;
    },
    evaluate: (c) => {
      const hf = c.cond('I50')!;
      return {
        primary: 'cond:I50', primaryLabel: c.t('Insuficiencia cardiaca con FE reducida', 'Heart failure with reduced EF'), meds: [],
        message: c.t(
          'Insuficiencia cardiaca con FE reducida sin IECA, ARA-II ni sacubitrilo/valsartán.',
          'Heart failure with reduced EF and no ACE inhibitor, ARB or sacubitril/valsartan.',
        ),
        action: c.t(
          'Valorar iniciar IECA, ARA-II o sacubitrilo/valsartán si no hay contraindicación.',
          'Consider starting an ACE inhibitor, ARB or sacubitril/valsartan if not contraindicated.',
        ),
        criteria: [
          crit(c.t('IC con FE reducida', 'HF with reduced EF'), c.t('FEVI < 40 %', 'LVEF < 40%'), hf.ef !== undefined ? `${hf.ef} %` : hf.code),
          crit(c.t('IECA / ARA-II / INRA', 'ACE inhibitor / ARB / ARNI'), absent(c), absent(c)),
        ],
        facts: [c.fCond(hf)],
      };
    },
    ...META,
  },
  {
    id: 'T3', version: '1.0.0', type: 'missing_treatment', severity: 'moderate', sourceId: 'kdigo-sglt2',
    summary: {
      es: 'Diabetes tipo 2 con ERC (FGe ≥20) sin iSGLT2',
      en: 'Type 2 diabetes with CKD (eGFR ≥20) and no SGLT2 inhibitor',
    },
    requires: ['creatinine'],
    applies: (c) => !!c.cond('E11') && !!c.cond('N18') && !c.has('sglt2'),
    evaluate: (c) => {
      const e = c.egfr!;
      if (e < 20) return null;
      const prev = c.egfrPrev;
      const falling = c.egfrSlope !== undefined && c.egfrSlope <= -5 && prev;
      const months = prev ? Math.round(daysBetween(prev.date, c.latestCreatinine!.date) / 30) : 0;
      return {
        primary: 'cond:E11', primaryLabel: c.t('Diabetes tipo 2 con ERC', 'Type 2 diabetes with CKD'), meds: [],
        message: c.t(`Diabetes tipo 2 con ERC (FGe ${e}) sin inhibidor de SGLT2.`, `Type 2 diabetes with CKD (eGFR ${e}) and no SGLT2 inhibitor.`),
        action: c.t(
          'Valorar iniciar un iSGLT2 (por ejemplo empagliflozina o dapagliflozina).',
          'Consider starting an SGLT2 inhibitor (for example empagliflozin or dapagliflozin).',
        ),
        needsJudgement: falling
          ? c.t(
              `El FGe ha bajado de ${prev!.value} a ${e} en ${months} meses. Una regla sugiere iniciar y la función renal cae rápido: el sistema no elige.`,
              `eGFR fell from ${prev!.value} to ${e} in ${months} months. One rule suggests starting while kidney function is falling fast: the system does not choose.`,
            )
          : undefined,
        criteria: [
          crit(c.t('Diabetes tipo 2', 'Type 2 diabetes'), c.t('CIE-10 E11', 'ICD-10 E11'), 'E11'),
          crit(c.t('ERC', 'CKD'), c.t('CIE-10 N18', 'ICD-10 N18'), c.cond('N18')!.code),
          crit(c.t('FGe', 'eGFR'), '≥ 20', `${e}`),
          crit(c.t('iSGLT2', 'SGLT2 inhibitor'), absent(c), absent(c)),
        ],
        facts: [c.fCond(c.cond('E11')!), c.fCond(c.cond('N18')!), c.fEgfr()],
      };
    },
    ...META,
  },
  {
    id: 'T4', version: '1.0.0', type: 'missing_treatment', severity: 'moderate', sourceId: 'start-laxative',
    summary: { es: 'Opioide pautado sin laxante', en: 'Regular opioid with no laxative' },
    requires: [],
    applies: (c) => c.of('opioid').some((m) => m.regular) && !c.has('laxative'),
    evaluate: (c) => {
      const o = c.of('opioid').find((m) => m.regular)!;
      return {
        ...on(c, o), meds: [o],
        message: c.t(`${c.name(o)} pautado sin laxante.`, `Regular ${c.name(o).toLowerCase()} with no laxative.`),
        action: c.t('Añadir un laxante pautado.', 'Add a regular laxative.'),
        criteria: [
          crit(c.t('Opioide pautado', 'Regular opioid'), present(c), c.name(o)),
          crit(c.t('Laxante', 'Laxative'), absent(c), absent(c)),
        ],
        facts: [c.fMed(o)],
      };
    },
    ...META,
  },
  {
    id: 'T5', version: '1.0.0', type: 'missing_treatment', severity: 'moderate', sourceId: 'start-bone',
    summary: {
      es: 'Corticoide oral prolongado sin protección ósea',
      en: 'Long-term oral corticosteroid with no bone protection',
    },
    requires: [],
    applies: (c) =>
      c.of('oral_steroid').some((m) => m.since && daysBetween(m.since, c.today) > 90) && !c.has('bone_protection'),
    evaluate: (c) => {
      const m = c.of('oral_steroid').find((x) => x.since && daysBetween(x.since, c.today) > 90)!;
      const months = Math.round(daysBetween(m.since!, c.today) / 30);
      return {
        ...on(c, m), meds: [m],
        message: c.t(
          `${c.name(m)} desde hace ${months} meses sin protección ósea.`,
          `${c.name(m)} for ${months} months with no bone protection.`,
        ),
        action: c.t('Valorar bisfosfonato y calcio con vitamina D.', 'Consider a bisphosphonate plus calcium and vitamin D.'),
        criteria: [
          crit(c.t('Corticoide oral', 'Oral corticosteroid'), c.t('> 3 meses', '> 3 months'), c.t(`${months} meses`, `${months} months`)),
          crit(c.t('Protección ósea', 'Bone protection'), absent(c), absent(c)),
        ],
        facts: [c.fMed(m)],
      };
    },
    ...META,
  },
];

export const RULE_BY_ID: Record<string, Rule> = Object.fromEntries(RULES.map((r) => [r.id, r]));

export const TYPE_LABEL: Record<Lang, Record<RuleType | 'missing_data', string>> = {
  es: {
    kidney_dosing: 'Dosis renal',
    interaction: 'Interacción',
    duplication: 'Duplicidad',
    inappropriate: 'Potencialmente inapropiado',
    missing_treatment: 'Tratamiento omitido',
    missing_data: 'Faltan datos',
  },
  en: {
    kidney_dosing: 'Kidney dosing',
    interaction: 'Interaction',
    duplication: 'Duplication',
    inappropriate: 'Potentially inappropriate',
    missing_treatment: 'Missing treatment',
    missing_data: 'Missing data',
  },
};

export const SEVERITY_LABEL: Record<Lang, Record<Severity, string>> = {
  es: { major: 'Mayor', moderate: 'Moderado', minor: 'Menor' },
  en: { major: 'Major', moderate: 'Moderate', minor: 'Minor' },
};

export const RULE_SET_VERSION = 'rules-es v0.1.0';
