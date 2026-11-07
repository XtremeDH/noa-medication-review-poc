// Pinned source passages per rule. Illustrative paraphrases for the POC: must be replaced with
// the licensed text (CIMA fichas técnicas, STOPP/START v3, guidelines) and checked by a pharmacist.
import type { L } from './lang';

export interface SourceDoc {
  id: string;
  document: L;
  publisher: string;
  section: L;
  version: L;
  paragraphs: L[];
  highlight: number;
}

type P = [es: string, en: string];
const l = ([es, en]: P): L => ({ es, en });

const s = (id: string, document: P, publisher: string, section: P, version: P, paragraphs: P[], highlight = 1): SourceDoc => ({
  id, document: l(document), publisher, section: l(section), version: l(version), paragraphs: paragraphs.map(l), highlight,
});

const STOPP: P = ["STOPP/START v3 (O'Mahony et al., 2023)", "STOPP/START v3 (O'Mahony et al., 2023)"];
const SMPC: P = ['Paráfrasis 2026-10', 'Paraphrase 2026-10'];
const PARA: P = ['Paráfrasis', 'Paraphrase'];
const CIMA = 'CIMA (AEMPS)';
const EGM = 'Eur Geriatr Med';

export const SOURCES: Record<string, SourceDoc> = Object.fromEntries(
  [
    s('smpc-metformin', ['Ficha técnica: Metformina', 'SmPC: Metformin'], CIMA, ['4.2 Posología · Insuficiencia renal', '4.2 Posology · Renal impairment'], SMPC, [
      ['Debe evaluarse la tasa de filtración glomerular antes de iniciar el tratamiento y, después, al menos una vez al año; con más frecuencia en pacientes con mayor riesgo de progresión.',
        'GFR should be assessed before starting treatment and at least annually thereafter; more often in patients at higher risk of progression.'],
      ['Con FG 30-44 mL/min la dosis diaria máxima es de 1000 mg, repartida en 2 tomas. Antes de iniciar con FG menor de 45 deben revisarse los factores que aumentan el riesgo de acidosis láctica.',
        'With GFR 30-44 mL/min the maximum daily dose is 1000 mg, in 2 divided doses. Before starting with GFR below 45, factors that raise the risk of lactic acidosis should be reviewed.'],
      ['Con FG menor de 30 mL/min la metformina está contraindicada.', 'Metformin is contraindicated with GFR below 30 mL/min.'],
    ]),
    s('smpc-apixaban', ['Ficha técnica: Apixabán', 'SmPC: Apixaban'], CIMA, ['4.2 Posología y forma de administración', '4.2 Posology and method of administration'], SMPC, [
      ['Prevención del ictus y la embolia sistémica en fibrilación auricular no valvular: la dosis recomendada es 5 mg dos veces al día por vía oral.',
        'Prevention of stroke and systemic embolism in non-valvular atrial fibrillation: the recommended dose is 5 mg orally twice daily.'],
      ['Reducción de dosis: 2,5 mg dos veces al día en pacientes con al menos dos de estas características: edad igual o superior a 80 años, peso igual o inferior a 60 kg, o creatinina sérica igual o superior a 1,5 mg/dL.',
        'Dose reduction: 2.5 mg twice daily in patients with at least two of: age 80 years or over, body weight 60 kg or less, or serum creatinine 1.5 mg/dL or more.'],
      ['En insuficiencia renal grave (aclaramiento 15-29 mL/min) se aplica la dosis reducida. No se recomienda con aclaramiento menor de 15 mL/min ni en diálisis.',
        'In severe renal impairment (clearance 15-29 mL/min) the reduced dose applies. Not recommended with clearance below 15 mL/min or on dialysis.'],
      ['La función renal debe evaluarse antes del inicio y periódicamente durante el tratamiento.', 'Renal function should be assessed before starting and periodically during treatment.'],
    ]),
    s('smpc-rivaroxaban', ['Ficha técnica: Rivaroxabán', 'SmPC: Rivaroxaban'], CIMA, ['4.2 Posología · Insuficiencia renal', '4.2 Posology · Renal impairment'], SMPC, [
      ['Fibrilación auricular no valvular: 20 mg una vez al día con alimentos.', 'Non-valvular atrial fibrillation: 20 mg once daily with food.'],
      ['Con aclaramiento de creatinina 15-49 mL/min la dosis recomendada es 15 mg una vez al día.', 'With creatinine clearance 15-49 mL/min the recommended dose is 15 mg once daily.'],
      ['Con aclaramiento menor de 15 mL/min no se recomienda su uso.', 'Use is not recommended with clearance below 15 mL/min.'],
    ]),
    s('smpc-nitrofurantoin', ['Ficha técnica: Nitrofurantoína', 'SmPC: Nitrofurantoin'], CIMA, ['4.3 Contraindicaciones', '4.3 Contraindications'], SMPC, [
      ['La nitrofurantoína se elimina por vía renal y su eficacia urinaria depende de la función renal.', 'Nitrofurantoin is cleared by the kidneys and its urinary efficacy depends on renal function.'],
      ['Evitar en pacientes con FG menor de 45 mL/min por menor eficacia y mayor riesgo de toxicidad; valorar alternativa según antibiograma.',
        'Avoid in patients with GFR below 45 mL/min due to lower efficacy and higher toxicity risk; consider an alternative guided by culture.'],
    ]),
    s('smpc-gabapentinoids', ['Fichas técnicas: Gabapentina y Pregabalina', 'SmPCs: Gabapentin and Pregabalin'], CIMA, ['4.2 Posología · Insuficiencia renal', '4.2 Posology · Renal impairment'], SMPC, [
      ['La dosis debe ajustarse según el aclaramiento de creatinina.', 'The dose must be adjusted to creatinine clearance.'],
      ['Gabapentina: dosis diaria máxima orientativa de 1800 mg con aclaramiento 50-79, 900 mg con 30-49, 600 mg con 15-29 y 300 mg con menos de 15 mL/min. Pregabalina: 300 mg con 30-59, 150 mg con 15-29 y 75 mg con menos de 15 mL/min.',
        'Gabapentin: indicative maximum daily dose of 1800 mg with clearance 50-79, 900 mg with 30-49, 600 mg with 15-29 and 300 mg below 15 mL/min. Pregabalin: 300 mg with 30-59, 150 mg with 15-29 and 75 mg below 15 mL/min.'],
    ]),
    s('stopp-nsaid-renal', STOPP, EGM, ['STOPP · Fármacos y función renal', 'STOPP · Drugs and renal function'], PARA, [
      ['Los siguientes fármacos son potencialmente inapropiados en personas mayores con insuficiencia renal aguda o crónica por debajo de los umbrales indicados.',
        'The following drugs are potentially inappropriate in older people with acute or chronic kidney impairment below the stated thresholds.'],
      ['AINE con FGe menor de 50 mL/min/1,73 m²: riesgo de deterioro de la función renal.', 'NSAID with eGFR below 50 mL/min/1.73 m²: risk of deteriorating renal function.'],
    ]),
    s('stopp-triple-whammy', STOPP, EGM, ['STOPP · Sistema renal / musculoesquelético', 'STOPP · Renal / musculoskeletal system'], PARA, [
      ['Combinaciones con riesgo de fracaso renal agudo.', 'Combinations with a risk of acute kidney injury.'],
      ['AINE en combinación con un IECA o ARA-II y un diurético ("triple whammy"): riesgo de fracaso renal agudo, en especial con deshidratación o enfermedad intercurrente.',
        'NSAID combined with an ACE inhibitor or ARB and a diuretic ("triple whammy"): risk of acute kidney injury, especially with dehydration or intercurrent illness.'],
    ]),
    s('stopp-anticoag-bleeding', STOPP, EGM, ['STOPP · Antitrombóticos', 'STOPP · Antithrombotics'], PARA, [
      ['Fármacos antitrombóticos y riesgo de hemorragia.', 'Antithrombotic drugs and bleeding risk.'],
      ['AINE o antiagregante combinado con un anticoagulante oral sin una indicación clara y documentada para la combinación: riesgo de hemorragia digestiva grave.',
        'NSAID or antiplatelet combined with an oral anticoagulant without a clear, documented indication for the combination: risk of major gastrointestinal bleeding.'],
    ]),
    s('smpc-mra-potassium', ['Ficha técnica: Espironolactona', 'SmPC: Spironolactone'], CIMA, ['4.4 Advertencias · Hiperpotasemia', '4.4 Warnings · Hyperkalaemia'], SMPC, [
      ['El uso con IECA o ARA-II aumenta el riesgo de hiperpotasemia, en especial en pacientes mayores o con insuficiencia renal.',
        'Use with ACE inhibitors or ARBs increases the risk of hyperkalaemia, especially in older patients or with renal impairment.'],
      ['Debe vigilarse el potasio sérico; si aparece hiperpotasemia, suspender o reducir la dosis. Potasio mayor de 5,5 mmol/L requiere actuación inmediata.',
        'Serum potassium should be monitored; if hyperkalaemia occurs, stop or reduce the dose. Potassium above 5.5 mmol/L requires immediate action.'],
    ]),
    s('smpc-digoxin', ['Ficha técnica: Digoxina', 'SmPC: Digoxin'], CIMA, ['4.5 Interacciones', '4.5 Interactions'], SMPC, [
      ['La amiodarona aumenta la concentración plasmática de digoxina.', 'Amiodarone increases plasma digoxin concentration.'],
      ['Al iniciar amiodarona en un paciente tratado con digoxina, reducir la dosis de digoxina aproximadamente a la mitad y vigilar la digoxinemia.',
        'When starting amiodarone in a patient on digoxin, reduce the digoxin dose by about half and monitor digoxin levels.'],
    ]),
    s('smpc-simvastatin', ['Ficha técnica: Simvastatina', 'SmPC: Simvastatin'], CIMA, ['4.3 Contraindicaciones', '4.3 Contraindications'], SMPC, [
      ['La simvastatina se metaboliza por CYP3A4.', 'Simvastatin is metabolised by CYP3A4.'],
      ['Contraindicado el uso concomitante con inhibidores potentes de CYP3A4 como claritromicina: riesgo de miopatía y rabdomiólisis. Suspender la simvastatina durante el tratamiento.',
        'Concomitant use with strong CYP3A4 inhibitors such as clarithromycin is contraindicated: risk of myopathy and rhabdomyolysis. Suspend simvastatin during treatment.'],
    ]),
    s('stopp-benzo-opioid', STOPP, EGM, ['STOPP · Sistema nervioso central', 'STOPP · Central nervous system'], PARA, [
      ['Fármacos con efecto sedante en personas mayores.', 'Sedating drugs in older people.'],
      ['Benzodiacepina o fármaco Z junto con un opioide: riesgo de sedación excesiva, depresión respiratoria y caídas.',
        'Benzodiazepine or Z-drug together with an opioid: risk of excessive sedation, respiratory depression and falls.'],
    ]),
    s('stopp-duplication', STOPP, EGM, ['STOPP · Sección general', 'STOPP · General section'], PARA, [
      ['Criterios generales aplicables a cualquier prescripción.', 'General criteria that apply to any prescription.'],
      ['Prescripción duplicada de fármacos de la misma clase (por ejemplo dos AINE, dos IBP, o un IECA con un ARA-II): optimizar con un solo fármaco antes de añadir otro.',
        'Duplicate prescription of drugs from the same class (for example two NSAIDs, two PPIs, or an ACE inhibitor with an ARB): optimise one drug before adding another.'],
    ]),
    s('stopp-nsaid-hf', STOPP, EGM, ['STOPP · Sistema cardiovascular', 'STOPP · Cardiovascular system'], PARA, [
      ['Fármacos potencialmente inapropiados en enfermedad cardiovascular.', 'Potentially inappropriate drugs in cardiovascular disease.'],
      ['AINE en insuficiencia cardiaca: riesgo de retención hídrica y descompensación.', 'NSAID in heart failure: risk of fluid retention and decompensation.'],
    ]),
    s('stopp-benzo-falls', STOPP, EGM, ['STOPP · Fármacos que aumentan el riesgo de caídas', 'STOPP · Drugs that increase fall risk'], PARA, [
      ['Fármacos que aumentan el riesgo de caídas en personas mayores.', 'Drugs that increase the risk of falls in older people.'],
      ['Benzodiacepinas y fármacos Z en pacientes con caídas recientes: pueden causar sedación, alteración del equilibrio y nuevas caídas.',
        'Benzodiazepines and Z-drugs in patients with recent falls: may cause sedation, impaired balance and further falls.'],
    ]),
    s('stopp-sulfonylurea', STOPP, EGM, ['STOPP · Sistema endocrino', 'STOPP · Endocrine system'], PARA, [
      ['Antidiabéticos con riesgo de hipoglucemia en personas mayores.', 'Antidiabetic drugs with hypoglycaemia risk in older people.'],
      ['Sulfonilureas de acción larga (glibenclamida, glimepirida) en diabetes tipo 2: riesgo de hipoglucemia prolongada.',
        'Long-acting sulfonylureas (glibenclamide, glimepiride) in type 2 diabetes: risk of prolonged hypoglycaemia.'],
    ]),
    s('stopp-anticholinergic', STOPP, EGM, ['STOPP · Carga anticolinérgica', 'STOPP · Anticholinergic burden'], PARA, [
      ['Fármacos con propiedades anticolinérgicas.', 'Drugs with anticholinergic properties.'],
      ['Uso concomitante de dos o más fármacos con efecto anticolinérgico marcado: riesgo de toxicidad anticolinérgica (confusión, estreñimiento, retención urinaria).',
        'Concomitant use of two or more drugs with strong anticholinergic effects: risk of anticholinergic toxicity (confusion, constipation, urinary retention).'],
    ]),
    s('stopp-aspirin-primary', STOPP, EGM, ['STOPP · Antitrombóticos', 'STOPP · Antithrombotics'], PARA, [
      ['Uso de antiagregantes en personas mayores.', 'Antiplatelet use in older people.'],
      ['Ácido acetilsalicílico para prevención primaria de enfermedad cardiovascular: sin beneficio demostrado y con riesgo de hemorragia.',
        'Aspirin for primary prevention of cardiovascular disease: no proven benefit and a risk of bleeding.'],
    ]),
    s('stopp-ppi', STOPP, EGM, ['STOPP · Sistema digestivo', 'STOPP · Gastrointestinal system'], PARA, [
      ['Inhibidores de la bomba de protones.', 'Proton pump inhibitors.'],
      ['IBP a dosis terapéutica plena durante más de 8 semanas sin indicación clara: valorar reducir dosis o retirar.',
        'PPI at full therapeutic dose for more than 8 weeks without a clear indication: consider dose reduction or stopping.'],
    ]),
    s('stopp-thiazide-sodium', STOPP, EGM, ['STOPP · Sistema cardiovascular', 'STOPP · Cardiovascular system'], PARA, [
      ['Diuréticos y alteraciones electrolíticas.', 'Diuretics and electrolyte disturbances.'],
      ['Tiazida con hiponatremia significativa (sodio menor de 130 mmol/L) o antecedente de hiponatremia: puede empeorarla.',
        'Thiazide with significant hyponatraemia (sodium below 130 mmol/L) or a history of it: may worsen it.'],
    ]),
    s('esc-af', ['Guía ESC de fibrilación auricular', 'ESC atrial fibrillation guideline'], 'European Society of Cardiology', ['Prevención del tromboembolismo', 'Prevention of thromboembolism'], ['Paráfrasis 2024', 'Paraphrase 2024'], [
      ['Se recomienda la anticoagulación oral en pacientes con fibrilación auricular y riesgo tromboembólico elevado.',
        'Oral anticoagulation is recommended in patients with atrial fibrillation and elevated thromboembolic risk.'],
      ['En pacientes con FA y riesgo tromboembólico, la ausencia de anticoagulación debe estar justificada y documentada (contraindicación, decisión del paciente).',
        'In patients with AF and thromboembolic risk, not anticoagulating should be justified and documented (contraindication, patient decision).'],
    ]),
    s('esc-hf', ['Guía ESC de insuficiencia cardiaca', 'ESC heart failure guideline'], 'European Society of Cardiology', ['Tratamiento de la IC con FE reducida', 'Treatment of HF with reduced EF'], ['Paráfrasis 2021/2023', 'Paraphrase 2021/2023'], [
      ['El tratamiento de base de la IC con FE reducida incluye cuatro grupos farmacológicos.', 'Foundational therapy for HF with reduced EF includes four drug classes.'],
      ['Se recomienda IECA o sacubitrilo/valsartán (ARA-II si no se tolera IECA) en pacientes con IC con FE reducida para reducir hospitalización y mortalidad.',
        'An ACE inhibitor or sacubitril/valsartan (ARB if ACE inhibitor not tolerated) is recommended in HF with reduced EF to reduce hospitalisation and death.'],
    ]),
    s('kdigo-sglt2', ['Guía KDIGO: diabetes en la ERC', 'KDIGO guideline: diabetes in CKD'], 'KDIGO', ['Tratamiento hipoglucemiante', 'Glucose-lowering therapy'], ['Paráfrasis 2022', 'Paraphrase 2022'], [
      ['Recomendaciones para pacientes con diabetes tipo 2 y enfermedad renal crónica.', 'Recommendations for patients with type 2 diabetes and chronic kidney disease.'],
      ['Se recomienda un inhibidor de SGLT2 en pacientes con diabetes tipo 2, ERC y FGe igual o superior a 20 mL/min/1,73 m².',
        'An SGLT2 inhibitor is recommended in patients with type 2 diabetes, CKD and eGFR of 20 mL/min/1.73 m² or more.'],
    ]),
    s('start-laxative', STOPP, EGM, ['START · Analgesia', 'START · Analgesia'], PARA, [
      ['Tratamientos que deberían considerarse si no hay contraindicación.', 'Treatments to consider when there is no contraindication.'],
      ['Laxantes en pacientes que reciben opioides de forma pautada.', 'Laxatives in patients receiving regular opioids.'],
    ]),
    s('start-bone', STOPP, EGM, ['START · Sistema musculoesquelético', 'START · Musculoskeletal system'], PARA, [
      ['Tratamientos que deberían considerarse si no hay contraindicación.', 'Treatments to consider when there is no contraindication.'],
      ['Bisfosfonato, vitamina D y calcio en pacientes con corticoterapia oral sistémica prolongada (más de 3 meses).',
        'Bisphosphonate, vitamin D and calcium in patients on long-term systemic oral corticosteroids (more than 3 months).'],
    ]),
  ].map((x) => [x.id, x]),
);
