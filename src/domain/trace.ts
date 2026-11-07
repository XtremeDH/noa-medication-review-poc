import type { ReviewResult, TraceSpan } from './engine';
import type { Preparation } from './extraction';
import { tr, type Lang } from './lang';
import { RULE_SET_VERSION } from './rules';
import type { Patient, Severity } from './types';

export const versions = (lang: Lang): Record<string, string> => {
  const t = (es: string, en: string) => tr(lang, es, en);
  return {
    [t('Conjunto de reglas', 'Rule set')]: RULE_SET_VERSION,
    [t('Base de medicamentos', 'Drug database')]: t('Diccionario simulado ES 2026.10 (licencia pendiente)', 'Mock ES dictionary 2026.10 (licence pending)'),
    [t('Prompt de extracción', 'Extraction prompt')]: 'extract.v2.3.0',
    [t('Prompt de explicación', 'Rationale prompt')]: t('rationale.v1.0.0 (no usado)', 'rationale.v1.0.0 (not used)'),
    [t('Modelo', 'Model')]: t('Ninguno: extracción simulada en el POC', 'None: extraction mocked in the POC'),
    [t('Índice de fuentes', 'Source index')]: t('sources-es 2026.10 (citas fijadas)', 'sources-es 2026.10 (pinned citations)'),
  };
};

export interface TraceAction {
  findingKey: string;
  kind: string;
  reason?: string;
  at: string;
}

export interface Trace {
  id: string;
  patientId: string;
  patientRef: string;
  startedAt: string;
  versions: Record<string, string>;
  route: string[];
  spans: TraceSpan[];
  findings: { key: string; title: string; severity: Severity; rules: string[] }[];
  dropped: string[];
  actions: TraceAction[];
}

const pseudo = (id: string) => `pt_${[...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(16)}`;

export function buildTrace(p: Patient, prep: Preparation, r: ReviewResult, lang: Lang = 'es'): Trace {
  const t = (es: string, en: string) => tr(lang, es, en);
  const scope =
    r.scope.status === 'pass'
      ? t('en alcance', 'in scope')
      : r.scope.status === 'waiting'
        ? t('esperando confirmación', 'waiting for confirmation')
        : t('fuera de alcance', 'out of scope');
  return {
    id: `tr_${Date.now().toString(36)}`,
    patientId: p.id,
    patientRef: pseudo(p.id),
    startedAt: new Date().toISOString(),
    versions: versions(lang),
    route: [
      t('Mercado: ES · idioma de la consulta: es-ES', 'Market: ES · consultation language: es-ES'),
      t('Extracción: salida simulada (sin llamada a LLM)', 'Extraction: mocked output (no LLM call)'),
      `${t('Alcance', 'Scope')}: ${scope}`,
      t('Explicación: modo solo reglas (mensajes fijos)', 'Explanation: rules-only mode (fixed messages)'),
    ],
    spans: [...prep.spans, ...r.spans],
    findings: [...r.findings, ...r.suppressed].map((f) => ({
      key: f.key,
      title: f.title,
      severity: f.severity,
      rules: f.reasons.length ? f.reasons.map((x) => x.ruleId) : (f.missing?.blockedRules ?? []),
    })),
    dropped: prep.dropped.map((d) => `${d.item.name_as_said}: "${d.item.evidence}"`),
    actions: [],
  };
}
