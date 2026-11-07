import { buildContext, INPUT_LABEL, type RuleContext } from './context';
import { daysBetween, fmtDate, fmtNum, TODAY } from './dates';
import { tr, type Lang } from './lang';
import { RULES, type Rule, type RuleHit } from './rules';
import type { Criterion, Fact, InputKey, Medication, Patient, RuleType, Severity } from './types';

export interface Reason {
  ruleId: string;
  ruleVersion: string;
  type: RuleType;
  severity: Severity;
  message: string;
  action: string;
  criteria: Criterion[];
  facts: Fact[];
  sourceId: string;
  actionToday?: boolean;
  needsJudgement?: string;
}

export interface InputStatus {
  input: InputKey;
  ok: boolean;
  reason: 'ok' | 'missing' | 'stale';
  maxDays: number;
  value?: string;
  date?: string;
  ageDays?: number;
}

export interface MissingInfo {
  status: InputStatus;
  blockedRules: string[];
  tests: string[];
}

export interface Finding {
  key: string;
  kind: 'rule' | 'missing_data';
  severity: Severity;
  actionToday: boolean;
  needsJudgement?: string;
  title: string;
  message: string;
  action: string;
  meds: string[];
  reasons: Reason[];
  missing?: MissingInfo;
  /** Language-neutral hash of the inputs; a dismissal only holds while this stays the same. */
  hash: string;
}

export interface ScopeCheck {
  label: string;
  expected: string;
  found: string;
  pass: boolean;
}

export interface ScopeResult {
  status: 'pass' | 'out_of_scope' | 'waiting';
  checks: ScopeCheck[];
}

export interface TraceSpan {
  stage: string;
  status: 'ok' | 'warn' | 'skip' | 'mock';
  ms: number;
  detail: string;
}

export interface ReviewResult {
  scope: ScopeResult;
  ctx: RuleContext;
  findings: Finding[];
  suppressed: Finding[];
  fired: string[];
  blocked: string[];
  disabled: string[];
  spans: TraceSpan[];
}

export interface ReviewOptions {
  today?: string;
  lang?: Lang;
  disabledRules?: ReadonlySet<string>;
  /** Set of `${finding.key}|${finding.hash}` dismissed by the doctor. */
  dismissed?: ReadonlySet<string>;
  pendingCount?: number;
  pendingRegular?: number;
  ignoreScope?: boolean;
}

export const SEV_RANK: Record<Severity, number> = { major: 0, moderate: 1, minor: 2 };
const maxSev = (a: Severity, b: Severity): Severity => (SEV_RANK[a] <= SEV_RANK[b] ? a : b);

const LAB_TESTS: Record<Lang, Record<InputKey, string[]>> = {
  es: { creatinine: ['creatinina', 'FGe'], potassium: ['potasio'], sodium: ['sodio'], hba1c: ['HbA1c'], inr: ['INR'], weight: [] },
  en: { creatinine: ['creatinine', 'eGFR'], potassium: ['potassium'], sodium: ['sodium'], hba1c: ['HbA1c'], inr: ['INR'], weight: [] },
};

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function scopeGate(p: Patient, active: Medication[], pendingCount: number, pendingRegular: number, lang: Lang = 'es'): ScopeResult {
  const t = (es: string, en: string) => tr(lang, es, en);
  const regular = active.filter((m) => m.regular).length + pendingRegular;
  const exclusions = [
    p.context.pregnancy && t('embarazo', 'pregnancy'),
    p.context.chemotherapy && t('quimioterapia activa', 'active chemotherapy'),
    p.context.palliative && t('cuidados paliativos al final de la vida', 'end-of-life palliative care'),
  ].filter(Boolean) as string[];
  const none = t('Ninguna', 'None');
  const checks: ScopeCheck[] = [
    { label: t('Edad', 'Age'), expected: t('≥ 65 años', '≥ 65 years'), found: t(`${p.age} años`, `${p.age} years`), pass: p.age >= 65 },
    { label: t('Medicamentos habituales', 'Regular medicines'), expected: '≥ 5', found: `${regular}`, pass: regular >= 5 },
    { label: t('Enfermedades crónicas', 'Chronic conditions'), expected: '≥ 2', found: `${p.conditions.length}`, pass: p.conditions.length >= 2 },
    { label: t('Exclusiones', 'Exclusions'), expected: none, found: exclusions.length ? exclusions.join(', ') : none, pass: exclusions.length === 0 },
    { label: t('Medicamentos sin confirmar', 'Unconfirmed medicines'), expected: '0', found: `${pendingCount}`, pass: pendingCount === 0 },
  ];
  const status = checks.slice(0, 4).some((c) => !c.pass) ? 'out_of_scope' : pendingCount > 0 ? 'waiting' : 'pass';
  return { status, checks };
}

export function inputStatus(input: InputKey, c: RuleContext): InputStatus {
  let maxDays = 365;
  if (input === 'creatinine' && c.egfr !== undefined && c.egfr < 45) maxDays = 90;
  if (input === 'potassium' && (c.has('acei') || c.has('arb') || c.has('arni')) && c.has('mra')) maxDays = 90;
  if (input === 'inr') maxDays = 30;
  if (input === 'hba1c') maxDays = 182;

  let value: string | undefined;
  let date: string | undefined;
  if (input === 'weight') {
    if (c.patient.weight_kg) {
      value = `${fmtNum(c.patient.weight_kg, c.lang)} kg`;
      date = c.patient.weight_date;
    }
  } else {
    const l = c.lab(input);
    if (l) {
      value = `${fmtNum(l.value, c.lang)} ${l.unit}`;
      date = l.date;
    }
  }
  if (!date) return { input, ok: false, reason: 'missing', maxDays };
  const ageDays = daysBetween(date, c.today);
  const ok = ageDays <= maxDays;
  return { input, ok, reason: ok ? 'ok' : 'stale', maxDays, value, date, ageDays };
}

const requiresOf = (r: Rule, c: RuleContext) => (typeof r.requires === 'function' ? r.requires(c) : r.requires);

const rank = (a: Finding, b: Finding) =>
  SEV_RANK[a.severity] - SEV_RANK[b.severity] ||
  Number(b.actionToday) - Number(a.actionToday) ||
  Math.max(b.meds.length, b.missing?.blockedRules.length ?? 0) - Math.max(a.meds.length, a.missing?.blockedRules.length ?? 0) ||
  a.key.localeCompare(b.key);

function toReason(rule: Rule, hit: RuleHit): Reason {
  return {
    ruleId: rule.id,
    ruleVersion: rule.version,
    type: rule.type,
    severity: hit.severity ?? rule.severity,
    message: hit.message,
    action: hit.action,
    criteria: hit.criteria,
    facts: hit.facts,
    sourceId: rule.sourceId,
    actionToday: hit.actionToday,
    needsJudgement: hit.needsJudgement,
  };
}

function missingFinding(status: InputStatus, rules: Rule[], lang: Lang): Finding {
  const t = (es: string, en: string) => tr(lang, es, en);
  const label = INPUT_LABEL[lang][status.input];
  const low = /^[A-Z][a-z]+$/.test(label) ? label.toLowerCase() : label;
  const severity = rules.map((r) => r.severity).reduce(maxSev, 'minor' as Severity);
  const ids = rules.map((r) => r.id).join(', ');
  const detail =
    status.reason === 'missing'
      ? t(`Sin ${low} registrado.`, `No ${low} on record.`)
      : t(
          `Último valor ${status.value} del ${fmtDate(status.date)} (hace ${status.ageDays} días; máximo ${status.maxDays}).`,
          `Last value ${status.value} on ${fmtDate(status.date)} (${status.ageDays} days ago; maximum ${status.maxDays}).`,
        );
  const tests = LAB_TESTS[lang][status.input];
  return {
    key: `md-${status.input}`,
    kind: 'missing_data',
    severity,
    actionToday: false,
    title: status.reason === 'missing' ? t(`Falta ${low}`, `Missing ${low}`) : t(`${label} sin actualizar`, `${label} out of date`),
    message: `${detail} ${t('No se pueden ejecutar', 'Cannot run')}: ${ids}.`,
    action: tests.length
      ? t(`Solicitar ${tests.join(' y ')}, o pedir al paciente que suba resultados recientes.`, `Order ${tests.join(' and ')}, or ask the patient to upload recent results.`)
      : t('Pesar al paciente en consulta y registrar el peso.', 'Weigh the patient at the visit and record the weight.'),
    meds: [],
    reasons: [],
    missing: { status, blockedRules: rules.map((r) => r.id), tests },
    hash: hash(`${status.input}|${status.date ?? ''}|${ids}`),
  };
}

export function runReview(patient: Patient, meds: Medication[], o: ReviewOptions = {}): ReviewResult {
  const today = o.today ?? TODAY;
  const lang = o.lang ?? 'es';
  const t = (es: string, en: string) => tr(lang, es, en);
  const spans: TraceSpan[] = [];
  let tick = performance.now();
  const lap = () => {
    const n = performance.now();
    const ms = +(n - tick).toFixed(2);
    tick = n;
    return ms;
  };

  const ctx = buildContext(patient, meds, today, lang);
  const scope = scopeGate(patient, ctx.meds, o.pendingCount ?? 0, o.pendingRegular ?? 0, lang);
  spans.push({
    stage: t('Puerta de alcance', 'Scope gate'),
    status: scope.status === 'pass' ? 'ok' : 'warn',
    ms: lap(),
    detail:
      scope.status === 'pass'
        ? t('En alcance', 'In scope')
        : scope.checks.filter((c) => !c.pass).map((c) => `${c.label}: ${c.found}`).join('; '),
  });
  const empty = { ctx, findings: [], suppressed: [], fired: [], blocked: [], disabled: [] };
  if (!o.ignoreScope && scope.status !== 'pass') return { scope, spans, ...empty };

  const hits: { rule: Rule; hit: RuleHit }[] = [];
  const missing = new Map<InputKey, { status: InputStatus; rules: Rule[] }>();
  const disabled: string[] = [];
  const blocked: string[] = [];

  for (const rule of RULES) {
    if (o.disabledRules?.has(rule.id)) {
      disabled.push(rule.id);
      continue;
    }
    if (!rule.applies(ctx)) continue;
    const bad = requiresOf(rule, ctx).map((i) => inputStatus(i, ctx)).filter((s) => !s.ok);
    if (bad.length) {
      blocked.push(rule.id);
      for (const s of bad) {
        const m = missing.get(s.input) ?? { status: s, rules: [] };
        m.rules.push(rule);
        missing.set(s.input, m);
      }
      continue;
    }
    const hit = rule.evaluate(ctx);
    if (hit) hits.push({ rule, hit });
  }
  const active = RULES.length - disabled.length;
  spans.push({
    stage: t('Puerta de datos y motor de reglas', 'Data gate and rules engine'),
    status: blocked.length ? 'warn' : 'ok',
    ms: lap(),
    detail: t(
      `${active} reglas activas · ${hits.length} disparadas · ${blocked.length} bloqueadas por datos${disabled.length ? ` · ${disabled.length} desactivadas` : ''}`,
      `${active} active rules · ${hits.length} fired · ${blocked.length} blocked by data${disabled.length ? ` · ${disabled.length} switched off` : ''}`,
    ),
  });

  const groups = new Map<string, { label: string; meds: Map<string, string>; reasons: Reason[] }>();
  for (const { rule, hit } of hits) {
    const g = groups.get(hit.primary) ?? { label: hit.primaryLabel, meds: new Map<string, string>(), reasons: [] as Reason[] };
    hit.meds.forEach((m) => g.meds.set(m.id, ctx.name(m)));
    g.reasons.push(toReason(rule, hit));
    groups.set(hit.primary, g);
  }

  const all: Finding[] = [];
  for (const [primary, g] of groups) {
    const reasons = g.reasons.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.ruleId.localeCompare(b.ruleId));
    const top = reasons[0];
    all.push({
      key: `f-${primary}`,
      kind: 'rule',
      severity: reasons.map((r) => r.severity).reduce(maxSev),
      actionToday: reasons.some((r) => r.actionToday),
      needsJudgement: reasons.find((r) => r.needsJudgement)?.needsJudgement,
      title: g.label,
      message: top.message,
      action: top.action,
      meds: [...new Set(g.meds.values())],
      reasons,
      hash: hash(reasons.map((r) => `${r.ruleId}@${r.ruleVersion}:${r.facts.map((f) => f.key).join(';')}`).join('/')),
    });
  }
  for (const m of missing.values()) all.push(missingFinding(m.status, m.rules, lang));
  all.sort(rank);

  const findings = all.filter((f) => !o.dismissed?.has(`${f.key}|${f.hash}`));
  const suppressed = all.filter((f) => o.dismissed?.has(`${f.key}|${f.hash}`));
  spans.push({
    stage: t('Fusión, conflictos y ranking', 'Merge, conflicts and ranking'),
    status: 'ok',
    ms: lap(),
    detail: t(
      `${hits.length} resultados fusionados en ${groups.size} tarjetas · ${missing.size} de datos faltantes · ${suppressed.length} ocultas por descarte previo`,
      `${hits.length} results merged into ${groups.size} cards · ${missing.size} missing-data · ${suppressed.length} hidden by earlier dismissal`,
    ),
  });
  spans.push({
    stage: t('Explicación (LLM)', 'Explanation (LLM)'),
    status: 'skip',
    ms: 0,
    detail: t(
      'Modo solo reglas: se muestran los mensajes fijos de cada regla (POC sin llamadas a LLM)',
      "Rules-only mode: each rule's fixed message is shown (POC makes no LLM calls)",
    ),
  });

  return { scope, ctx, findings, suppressed, fired: hits.map((h) => h.rule.id), blocked, disabled, spans };
}
