import { doseText, SOURCE_LABEL } from './context';
import { DRUG_BY_ING, normalizeDrug } from './drugs';
import type { TraceSpan } from './engine';
import { tr, type L, type Lang } from './lang';
import type { ExtractedItem, Medication, Patient } from './types';

export type IssueKind = 'low_confidence' | 'dose_conflict' | 'stopped_vs_listed' | 'unknown_drug' | 'dose_out_of_range';
export type Resolution = 'use_listed' | 'use_reported' | 'confirm' | 'reject';

export interface MedEntry {
  key: string;
  listed?: Medication;
  reported?: Medication;
  issue?: IssueKind;
  issueText?: string;
}

export interface Dropped {
  item: ExtractedItem;
  reason: string;
}

export interface Preparation {
  entries: MedEntry[];
  dropped: Dropped[];
  spans: TraceSpan[];
}

export const CONFIDENCE_THRESHOLD = 0.8;

export const RESOLUTION_OPTIONS: Record<IssueKind, { value: Resolution; label: L }[]> = {
  low_confidence: [
    { value: 'confirm', label: { es: 'Confirmar', en: 'Confirm' } },
    { value: 'reject', label: { es: 'Descartar', en: 'Discard' } },
  ],
  dose_conflict: [
    { value: 'use_listed', label: { es: 'Usar historia', en: 'Use record' } },
    { value: 'use_reported', label: { es: 'Usar lo referido', en: 'Use what patient said' } },
  ],
  stopped_vs_listed: [
    { value: 'use_reported', label: { es: 'Lo ha dejado', en: 'Has stopped it' } },
    { value: 'use_listed', label: { es: 'Sigue tomándolo', en: 'Still taking it' } },
  ],
  unknown_drug: [{ value: 'reject', label: { es: 'Descartar', en: 'Discard' } }],
  dose_out_of_range: [
    { value: 'confirm', label: { es: 'Dosis correcta', en: 'Dose is correct' } },
    { value: 'reject', label: { es: 'Descartar', en: 'Discard' } },
  ],
};

export const ISSUE_LABEL: Record<Lang, Record<IssueKind, string>> = {
  es: {
    low_confidence: 'Confianza baja',
    dose_conflict: 'Conflicto de dosis',
    stopped_vs_listed: 'Dejado vs. registrado',
    unknown_drug: 'No reconocido',
    dose_out_of_range: 'Dosis fuera de rango',
  },
  en: {
    low_confidence: 'Low confidence',
    dose_conflict: 'Dose conflict',
    stopped_vs_listed: 'Stopped vs. on record',
    unknown_drug: 'Not recognised',
    dose_out_of_range: 'Dose out of range',
  },
};

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Deterministic checks on the LLM extraction output, then reconciliation with listed medicines. */
export function prepareMedications(p: Patient, lang: Lang = 'es'): Preparation {
  const t = (es: string, en: string) => tr(lang, es, en);
  const text = squash(p.transcript.map((l) => l.text).join(' '));
  const dropped: Dropped[] = [];
  const reported: Medication[] = [];
  let unknown = 0;
  let outOfRange = 0;

  p.extraction.forEach((item, i) => {
    if (!text.includes(squash(item.evidence))) {
      dropped.push({
        item,
        reason: t(
          'La frase de evidencia no aparece en la transcripción: posible alucinación.',
          'The evidence sentence does not appear in the transcript: possible hallucination.',
        ),
      });
      return;
    }
    const drug = (item.ingredient && DRUG_BY_ING[item.ingredient]) || normalizeDrug(item.name_as_said);
    reported.push({
      id: `t${i}`,
      name: item.name_as_said,
      ingredient: drug?.ingredient ?? null,
      dose_mg: item.dose_mg,
      doses_per_day: item.doses_per_day,
      frequency: item.frequency,
      regular: item.regular,
      status: item.status,
      source: 'transcript',
      confidence: item.confidence,
      evidence: item.evidence,
    });
  });

  const entries = new Map<string, MedEntry>();
  for (const m of p.medications) entries.set(m.ingredient ?? m.name, { key: m.ingredient ?? m.name, listed: m });

  let conflicts = 0;
  for (const r of reported) {
    const key = r.ingredient ?? r.name;
    const e = entries.get(key) ?? { key };
    e.reported = r;
    entries.set(key, e);

    const range = r.ingredient ? DRUG_BY_ING[r.ingredient].doseRangeMg : undefined;
    if (!r.ingredient) {
      e.issue = 'unknown_drug';
      e.issueText = t(`"${r.name}" no está en el diccionario de medicamentos.`, `"${r.name}" is not in the drug dictionary.`);
      unknown++;
    } else if (range && r.dose_mg !== null && (r.dose_mg < range[0] || r.dose_mg > range[1])) {
      e.issue = 'dose_out_of_range';
      e.issueText = t(
        `${r.dose_mg} mg está fuera del rango habitual (${range[0]}-${range[1]} mg por toma): posible error de transcripción.`,
        `${r.dose_mg} mg is outside the usual range (${range[0]}-${range[1]} mg per dose): possible mishearing.`,
      );
      outOfRange++;
    } else if (e.listed) {
      const l = e.listed;
      if (r.status === 'stopped' && l.status === 'taking') {
        e.issue = 'stopped_vs_listed';
        e.issueText = t(
          `El paciente dice que lo ha dejado; figura en ${SOURCE_LABEL.es[l.source]}.`,
          `The patient says they stopped it; it is listed in ${SOURCE_LABEL.en[l.source]}.`,
        );
        conflicts++;
      } else if (
        (r.dose_mg !== null && l.dose_mg !== null && r.dose_mg !== l.dose_mg) ||
        (r.doses_per_day !== null && l.doses_per_day !== null && r.doses_per_day !== l.doses_per_day)
      ) {
        e.issue = 'dose_conflict';
        e.issueText = t(
          `Historia: ${doseText(l, lang)} · Consulta: ${doseText(r, lang)}`,
          `Record: ${doseText(l, lang)} · Consultation: ${doseText(r, lang)}`,
        );
        conflicts++;
      }
    } else if (r.confidence !== undefined && r.confidence < CONFIDENCE_THRESHOLD) {
      e.issue = 'low_confidence';
      e.issueText = t(
        `Confianza ${Math.round(r.confidence * 100)} %: confirme nombre, dosis y pauta.`,
        `Confidence ${Math.round(r.confidence * 100)}%: confirm name, dose and frequency.`,
      );
    }
  }

  const list = [...entries.values()];
  const low = list.filter((e) => e.issue === 'low_confidence').length;
  const spans: TraceSpan[] = [
    {
      stage: t('Extracción (LLM)', 'Extraction (LLM)'),
      status: 'mock',
      ms: 0,
      detail: t(`Salida simulada de extract.v2.3.0: ${p.extraction.length} elementos`, `Mocked output of extract.v2.3.0: ${p.extraction.length} items`),
    },
    {
      stage: t('Verificación de evidencia', 'Evidence check'),
      status: dropped.length ? 'warn' : 'ok',
      ms: 0,
      detail: dropped.length
        ? t(`${dropped.length} elemento descartado y registrado como alucinación`, `${dropped.length} item dropped and logged as a hallucination`)
        : t('Todas las frases aparecen literalmente', 'All sentences appear verbatim'),
    },
    {
      stage: t('Diccionario y rango de dosis', 'Dictionary and dose range'),
      status: unknown + outOfRange ? 'warn' : 'ok',
      ms: 0,
      detail: t(`${unknown} no reconocidos · ${outOfRange} dosis fuera de rango`, `${unknown} not recognised · ${outOfRange} doses out of range`),
    },
    {
      stage: t('Reconciliación', 'Reconciliation'),
      status: conflicts ? 'warn' : 'ok',
      ms: 0,
      detail: t(
        `${list.length} medicamentos · ${conflicts} conflictos · ${low} con confianza baja`,
        `${list.length} medicines · ${conflicts} conflicts · ${low} low confidence`,
      ),
    },
  ];
  return { entries: list, dropped, spans };
}

const merge = (l: Medication, r: Medication): Medication => ({
  ...l,
  dose_mg: r.dose_mg ?? l.dose_mg,
  doses_per_day: r.doses_per_day ?? l.doses_per_day,
  frequency: r.frequency ?? l.frequency,
  status: r.status,
  evidence: r.evidence,
  source: 'transcript',
});

export function resolveMedications(entries: MedEntry[], res: Record<string, Resolution>) {
  const active: Medication[] = [];
  const pending: MedEntry[] = [];
  for (const e of entries) {
    if (!e.issue) {
      active.push(e.listed ? { ...e.listed, evidence: e.reported?.evidence ?? e.listed.evidence } : e.reported!);
      continue;
    }
    const r = res[e.key];
    if (!r) {
      pending.push(e);
      continue;
    }
    if (r === 'use_listed' && e.listed) active.push(e.listed);
    if (r === 'use_reported' && e.reported) active.push(e.listed ? merge(e.listed, e.reported) : e.reported);
    if (r === 'confirm' && e.reported) active.push({ ...e.reported, confidence: 1 });
  }
  return { active: active.filter((m) => m.status === 'taking'), pending };
}
