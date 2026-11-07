import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PATIENTS } from '../data/patients';
import { SEVERITY_LABEL } from '../domain/rules';
import type { Trace } from '../domain/trace';
import { useLang } from '../i18n';
import { reasonLabel } from '../review/DismissDialog';
import { useStore } from '../store';
import { Banner, Card, Chip } from '../ui/ui';

const SPAN_TONE = { ok: 'brand', warn: 'moderate', skip: 'neutral', mock: 'judge' } as const;
const SPAN_LABEL = {
  es: { ok: 'Correcto', warn: 'Aviso', skip: 'Omitido', mock: 'Simulado' },
  en: { ok: 'OK', warn: 'Warning', skip: 'Skipped', mock: 'Mocked' },
};
const ACTION_LABEL: Record<string, { es: string; en: string }> = {
  accepted: { es: 'aceptado', en: 'accepted' },
  modified: { es: 'modificado', en: 'modified' },
  dismissed: { es: 'descartado', en: 'dismissed' },
  undone: { es: 'deshecho', en: 'undone' },
};

export function AuditPage() {
  const { traces } = useStore();
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6" data-tour="audit">
      <div>
        <h1 className="text-[22px] font-medium">{t('Auditoría', 'Audit')}</h1>
        <p className="mt-1 text-sm text-ink-2">
          {t(
            'Una traza por revisión: versiones, ruta, cada etapa y cada acción del médico. Paciente seudonimizado. Cada traza queda en el idioma en que se generó.',
            'One trace per review: versions, route, every stage and every doctor action. Patient pseudonymised. Each trace keeps the language it was created in.',
          )}
        </p>
      </div>
      {traces.length === 0 ? (
        <Banner title={t('Sin trazas todavía', 'No traces yet')}>
          {t('Abra un paciente y pulse “Revisar medicación” para generar una traza.', 'Open a patient and click “Review medication” to create a trace.')}
        </Banner>
      ) : (
        <div className="space-y-3">
          {traces.map((tr) => (
            <TraceRow key={tr.id + tr.startedAt} tr={tr} />
          ))}
        </div>
      )}
    </div>
  );
}

function TraceRow({ tr }: { tr: Trace }) {
  const [open, setOpen] = useState(false);
  const { lang, t } = useLang();
  const name = PATIENTS.find((p) => p.id === tr.patientId)?.name;
  const time = (iso: string) => new Date(iso).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'es-ES');
  return (
    <Card>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left"
      >
        {open ? <ChevronDown className="size-4 text-ink-3" /> : <ChevronRight className="size-4 text-ink-3" />}
        <span className="font-mono text-xs text-ink-3">{tr.id}</span>
        <span className="font-medium">{tr.patientRef}</span>
        <span className="text-xs text-ink-3" title={t('Solo visible para el médico responsable', 'Only visible to the treating doctor')}>
          ({name})
        </span>
        <span className="ml-auto flex items-center gap-2 text-xs text-ink-2">
          <Chip>{tr.findings.length} {t('hallazgos', 'findings')}</Chip>
          <Chip>{tr.actions.length} {t('acciones', 'actions')}</Chip>
          {time(tr.startedAt)}
        </span>
      </button>
      {open && (
        <div className="grid gap-6 border-t border-line px-5 py-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-medium text-ink-2">{t('Etapas', 'Stages')}</h3>
            <ol className="space-y-2 text-sm">
              {tr.spans.map((s, i) => (
                <li key={i} className="rounded-md border border-line p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.stage}</span>
                    <Chip tone={SPAN_TONE[s.status]}>{SPAN_LABEL[lang][s.status]}</Chip>
                    <span className="ml-auto text-xs text-ink-3">{s.ms} ms</span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-2">{s.detail}</div>
                </li>
              ))}
            </ol>
            {tr.dropped.length > 0 && (
              <div className="mt-3 text-xs text-major">
                {t('Alucinaciones registradas', 'Logged hallucinations')}: {tr.dropped.join(' · ')}
              </div>
            )}
          </div>
          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-xs font-medium text-ink-2">{t('Versiones', 'Versions')}</h3>
              <dl className="grid grid-cols-[160px_1fr] gap-x-3 gap-y-1 text-xs">
                {Object.entries(tr.versions).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink-3">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-medium text-ink-2">{t('Ruta', 'Route')}</h3>
              <ul className="list-disc pl-5 text-xs">{tr.route.map((r) => <li key={r}>{r}</li>)}</ul>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-medium text-ink-2">{t('Hallazgos', 'Findings')}</h3>
              <ul className="text-xs">
                {tr.findings.map((f) => (
                  <li key={f.key}>
                    {SEVERITY_LABEL[lang][f.severity]} · {f.title} · {f.rules.join(', ')}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-medium text-ink-2">{t('Acciones del médico', 'Doctor actions')}</h3>
              {tr.actions.length === 0 ? (
                <p className="text-xs text-ink-3">{t('Ninguna todavía', 'None yet')}</p>
              ) : (
                <ul className="text-xs">
                  {tr.actions.map((a, i) => (
                    <li key={i}>
                      {time(a.at)} · {a.findingKey} · {ACTION_LABEL[a.kind]?.[lang] ?? a.kind}
                      {a.reason && ` · ${reasonLabel(a.reason, lang)}`}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </Card>
  );
}
