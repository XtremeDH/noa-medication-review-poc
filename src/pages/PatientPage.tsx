import { useMemo, useState } from 'react';
import {
  ArrowLeft, CircleCheck, EllipsisVertical, FileText, Hash, MessageSquareQuote, Mic, Printer, Sparkles, TriangleAlert,
} from 'lucide-react';
import { buildContext, doseText, egfrUnit, INPUT_LABEL, medLabel, productName, SOURCE_LABEL } from '../domain/context';
import { fmtDate, TODAY } from '../domain/dates';
import { DRUG_BY_ING } from '../domain/drugs';
import { inputStatus } from '../domain/engine';
import {
  ISSUE_LABEL, prepareMedications, RESOLUTION_OPTIONS, resolveMedications, type Dropped, type MedEntry, type Resolution,
} from '../domain/extraction';
import type { InputKey, Medication, Patient } from '../domain/types';
import { useLang } from '../i18n';
import { ReviewDrawer } from '../review/ReviewDrawer';
import { useStore } from '../store';
import { Button, Card, CardHeader, Chip, IconButton } from '../ui/ui';

const NO_RES: Record<string, Resolution> = {};

export function PatientPage({ patient }: { patient: Patient }) {
  const { resolutions, go, review, setReview } = useStore();
  const { lang, t, d } = useLang();
  const open = review === patient.id;
  const prep = useMemo(() => prepareMedications(patient, lang), [patient, lang]);
  const res = resolutions[patient.id] ?? NO_RES;
  const { active, pending } = useMemo(() => resolveMedications(prep.entries, res), [prep, res]);

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <div className="flex flex-wrap items-center gap-3">
        <IconButton label={t('Volver a pacientes', 'Back to patients')} className="border-0 bg-transparent" onClick={() => go({ name: 'patients' })}>
          <ArrowLeft className="size-5" />
        </IconButton>
        <h1 className="text-[22px] font-medium">{patient.name}</h1>
        <Chip tone="brand">
          {t(`${patient.age} años`, `${patient.age} years`)} · {patient.sex === 'F' ? t('Mujer', 'Female') : t('Hombre', 'Male')}
        </Chip>
        <Chip tone="id" icon={<Hash aria-hidden className="size-3" />}>{patient.recordId}</Chip>
        <span className="text-sm text-ink-3">{patient.insurer} · {d(patient.reason)}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button icon={<FileText className="size-4" />}>{t('Nota Noa', 'Noa note')}</Button>
        <Button icon={<Printer className="size-4" />}>{t('Imprimir receta', 'Print prescription')}</Button>
        <IconButton label={t('Más acciones', 'More actions')}>
          <EllipsisVertical className="size-4" />
        </IconButton>
        <Button variant="primary" className="ml-auto" data-tour="review-btn" icon={<Sparkles className="size-4" />} onClick={() => setReview(patient.id)}>
          {t('Revisar medicación', 'Review medication')}
          {pending.length > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {t(`${pending.length} por confirmar`, `${pending.length} to confirm`)}
            </span>
          )}
        </Button>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <MedicationCard patient={patient} entries={prep.entries} pendingCount={pending.length} dropped={prep.dropped} />
          <TranscriptCard patient={patient} entries={prep.entries} />
        </div>
        <ClinicalCard patient={patient} active={active} />
      </div>

      {open && <ReviewDrawer patient={patient} prep={prep} active={active} pending={pending} onClose={() => setReview(null)} />}
    </div>
  );
}

export function ResolutionControls({ pid, entry }: { pid: string; entry: MedEntry }) {
  const { resolutions, resolve } = useStore();
  const { lang, t } = useLang();
  if (!entry.issue) return null;
  const current = resolutions[pid]?.[entry.key];
  const opts = RESOLUTION_OPTIONS[entry.issue];
  if (current) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-2">
        <CircleCheck aria-hidden className="size-4 text-brand-700" />
        {t('Confirmado por el médico', 'Confirmed by the doctor')}: {opts.find((o) => o.value === current)?.label[lang]}
        <button type="button" className="cursor-pointer text-brand-800 underline" onClick={() => resolve(pid, entry.key, null)}>
          {t('Deshacer', 'Undo')}
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((o, i) => (
        <Button key={o.value} size="sm" variant={i === 0 ? 'link' : 'outline'} onClick={() => resolve(pid, entry.key, o.value)}>
          {o.label[lang]}
        </Button>
      ))}
    </div>
  );
}

function MedicationCard({
  patient, entries, pendingCount, dropped,
}: { patient: Patient; entries: MedEntry[]; pendingCount: number; dropped: Dropped[] }) {
  const { lang, t, d } = useLang();
  return (
    <Card data-tour="med-card">
      <CardHeader
        icon={
          pendingCount ? (
            <TriangleAlert aria-hidden className="size-6 text-moderate" />
          ) : (
            <CircleCheck aria-hidden className="size-6 fill-brand-600 text-white" />
          )
        }
        title={t('Medicación reconciliada', 'Reconciled medication')}
        right={
          pendingCount ? (
            <Chip tone="moderate">{t(`${pendingCount} por confirmar`, `${pendingCount} to confirm`)}</Chip>
          ) : (
            <Chip tone="brand">{t('Confirmada', 'Confirmed')}</Chip>
          )
        }
      />
      <p className="px-6 pb-3 text-sm text-ink-2">
        {t(
          'Historia clínica, lista previa del paciente y lo referido en consulta. Sin acceso a la receta pública: lo que solo dice el paciente se marca como referido.',
          'Clinical record, patient pre-visit list and what was said in the consultation. No access to public prescriptions: anything only the patient mentions is marked as reported.',
        )}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-y border-line bg-canvas text-xs text-ink-2">
            <tr>
              <th className="px-6 py-2.5 font-medium">{t('Medicamento', 'Medicine')}</th>
              <th className="px-3 py-2.5 font-medium">{t('Dosis y pauta', 'Dose and frequency')}</th>
              <th className="px-3 py-2.5 font-medium">{t('Origen', 'Source')}</th>
              <th className="px-6 py-2.5 font-medium">{t('Evidencia y estado', 'Evidence and status')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const m = e.listed ?? e.reported!;
              const atc = m.ingredient ? DRUG_BY_ING[m.ingredient]?.atc : undefined;
              return (
                <tr key={e.key} className={`border-b border-line align-top last:border-0 ${e.issue ? 'bg-moderate-bg/50' : ''}`}>
                  <td className="px-6 py-3">
                    <div className="font-medium">{medLabel(m, lang)}</div>
                    <div className="text-xs text-ink-3">
                      {productName(m.name, lang)}
                      {atc && ` · ATC ${atc}`}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div>{doseText(m, lang)}</div>
                    {e.listed && e.reported && e.issue === 'dose_conflict' && (
                      <div className="text-xs text-moderate">{t('Referido', 'Reported')}: {doseText(e.reported, lang)}</div>
                    )}
                    {!m.regular && <div className="text-xs text-ink-3">{t('Tratamiento puntual', 'Short course')}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1">
                      {e.listed && <Chip>{SOURCE_LABEL[lang][e.listed.source]}</Chip>}
                      {e.reported && <Chip tone="brand">{SOURCE_LABEL[lang].transcript}</Chip>}
                    </div>
                    {m.prescriber && <div className="mt-1 text-xs text-ink-3">{d(m.prescriber)}</div>}
                  </td>
                  <td className="px-6 py-3">
                    {e.reported && (
                      <div className="flex gap-1.5 text-xs text-ink-2">
                        <MessageSquareQuote aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
                        <span>
                          <Quote text={e.reported.evidence!} />
                          {e.reported.confidence !== undefined && (
                            <span className="ml-1 text-ink-3">
                              · {t('confianza', 'confidence')} {Math.round(e.reported.confidence * 100)} %
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {e.issue && (
                      <div className="mt-2 space-y-2" data-tour="med-issue">
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip tone="moderate">{ISSUE_LABEL[lang][e.issue]}</Chip>
                          <span className="text-xs text-ink-2">{e.issueText}</span>
                        </div>
                        <ResolutionControls pid={patient.id} entry={e} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {dropped.length > 0 && (
        <div className="m-6 mt-4 rounded-md border border-major/30 bg-major-bg/40 p-3 text-xs text-ink-2" data-tour="dropped">
          <div className="mb-1 font-medium text-major">
            {t('Descartado por la verificación de evidencia', 'Dropped by the evidence check')} ({dropped.length})
          </div>
          {dropped.map((x) => (
            <div key={x.item.evidence}>
              <span className="font-medium text-ink">{productName(x.item.name_as_said, lang)}</span> · <Quote text={x.item.evidence} /> ·{' '}
              {x.reason} {t('No se usa en las reglas.', 'Not used by the rules.')}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** A quote from the Spanish consultation, translated in the English UI with the original on hover. */
export function Quote({ text, className = 'italic' }: { text: string; className?: string }) {
  const { lang, d, t } = useLang();
  return (
    <q className={className} lang={lang} title={lang === 'en' ? `${t('Original', 'Original')}: ${text}` : undefined}>
      {d(text)}
    </q>
  );
}

function TranscriptCard({ patient, entries }: { patient: Patient; entries: MedEntry[] }) {
  const { lang, t, d } = useLang();
  const [original, setOriginal] = useState(false);
  const translated = lang === 'en' && !original;
  const evidence = [
    ...entries.map((e) => e.reported?.evidence).filter((x): x is string => !!x),
    ...(patient.context.falls_evidence ? [patient.context.falls_evidence] : []),
  ];
  return (
    <Card data-tour="transcript">
      <CardHeader
        icon={<Mic aria-hidden className="size-5 text-brand-700" />}
        title={t('Consulta · Noa Notes', 'Consultation · Noa Notes')}
        right={
          lang === 'en' && (
            <>
              <Chip>{original ? 'Original (Spanish)' : 'Translated from Spanish'}</Chip>
              <Button size="sm" variant="ghost" aria-pressed={original} onClick={() => setOriginal((v) => !v)}>
                {original ? 'Show translation' : 'Show original'}
              </Button>
            </>
          )
        }
      />
      <div className="space-y-2 px-6 pb-6 text-sm leading-6">
        {patient.transcript.map((l, i) => {
          const ev = evidence.find((x) => l.text.includes(x));
          const idx = ev ? l.text.indexOf(ev) : -1;
          const mark = (s: string) => (
            <mark className="rounded-sm bg-brand-100 px-0.5 text-ink" title={t('Usado como evidencia en la extracción', 'Used as evidence by the extraction')}>
              {s}
            </mark>
          );
          return (
            <p key={i} className="grid grid-cols-[72px_1fr] gap-3">
              <span className={`text-xs leading-6 font-medium ${l.speaker === 'Médico' ? 'text-ink-3' : 'text-brand-800'}`}>
                {l.speaker === 'Médico' ? t('Médico', 'Doctor') : t('Paciente', 'Patient')}
              </span>
              {translated ? (
                <span lang="en">{ev ? mark(d(l.text)) : d(l.text)}</span>
              ) : (
                <span lang="es">
                  {ev ? (
                    <>
                      {l.text.slice(0, idx)}
                      {mark(ev)}
                      {l.text.slice(idx + ev.length)}
                    </>
                  ) : (
                    l.text
                  )}
                </span>
              )}
            </p>
          );
        })}
        <p className="pt-2 text-xs text-ink-3">
          {t(
            'Resaltado: frases citadas como evidencia por la extracción y verificadas literalmente.',
            'Highlighted: sentences quoted as evidence by the extraction. The check runs word for word against the Spanish original; the English text is a translation for reading.',
          )}
        </p>
      </div>
    </Card>
  );
}

function ClinicalCard({ patient, active }: { patient: Patient; active: Medication[] }) {
  const { lang, t, d } = useLang();
  const ctx = useMemo(() => buildContext(patient, active, TODAY, lang), [patient, active, lang]);
  const inputs: InputKey[] = ['creatinine', 'potassium', 'sodium', 'hba1c', 'weight'];
  return (
    <Card className="h-fit" data-tour="clinical">
      <CardHeader title={t('Datos clínicos', 'Clinical data')} />
      <div className="grid grid-cols-2 gap-3 px-6">
        <Stat
          label={t('FGe (CKD-EPI 2021)', 'eGFR (CKD-EPI 2021)')}
          value={ctx.egfr !== undefined ? `${ctx.egfr}` : t('Sin dato', 'No data')}
          unit={egfrUnit(lang)}
          sub={ctx.egfrPrev ? `${t('Antes', 'Before')} ${ctx.egfrPrev.value} (${fmtDate(ctx.egfrPrev.date)})` : undefined}
        />
        <Stat
          label={t('ClCr (Cockcroft-Gault)', 'CrCl (Cockcroft-Gault)')}
          value={ctx.crcl !== undefined ? `${ctx.crcl}` : t('Sin dato', 'No data')}
          unit="mL/min"
        />
      </div>
      <h3 className="px-6 pt-5 pb-2 text-xs font-medium text-ink-2">{t('Analíticas y peso', 'Labs and weight')}</h3>
      <ul className="px-6">
        {inputs.map((i) => {
          const s = inputStatus(i, ctx);
          return (
            <li key={i} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0">
              <span>{INPUT_LABEL[lang][i]}</span>
              <span className="flex items-center gap-2">
                <span className="font-medium">{s.value ?? t('Sin dato', 'No data')}</span>
                <span className="text-xs text-ink-3">{s.date ? fmtDate(s.date) : ''}</span>
                {s.reason === 'stale' && <Chip tone="moderate">{t(`Hace ${s.ageDays} d`, `${s.ageDays} d old`)}</Chip>}
                {s.reason === 'missing' && <Chip>{t('Falta', 'Missing')}</Chip>}
              </span>
            </li>
          );
        })}
      </ul>
      <h3 className="px-6 pt-5 pb-2 text-xs font-medium text-ink-2">{t('Diagnósticos', 'Diagnoses')}</h3>
      <ul className="space-y-1.5 px-6 text-sm">
        {patient.conditions.map((c) => (
          <li key={c.code} className="flex gap-2">
            <span className="w-12 shrink-0 text-xs leading-5 text-ink-3">{c.code}</span>
            <span>
              {d(c.label)}
              {c.detail && <span className="block text-xs text-ink-3">{d(c.detail)}</span>}
            </span>
          </li>
        ))}
      </ul>
      <h3 className="px-6 pt-5 pb-2 text-xs font-medium text-ink-2">{t('Otros', 'Other')}</h3>
      <ul className="space-y-1 px-6 pb-6 text-sm">
        <li>
          {t('Alergias', 'Allergies')}:{' '}
          {patient.allergies.length
            ? patient.allergies.map((a) => `${d(a.substance)} (${d(a.reaction)})`).join(', ')
            : t('Ninguna conocida', 'None known')}
        </li>
        <li>
          {t('Caídas en 12 meses', 'Falls in 12 months')}: {patient.context.falls_last_12m}
        </li>
      </ul>
    </Card>
  );
}

function Stat({ label, value, unit, sub }: { label: string; value: string; unit: string; sub?: string }) {
  return (
    <div className="rounded-md border border-line p-3">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="mt-1 text-xl font-medium">
        {value} <span className="text-xs font-normal text-ink-3">{unit}</span>
      </div>
      {sub && <div className="text-xs text-ink-3">{sub}</div>}
    </div>
  );
}
