// Mock drug dictionary for Spain. Stands in for the licensed knowledge base (BOT PLUS / CIMA, decision open).
import type { Lang } from './lang';

export type DrugClass =
  | 'nsaid' | 'acei' | 'arb' | 'arni' | 'loop' | 'thiazide' | 'mra' | 'doac' | 'vka'
  | 'antiplatelet' | 'aspirin' | 'benzo' | 'zdrug' | 'opioid' | 'laxative' | 'sglt2'
  | 'su_long' | 'biguanide' | 'ppi' | 'statin' | 'statin_cyp3a4' | 'macrolide_cyp3a4'
  | 'amiodarone' | 'digoxin' | 'anticholinergic' | 'oral_steroid' | 'bone_protection'
  | 'gabapentinoid' | 'nitrofurantoin' | 'beta_blocker' | 'analgesic';

export interface Drug {
  ingredient: string;
  es: string;
  en: string;
  atc: string;
  classes: DrugClass[];
  brands: string[];
  /** Usual range per single dose, for the dose-sanity check after extraction. */
  doseRangeMg: [number, number];
}

const d = (
  ingredient: string, es: string, en: string, atc: string, classes: DrugClass[], brands: string[], doseRangeMg: [number, number],
): Drug => ({ ingredient, es, en, atc, classes, brands, doseRangeMg });

export const DRUGS: Drug[] = [
  d('apixaban', 'Apixabán', 'Apixaban', 'B01AF02', ['doac'], ['Eliquis'], [2.5, 10]),
  d('rivaroxaban', 'Rivaroxabán', 'Rivaroxaban', 'B01AF01', ['doac'], ['Xarelto'], [10, 20]),
  d('acenocoumarol', 'Acenocumarol', 'Acenocoumarol', 'B01AA07', ['vka'], ['Sintrom'], [0.5, 8]),
  d('warfarin', 'Warfarina', 'Warfarin', 'B01AA03', ['vka'], ['Aldocumar'], [1, 15]),
  d('ibuprofen', 'Ibuprofeno', 'Ibuprofen', 'M01AE01', ['nsaid'], ['Espidifen', 'Dalsy'], [200, 800]),
  d('naproxen', 'Naproxeno', 'Naproxen', 'M01AE02', ['nsaid'], ['Antalgin'], [250, 550]),
  d('diclofenac', 'Diclofenaco', 'Diclofenac', 'M01AB05', ['nsaid'], ['Voltarén'], [25, 75]),
  d('ramipril', 'Ramipril', 'Ramipril', 'C09AA05', ['acei'], ['Acovil'], [1.25, 10]),
  d('enalapril', 'Enalapril', 'Enalapril', 'C09AA02', ['acei'], ['Renitec'], [2.5, 40]),
  d('losartan', 'Losartán', 'Losartan', 'C09CA01', ['arb'], ['Cozaar'], [12.5, 100]),
  d('valsartan', 'Valsartán', 'Valsartan', 'C09CA03', ['arb'], ['Diován'], [40, 320]),
  d('sacubitril_valsartan', 'Sacubitrilo/valsartán', 'Sacubitril/valsartan', 'C09DX04', ['arni'], ['Entresto'], [24, 200]),
  d('furosemide', 'Furosemida', 'Furosemide', 'C03CA01', ['loop'], ['Seguril'], [20, 250]),
  d('hydrochlorothiazide', 'Hidroclorotiazida', 'Hydrochlorothiazide', 'C03AA03', ['thiazide'], ['Esidrex'], [12.5, 50]),
  d('spironolactone', 'Espironolactona', 'Spironolactone', 'C03DA01', ['mra'], ['Aldactone'], [12.5, 100]),
  d('eplerenone', 'Eplerenona', 'Eplerenone', 'C03DA04', ['mra'], ['Inspra'], [25, 50]),
  d('metformin', 'Metformina', 'Metformin', 'A10BA02', ['biguanide'], ['Dianben'], [425, 1000]),
  d('glibenclamide', 'Glibenclamida', 'Glibenclamide', 'A10BB01', ['su_long'], ['Daonil'], [2.5, 10]),
  d('glimepiride', 'Glimepirida', 'Glimepiride', 'A10BB12', ['su_long'], ['Amaryl'], [1, 6]),
  d('empagliflozin', 'Empagliflozina', 'Empagliflozin', 'A10BK03', ['sglt2'], ['Jardiance'], [10, 25]),
  d('dapagliflozin', 'Dapagliflozina', 'Dapagliflozin', 'A10BK01', ['sglt2'], ['Forxiga'], [5, 10]),
  d('omeprazole', 'Omeprazol', 'Omeprazole', 'A02BC01', ['ppi'], [], [10, 40]),
  d('pantoprazole', 'Pantoprazol', 'Pantoprazole', 'A02BC02', ['ppi'], ['Anagastra'], [20, 40]),
  d('simvastatin', 'Simvastatina', 'Simvastatin', 'C10AA01', ['statin', 'statin_cyp3a4'], ['Zocor'], [5, 40]),
  d('atorvastatin', 'Atorvastatina', 'Atorvastatin', 'C10AA05', ['statin'], ['Cardyl'], [10, 80]),
  d('clarithromycin', 'Claritromicina', 'Clarithromycin', 'J01FA09', ['macrolide_cyp3a4'], ['Klacid'], [250, 500]),
  d('amiodarone', 'Amiodarona', 'Amiodarone', 'C01BD01', ['amiodarone'], ['Trangorex'], [100, 400]),
  d('digoxin', 'Digoxina', 'Digoxin', 'C01AA05', ['digoxin'], ['Lanacordin'], [0.0625, 0.25]),
  d('lorazepam', 'Lorazepam', 'Lorazepam', 'N05BA06', ['benzo'], ['Orfidal'], [0.5, 2]),
  d('alprazolam', 'Alprazolam', 'Alprazolam', 'N05BA12', ['benzo'], ['Trankimazin'], [0.25, 2]),
  d('zolpidem', 'Zolpidem', 'Zolpidem', 'N05CF02', ['zdrug'], ['Stilnox'], [5, 10]),
  d('tramadol', 'Tramadol', 'Tramadol', 'N02AX02', ['opioid'], ['Adolonta'], [50, 100]),
  d('oxycodone', 'Oxicodona', 'Oxycodone', 'N02AA05', ['opioid'], ['Oxycontin'], [5, 80]),
  d('lactulose', 'Lactulosa', 'Lactulose', 'A06AD11', ['laxative'], ['Duphalac'], [3300, 20000]),
  d('macrogol', 'Macrogol', 'Macrogol', 'A06AD65', ['laxative'], ['Movicol'], [6500, 13000]),
  d('oxybutynin', 'Oxibutinina', 'Oxybutynin', 'G04BD04', ['anticholinergic'], ['Ditropan'], [2.5, 5]),
  d('amitriptyline', 'Amitriptilina', 'Amitriptyline', 'N06AA09', ['anticholinergic'], ['Tryptizol'], [10, 75]),
  d('prednisone', 'Prednisona', 'Prednisone', 'H02AB07', ['oral_steroid'], ['Dacortín'], [2.5, 60]),
  d('alendronate', 'Ácido alendrónico', 'Alendronic acid', 'M05BA04', ['bone_protection'], ['Fosamax'], [10, 70]),
  d('calcium_colecalciferol', 'Calcio/colecalciferol', 'Calcium/colecalciferol', 'A12AX', ['bone_protection'], ['Ideos'], [500, 1500]),
  d('aspirin', 'Ácido acetilsalicílico', 'Aspirin', 'B01AC06', ['antiplatelet', 'aspirin'], ['Adiro', 'AAS'], [75, 300]),
  d('clopidogrel', 'Clopidogrel', 'Clopidogrel', 'B01AC04', ['antiplatelet'], ['Plavix'], [75, 75]),
  d('paracetamol', 'Paracetamol', 'Paracetamol', 'N02BE01', ['analgesic'], ['Gelocatil'], [325, 1000]),
  d('gabapentin', 'Gabapentina', 'Gabapentin', 'N03AX12', ['gabapentinoid'], ['Neurontin'], [100, 1200]),
  d('pregabalin', 'Pregabalina', 'Pregabalin', 'N03AX16', ['gabapentinoid'], ['Lyrica'], [25, 300]),
  d('nitrofurantoin', 'Nitrofurantoína', 'Nitrofurantoin', 'J01XE01', ['nitrofurantoin'], ['Furantoína'], [50, 100]),
  d('bisoprolol', 'Bisoprolol', 'Bisoprolol', 'C07AB07', ['beta_blocker'], ['Emconcor'], [1.25, 10]),
];

export const DRUG_BY_ING: Record<string, Drug> = Object.fromEntries(DRUGS.map((x) => [x.ingredient, x]));

const strip = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Exact lookup (ingredient, Spanish or English name, or brand). Deterministic: no fuzzy matching. */
export function normalizeDrug(name: string): Drug | undefined {
  const n = strip(name);
  return DRUGS.find(
    (x) => [x.ingredient, x.es, x.en, ...x.brands].some((v) => strip(v) === n),
  );
}

export const drugName = (ingredient: string, lang: Lang = 'es') => DRUG_BY_ING[ingredient]?.[lang] ?? ingredient;
