import { describe, expect, it } from 'vitest';
import { EVAL_CASES, majorSensitivity, runEval } from '../data/evalCases';
import { PATIENTS } from '../data/patients';
import { runReview } from './engine';
import { td } from './lang';
import { prepareMedications, resolveMedications } from './extraction';
import { ckdEpi2021, cockcroftGault } from './renal';
import { RULES } from './rules';

const byId = (id: string) => PATIENTS.find((p) => p.id === id)!;

describe('renal', () => {
  it('CKD-EPI 2021 and Cockcroft-Gault match hand calculation', () => {
    expect(ckdEpi2021(1.6, 78, 'F')).toBe(33);
    expect(cockcroftGault(1.6, 78, 58, 'F')).toBe(27);
  });
});

describe('frozen eval set', () => {
  const outcomes = runEval();
  it.each(outcomes.map((o) => [o.case.id, o] as const))('%s', (_id, o) => {
    expect({ missed: o.missed, unexpected: o.unexpected }).toEqual({ missed: [], unexpected: [] });
  });
  it('every rule has at least one should-fire case', () => {
    const covered = new Set(EVAL_CASES.flatMap((c) => c.fire ?? []));
    expect(RULES.filter((r) => !covered.has(r.id)).map((r) => r.id)).toEqual([]);
  });
  it('release gate: 100% sensitivity on major findings', () => {
    const s = majorSensitivity(outcomes);
    expect(s.found).toBe(s.expected);
  });
  it('is deterministic (same case 3 times, same output)', () => {
    const a = JSON.stringify(runEval().map((o) => o.fired));
    expect(JSON.stringify(runEval().map((o) => o.fired))).toBe(a);
    expect(JSON.stringify(runEval().map((o) => o.fired))).toBe(a);
  });
});

describe('demo patients', () => {
  it('Carmen: drops hallucinated paracetamol and waits for 2 confirmations', () => {
    const prep = prepareMedications(byId('p1'));
    expect(prep.dropped.map((d) => d.item.name_as_said)).toEqual(['paracetamol']);
    const { active, pending } = resolveMedications(prep.entries, {});
    expect(pending.map((e) => e.issue).sort()).toEqual(['dose_conflict', 'low_confidence']);
    expect(runReview(byId('p1'), active, { pendingCount: pending.length }).scope.status).toBe('waiting');
  });

  it('Carmen: after confirmation, ibuprofen card merges K6, I1 and I2', () => {
    const p = byId('p1');
    const prep = prepareMedications(p);
    const { active } = resolveMedications(prep.entries, { ibuprofen: 'confirm', metformin: 'use_listed' });
    const r = runReview(p, active);
    const ibu = r.findings.find((f) => f.key === 'f-ibuprofen')!;
    expect(ibu.reasons.map((x) => x.ruleId).sort()).toEqual(['I1', 'I2', 'K6']);
    expect(r.fired).toContain('K2');
    expect(r.fired).toContain('K1');
    expect(r.findings.find((f) => f.key === 'f-cond:E11')?.needsJudgement).toBeTruthy();
  });

  it('Carmen: metformin as reported (850 mg/day) no longer triggers K1', () => {
    const p = byId('p1');
    const { active } = resolveMedications(prepareMedications(p).entries, { ibuprofen: 'confirm', metformin: 'use_reported' });
    expect(runReview(p, active).fired).not.toContain('K1');
  });

  it('Antonio: stale creatinine and weight block K3 and rank as major missing data', () => {
    const p = byId('p2');
    const { active } = resolveMedications(prepareMedications(p).entries, {});
    const r = runReview(p, active);
    expect(r.blocked).toEqual(expect.arrayContaining(['K3', 'K6', 'S3']));
    expect(r.findings.find((f) => f.key === 'md-creatinine')?.severity).toBe('major');
  });

  it('Mercedes: potassium 5.7 ranks first as act-today', () => {
    const p = byId('p3');
    const { active } = resolveMedications(prepareMedications(p).entries, {});
    const r = runReview(p, active);
    expect(r.findings[0].key).toBe('f-spironolactone');
    expect(r.findings[0].actionToday).toBe(true);
  });

  it('Javier: out of scope (age 61)', () => {
    const p = byId('p4');
    const { active } = resolveMedications(prepareMedications(p).entries, {});
    expect(runReview(p, active).scope.status).toBe('out_of_scope');
  });

  it('dismissal holds only while inputs are unchanged', () => {
    const p = byId('p3');
    const { active } = resolveMedications(prepareMedications(p).entries, {});
    const f = runReview(p, active).findings[0];
    const r = runReview(p, active, { dismissed: new Set([`${f.key}|${f.hash}`]) });
    expect(r.suppressed.map((x) => x.key)).toEqual([f.key]);
    const changed = { ...p, labs: p.labs.map((l) => (l.test === 'potassium' ? { ...l, value: 5.9, date: '2026-11-07' } : l)) };
    const r2 = runReview(changed, active, { dismissed: new Set([`${f.key}|${f.hash}`]) });
    expect(r2.findings.map((x) => x.key)).toContain(f.key);
  });

  it('kill switch: disabled rule does not run', () => {
    const p = byId('p3');
    const { active } = resolveMedications(prepareMedications(p).entries, {});
    expect(runReview(p, active, { disabledRules: new Set(['I3']) }).fired).not.toContain('I3');
  });

  it('English output: same findings and hashes, translated text', () => {
    const p = byId('p3');
    const { active } = resolveMedications(prepareMedications(p).entries, {});
    const es = runReview(p, active, { lang: 'es' }).findings;
    const en = runReview(p, active, { lang: 'en' }).findings;
    expect(en.map((f) => [f.key, f.hash])).toEqual(es.map((f) => [f.key, f.hash]));
    expect(en[0].message).toBe('Spironolactone with Enalapril and potassium 5.7 mmol/L.');
    expect(es[0].message).toBe('Espironolactona con Enalapril y potasio 5,7 mmol/L.');
  });

  it('every consultation sentence, evidence quote and record value has an English translation', () => {
    const strings = PATIENTS.flatMap((p) => [
      ...p.transcript.map((l) => l.text),
      ...p.extraction.map((x) => x.evidence),
      ...p.conditions.flatMap((c) => [c.label, ...(c.detail ? [c.detail] : [])]),
      ...p.medications.flatMap((m) => [m.frequency ?? '', m.prescriber ?? '']).filter(Boolean),
      p.reason,
    ]);
    expect(strings.filter((s) => td(s, 'en') === s)).toEqual([]);
  });
});
