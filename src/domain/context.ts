import { DRUG_BY_ING, DRUGS, drugName, type DrugClass } from './drugs';
import { daysBetween, fmtNum } from './dates';
import { td, tr, type Lang } from './lang';
import { ckdEpi2021, cockcroftGault } from './renal';
import type { Condition, Fact, InputKey, Lab, LabTest, Medication, MedSource, Patient } from './types';

export const SOURCE_LABEL: Record<Lang, Record<MedSource, string>> = {
  es: { record: 'Historia clínica (Clinic Cloud)', 'patient-list': 'Lista previa del paciente', transcript: 'Referido en consulta' },
  en: { record: 'Clinical record (Clinic Cloud)', 'patient-list': 'Patient pre-visit list', transcript: 'Reported in consultation' },
};

export const LAB_LABEL: Record<Lang, Record<LabTest, string>> = {
  es: { creatinine: 'Creatinina', potassium: 'Potasio', sodium: 'Sodio', hba1c: 'HbA1c', inr: 'INR' },
  en: { creatinine: 'Creatinine', potassium: 'Potassium', sodium: 'Sodium', hba1c: 'HbA1c', inr: 'INR' },
};

export const INPUT_LABEL: Record<Lang, Record<InputKey, string>> = {
  es: { ...LAB_LABEL.es, weight: 'Peso' },
  en: { ...LAB_LABEL.en, weight: 'Weight' },
};

export const egfrUnit = (lang: Lang) => tr(lang, 'mL/min/1,73 m²', 'mL/min/1.73 m²');

export const dailyDose = (m: Medication) =>
  m.dose_mg !== null && m.doses_per_day !== null ? +(m.dose_mg * m.doses_per_day).toFixed(4) : null;

export const doseText = (m: Medication, lang: Lang = 'es') => {
  const freq = m.frequency ? td(m.frequency, lang) : null;
  if (m.dose_mg === null) return freq ?? tr(lang, 'Dosis no indicada', 'Dose not stated');
  return `${fmtNum(m.dose_mg, lang)} mg${freq ? ` ${freq}` : ''}`;
};

/** Product or spoken name for display: Spanish generic names and decimal commas become English in the English UI; brands stay. */
export const productName = (name: string, lang: Lang) => {
  if (lang === 'es') return name;
  const lower = name.toLowerCase();
  const d = DRUGS.find((x) => lower === x.es.toLowerCase() || lower.startsWith(`${x.es.toLowerCase()} `));
  return (d ? d.en + name.slice(d.es.length) : name).replace(/(\d),(\d)/g, '$1.$2');
};

export const medLabel = (m: Medication, lang: Lang = 'es') => (m.ingredient ? drugName(m.ingredient, lang) : productName(m.name, lang));

const toMgDl = (l: Lab): Lab =>
  l.test === 'creatinine' && l.unit !== 'mg/dL' ? { ...l, value: +(l.value / 88.4).toFixed(2), unit: 'mg/dL' } : l;

export interface RuleContext {
  patient: Patient;
  meds: Medication[];
  today: string;
  lang: Lang;
  egfr?: number;
  crcl?: number;
  egfrPrev?: { value: number; date: string };
  egfrSlope?: number;
  latestCreatinine?: Lab;
  lab(t: LabTest): Lab | undefined;
  of(c: DrugClass): Medication[];
  has(c: DrugClass): boolean;
  ing(ingredient: string): Medication | undefined;
  cond(...prefixes: string[]): Condition | undefined;
  t(es: string, en: string): string;
  num(n: number): string;
  name(m: Medication): string;
  fMed(m: Medication): Fact;
  fLab(l: Lab): Fact;
  fEgfr(): Fact;
  fCrcl(): Fact;
  fWeight(): Fact;
  fAge(): Fact;
  fCond(cd: Condition): Fact;
}

export function buildContext(patient: Patient, meds: Medication[], today: string, lang: Lang = 'es'): RuleContext {
  const labs = patient.labs.map(toMgDl).sort((a, b) => b.date.localeCompare(a.date));
  const lab = (t: LabTest) => labs.find((l) => l.test === t);
  const creats = labs.filter((l) => l.test === 'creatinine');
  const latest = creats[0];
  const egfrOf = (l: Lab) => ckdEpi2021(l.value, patient.age, patient.sex);
  const egfr = latest ? egfrOf(latest) : undefined;
  const crcl =
    latest && patient.weight_kg ? cockcroftGault(latest.value, patient.age, patient.weight_kg, patient.sex) : undefined;

  let egfrPrev: RuleContext['egfrPrev'];
  let egfrSlope: number | undefined;
  if (latest && creats.length > 1) {
    egfrPrev = { value: egfrOf(creats[1]), date: creats[1].date };
    const years = daysBetween(creats[1].date, latest.date) / 365;
    if (years > 0 && egfr !== undefined) egfrSlope = (egfr - egfrPrev.value) / years;
  }

  const active = meds.filter((m) => m.status === 'taking');
  const of = (c: DrugClass) =>
    active.filter((m) => m.ingredient !== null && (DRUG_BY_ING[m.ingredient]?.classes.includes(c) ?? false));
  const t = (es: string, en: string) => tr(lang, es, en);
  const num = (n: number) => fmtNum(n, lang);
  const recordOrigin = t('Historia clínica (Clinic Cloud)', 'Clinical record (Clinic Cloud)');

  return {
    patient,
    meds: active,
    today,
    lang,
    egfr,
    crcl,
    egfrPrev,
    egfrSlope,
    latestCreatinine: latest,
    lab,
    of,
    has: (c) => of(c).length > 0,
    ing: (i) => active.find((m) => m.ingredient === i),
    cond: (...p) => patient.conditions.find((c) => p.some((x) => c.code.startsWith(x))),
    t,
    num,
    name: (m) => medLabel(m, lang),
    fMed: (m) => ({
      key: `med|${m.ingredient ?? m.name}|${m.dose_mg}|${m.doses_per_day}|${m.status}`,
      label: medLabel(m, lang),
      value: doseText(m, lang),
      date: m.since,
      origin: SOURCE_LABEL[lang][m.source],
      evidence: m.evidence && td(m.evidence, lang),
    }),
    fLab: (l) => ({
      key: `lab|${l.test}|${l.value}|${l.date}`,
      label: LAB_LABEL[lang][l.test],
      value: `${num(l.value)} ${l.unit}`,
      date: l.date,
      origin: td(l.origin, lang),
    }),
    fEgfr: () => ({
      key: `egfr|${egfr}`,
      label: t('FGe (CKD-EPI 2021)', 'eGFR (CKD-EPI 2021)'),
      value: `${egfr} ${egfrUnit(lang)}`,
      date: latest?.date,
      origin: t('Calculado: creatinina, edad y sexo', 'Calculated: creatinine, age and sex'),
    }),
    fCrcl: () => ({
      key: `crcl|${crcl}`,
      label: t('ClCr (Cockcroft-Gault)', 'CrCl (Cockcroft-Gault)'),
      value: `${crcl} mL/min`,
      date: latest?.date,
      origin: t('Calculado: creatinina, edad, peso y sexo', 'Calculated: creatinine, age, weight and sex'),
    }),
    fWeight: () => ({
      key: `weight|${patient.weight_kg}|${patient.weight_date}`,
      label: t('Peso', 'Weight'),
      value: `${num(patient.weight_kg ?? 0)} kg`,
      date: patient.weight_date,
      origin: recordOrigin,
    }),
    fAge: () => ({
      key: `age|${patient.age}`,
      label: t('Edad', 'Age'),
      value: t(`${patient.age} años`, `${patient.age} years`),
      origin: recordOrigin,
    }),
    fCond: (cd) => ({
      key: `cond|${cd.code}`,
      label: td(cd.label, lang),
      value: `${t('CIE-10', 'ICD-10')} ${cd.code}${cd.detail ? ` · ${td(cd.detail, lang)}` : ''}`,
      origin: cd.source === 'record' ? recordOrigin : SOURCE_LABEL[lang].transcript,
    }),
  };
}
