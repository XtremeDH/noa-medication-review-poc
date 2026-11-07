import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleSlash, TriangleAlert, X } from 'lucide-react';
import { medLabel } from '../domain/context';
import { fmtDate } from '../domain/dates';
import { inputStatus, runReview, type Finding, type ScopeCheck } from '../domain/engine';
import { ISSUE_LABEL, type MedEntry, type Preparation } from '../domain/extraction';
import { RULE_SET_VERSION, RULES } from '../domain/rules';
import { buildTrace } from '../domain/trace';
import type { InputKey, Medication, Patient } from '../domain/types';
import { useLang } from '../i18n';
import { Quote, ResolutionControls } from '../pages/PatientPage';
import { useStore, type DoctorAction } from '../store';
import { Banner, Button, Chip, IconButton } from '../ui/ui';
import { DismissDialog, isQueueReason, reasonLabel } from './DismissDialog';
import { Collapsible, FindingCard } from './FindingCard';
import { SourceModal } from './SourceModal';

const FIRST_SHOWN = 5;

export function ReviewDrawer({
  patient, prep, active, pending, onClose,
}: { patient: Patient; prep: Preparation; active: Medication[]; pending: MedEntry[]; onClose: () => void }) {
  const { disabledRules, actions, act, addTrace, labs, setLab, enqueue, notify } = useStore();
  const { lang, t } = useLang();
  const pa = actions[patient.id];
  const dismissed = useMemo(
    () => new Set(Object.entries(pa ?? {}).filter(([, a]) => a.kind === 'dismissed').map(([k, a]) => `${k}|${a.hash}`)),
    [pa],
  );
  const review = useMemo(
    () =>
      runReview(patient, active, {
        lang,
        disabledRules,
        dismissed,
        pendingCount: pending.length,
        pendingRegular: pending.filter((e) => e.reported?.regular).length,
      }),
    [patient, active, pending, disabledRules, dismissed, lang],
  );

  const [showAll, setShowAll] = useState(false);
  const [moreInfo, setMoreInfo] = useState(false);
  const [dismissing, setDismissing] = useState<Finding | null>(null);
  const [source, setSource] = useState<Finding | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const traced = useRef<string>('');

  useEffect(() => {
    if (traced.current === review.scope.status) return;
    traced.current = review.scope.status;
    addTrace(buildTrace(patient, prep, review, lang));
  }, [review, patient, prep, addTrace, lang]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dismissing && !source) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, dismissing, source]);

  // Keep the open modal pointing at the re-rendered finding when the language changes.
  const sourceFinding = source && review.findings.find((f) => f.key === source.key);

  const validAction = (f: Finding) => (pa?.[f.key]?.hash === f.hash ? pa[f.key] : undefined);
  const majorsOpen = review.findings.filter((f) => f.severity === 'major' && !validAction(f)).length;
  const shown = showAll ? review.findings : review.findings.slice(0, FIRST_SHOWN);
  const ctx = review.ctx;
  const vital = (i: InputKey) => inputStatus(i, ctx);
  const noData = t('Sin dato', 'No data');

  const onAct = (f: Finding, a: DoctorAction | null) => act(patient.id, f.key, a);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden />
      <div className="animate-slide-in relative flex h-full w-full max-w-[600px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 id="review-title" className="text-xl font-medium">{t('Revisión de medicación', 'Medication review')}</h2>
          <IconButton ref={closeRef} label={t('Cerrar', 'Close')} className="border-0" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-4 gap-2" data-tour="vitals">
            <Vital label={t('FGe', 'eGFR')} value={ctx.egfr !== undefined ? `${ctx.egfr}` : noData} date={ctx.latestCreatinine?.date} stale={!vital('creatinine').ok} />
            <Vital label={t('ClCr', 'CrCl')} value={ctx.crcl !== undefined ? `${ctx.crcl}` : noData} date={ctx.latestCreatinine?.date} stale={!vital('creatinine').ok || !vital('weight').ok} />
            <Vital label={t('Potasio', 'Potassium')} value={vital('potassium').value ?? noData} date={vital('potassium').date} stale={!vital('potassium').ok} />
            <Vital label={t('Peso', 'Weight')} value={vital('weight').value ?? noData} date={vital('weight').date} stale={!vital('weight').ok} />
          </div>

          <div data-tour="banner">
          <Banner title={t('Solo apoyo a la decisión', 'Decision support only')}>
            <span className={moreInfo ? '' : 'line-clamp-2'}>
              {t(
                `Noa ha comparado la medicación de esta consulta con ${RULES.length - review.disabled.length} reglas (${RULE_SET_VERSION}) basadas en STOPP/START v3, fichas técnicas de CIMA y guías clínicas. Cada hallazgo indica la regla y la fuente que lo generan. Modo solo reglas: las explicaciones son los mensajes fijos de cada regla; la IA solo extrajo la medicación de la consulta y no decide, ordena ni asigna gravedad. Usted decide.`,
                `Noa compared the medication from this visit with ${RULES.length - review.disabled.length} rules (${RULE_SET_VERSION}) based on STOPP/START v3, CIMA SmPCs and clinical guidelines. Each finding names the rule and source behind it. Rules-only mode: explanations are each rule's fixed message; the AI only extracted the medication from the consultation and does not decide, rank or set severity. You decide.`,
              )}
            </span>
            <button type="button" className="mt-0.5 cursor-pointer font-medium text-ink underline" onClick={() => setMoreInfo((v) => !v)}>
              {moreInfo ? t('Mostrar menos', 'Show less') : t('Mostrar más', 'Show more')}
            </button>
          </Banner>
          </div>

          {review.scope.status === 'out_of_scope' && (
            <div className="rounded-lg border border-line p-5">
              <div className="flex items-center gap-2 font-medium">
                <CircleSlash aria-hidden className="size-5 text-ink-3" />
                {t('Fuera de alcance: no se hace revisión', 'Out of scope: no review')}
              </div>
              <p className="mt-1 text-sm text-ink-2">
                {t(
                  'El sistema está validado para pacientes de 65 años o más, con 5 o más medicamentos habituales y al menos 2 enfermedades crónicas.',
                  'The system is validated for patients aged 65 or over, on 5 or more regular medicines and with at least 2 chronic conditions.',
                )}
              </p>
              <ScopeChecks checks={review.scope.checks} />
            </div>
          )}

          {review.scope.status === 'waiting' && (
            <div className="rounded-lg border border-moderate/40 p-5" data-tour="confirm">
              <div className="flex items-center gap-2 font-medium">
                <TriangleAlert aria-hidden className="size-5 text-moderate" />
                {t(
                  `Confirme ${pending.length} medicamento${pending.length > 1 ? 's' : ''} antes de la revisión`,
                  `Confirm ${pending.length} medicine${pending.length > 1 ? 's' : ''} before the review`,
                )}
              </div>
              <p className="mt-1 text-sm text-ink-2">
                {t(
                  'Las reglas solo se ejecutan con una lista de medicación confirmada. Nada de lo que la IA no está segura llega a las reglas sin su confirmación.',
                  'Rules only run on a confirmed medication list. Nothing the AI is unsure about reaches the rules without your confirmation.',
                )}
              </p>
              <ul className="mt-4 space-y-3">
                {pending.map((e) => {
                  const m = e.reported ?? e.listed!;
                  return (
                    <li key={e.key} className="rounded-md bg-canvas p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{medLabel(m, lang)}</span>
                        <Chip tone="moderate">{ISSUE_LABEL[lang][e.issue!]}</Chip>
                      </div>
                      <div className="mt-1 text-[13px] text-ink-2">{e.issueText}</div>
                      {e.reported?.evidence && (
                        <div className="mt-1 text-xs text-ink-2">
                          <Quote text={e.reported.evidence} className="block italic" />
                        </div>
                      )}
                      <div className="mt-2">
                        <ResolutionControls pid={patient.id} entry={e} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {review.scope.status === 'pass' && (
            <div className="rounded-lg border border-line">
              <div className="flex items-baseline justify-between px-4 pt-4 pb-3">
                <h3 className="text-[15px] font-medium">{t('Hallazgos · ordenados por gravedad', 'Findings · ranked by severity')}</h3>
                <span className="text-xs text-ink-3">
                  {t(`${shown.length} de ${review.findings.length}`, `${shown.length} of ${review.findings.length}`)}
                </span>
              </div>
              <div className="space-y-3 px-2 pb-2">
                {review.findings.length === 0 && (
                  <p className="px-2 pb-3 text-sm text-ink-2">{t('Sin hallazgos con las reglas activas.', 'No findings with the active rules.')}</p>
                )}
                {shown.map((f) => (
                  <FindingCard
                    key={f.key}
                    f={f}
                    action={validAction(f)}
                    lab={labs[patient.id]?.[f.missing?.status.input ?? '']}
                    onAct={(a) => onAct(f, a)}
                    onDismiss={() => setDismissing(f)}
                    onSource={() => setSource(f)}
                    onLab={(status) => {
                      setLab(patient.id, { input: f.missing!.status.input, tests: f.missing!.tests, status });
                      if (status === 'sent')
                        onAct(f, { kind: 'accepted', note: t('Analítica solicitada', 'Lab test ordered'), hash: f.hash, at: new Date().toISOString() });
                      notify(
                        status === 'draft'
                          ? t('Borrador creado. Revíselo y envíelo usted.', 'Draft created. Review it and send it yourself.')
                          : status === 'sent'
                            ? t('Solicitud de analítica enviada', 'Lab order sent')
                            : t('Solicitud enviada al paciente', 'Request sent to the patient'),
                      );
                    }}
                  />
                ))}
                {review.findings.length > FIRST_SHOWN && (
                  <Button variant="ghost" className="w-full" onClick={() => setShowAll((v) => !v)}>
                    {showAll
                      ? t('Mostrar solo los 5 primeros', 'Show only the first 5')
                      : t(`Mostrar ${review.findings.length - FIRST_SHOWN} hallazgos más`, `Show ${review.findings.length - FIRST_SHOWN} more findings`)}
                  </Button>
                )}
              </div>
            </div>
          )}

          {review.suppressed.length > 0 && (
            <Collapsible title={t(`Descartados para este paciente (${review.suppressed.length})`, `Dismissed for this patient (${review.suppressed.length})`)}>
              {review.suppressed.map((f) => (
                <div key={f.key} className="flex items-start justify-between gap-3 rounded-md border border-line p-3 text-sm">
                  <div>
                    <div className="font-medium">{f.title}</div>
                    <div className="text-xs text-ink-2">
                      {pa?.[f.key]?.reason && reasonLabel(pa[f.key].reason!, lang)} ·{' '}
                      {t('oculto hasta que cambie algún dato de entrada', 'hidden until an input changes')}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onAct(f, null)}>
                    {t('Restaurar', 'Restore')}
                  </Button>
                </div>
              ))}
            </Collapsible>
          )}
        </div>

        <div className="border-t border-line px-6 py-4" data-tour="finish">
          <p className="mb-3 text-center text-xs text-ink-3">
            {t('Información para apoyar su revisión. Usted decide.', 'Information to support your review. You decide.')}
          </p>
          <Button
            variant="primary"
            className="w-full"
            disabled={review.scope.status !== 'pass' || majorsOpen > 0}
            onClick={() => {
              notify(t('Revisión finalizada y registrada en la traza', 'Review finished and recorded in the trace'));
              onClose();
            }}
          >
            {review.scope.status === 'pass' && majorsOpen > 0
              ? t(
                  `Revise ${majorsOpen} hallazgo${majorsOpen > 1 ? 's' : ''} mayor${majorsOpen > 1 ? 'es' : ''} para finalizar`,
                  `Review ${majorsOpen} major finding${majorsOpen > 1 ? 's' : ''} to finish`,
                )
              : t('Finalizar revisión', 'Finish review')}
          </Button>
        </div>
      </div>

      {dismissing && (
        <DismissDialog
          finding={dismissing}
          onCancel={() => setDismissing(null)}
          onConfirm={(reason, note) => {
            onAct(dismissing, { kind: 'dismissed', reason, note, hash: dismissing.hash, at: new Date().toISOString() });
            if (isQueueReason(reason)) {
              enqueue({ patientId: patient.id, findingKey: dismissing.key, title: dismissing.title, reason, note, at: new Date().toISOString() });
              notify(t('Enviado a la cola de revisión clínica', 'Sent to the clinical review queue'));
            }
            setDismissing(null);
          }}
        />
      )}
      {sourceFinding && <SourceModal finding={sourceFinding} onClose={() => setSource(null)} />}
    </div>
  );
}

function Vital({ label, value, date, stale }: { label: string; value: string; date?: string; stale: boolean }) {
  const { t } = useLang();
  return (
    <div className={`rounded-md border px-3 py-2 ${stale ? 'border-moderate/40 bg-moderate-bg/60' : 'border-line'}`}>
      <div className="text-xs text-ink-3">{label}</div>
      <div className="text-[15px] font-medium">{value}</div>
      <div className={`text-[11px] ${stale ? 'text-moderate' : 'text-ink-3'}`}>
        {date ? fmtDate(date) : t('Sin fecha', 'No date')}
        {stale ? ` · ${t('antiguo', 'old')}` : ''}
      </div>
    </div>
  );
}

function ScopeChecks({ checks }: { checks: ScopeCheck[] }) {
  const { t } = useLang();
  return (
    <ul className="mt-3 divide-y divide-line text-sm">
      {checks.map((c) => (
        <li key={c.label} className="flex justify-between gap-3 py-2">
          <span>{c.label}</span>
          <span className={c.pass ? 'text-ink-2' : 'font-medium text-major'}>
            {c.found} <span className="text-xs text-ink-3">({t('requerido', 'required')} {c.expected})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
