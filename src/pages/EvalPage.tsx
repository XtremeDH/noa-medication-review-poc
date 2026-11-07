import { useState } from 'react';
import { CircleCheck, CircleX, Play } from 'lucide-react';
import { CASE_KIND_LABEL, majorSensitivity, runEval, type EvalOutcome } from '../data/evalCases';
import { RULE_SET_VERSION } from '../domain/rules';
import { useLang } from '../i18n';
import { useStore } from '../store';
import { Banner, Button, Card, Chip } from '../ui/ui';

export function EvalPage() {
  const { disabledRules } = useStore();
  const { lang, t } = useLang();
  const [outcomes, setOutcomes] = useState<EvalOutcome[] | null>(null);
  const [ranAt, setRanAt] = useState('');

  const passed = outcomes?.filter((o) => o.pass).length ?? 0;
  const sens = outcomes ? majorSensitivity(outcomes) : null;
  const gate = outcomes && sens && sens.found === sens.expected && passed === outcomes.length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-medium">{t('Evaluación', 'Evaluation')}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {t(
              'Conjunto congelado de casos por regla (debe disparar, no debe disparar, límite, faltan datos). Se ejecuta con la configuración actual de reglas',
              'Frozen set of cases per rule (should fire, should not fire, borderline, missing data). Runs against the current rule configuration',
            )}
            : {RULE_SET_VERSION}
            {disabledRules.size > 0 && t(`, ${disabledRules.size} desactivadas`, `, ${disabledRules.size} switched off`)}.
          </p>
        </div>
        <Button
          variant="primary"
          data-tour="eval-run"
          icon={<Play className="size-4" />}
          onClick={() => {
            setOutcomes(runEval(disabledRules));
            setRanAt(new Date().toLocaleTimeString(lang === 'en' ? 'en-GB' : 'es-ES'));
          }}
        >
          {t('Ejecutar conjunto congelado', 'Run frozen set')}
        </Button>
      </div>

      <Banner title={t('Puerta de publicación', 'Release gate')}>
        {t(
          'Nada se publica sin 0 hallazgos mayores omitidos en el conjunto sintético. Todo cambio de regla, prompt, modelo o base de medicamentos vuelve a ejecutar los mismos casos.',
          'Nothing ships unless the synthetic set shows zero missed major findings. Every rule, prompt, model or drug database change reruns the same cases.',
        )}
      </Banner>

      {outcomes && sens && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label={t('Casos superados', 'Cases passed')} value={`${passed} / ${outcomes.length}`} ok={passed === outcomes.length} />
          <Metric
            label={t('Sensibilidad en hallazgos mayores', 'Sensitivity, major findings')}
            value={`${Math.round((sens.found / Math.max(1, sens.expected)) * 100)} %`}
            sub={t(`${sens.found} de ${sens.expected}`, `${sens.found} of ${sens.expected}`)}
            ok={sens.found === sens.expected}
          />
          <Metric
            label={t('Puerta de publicación', 'Release gate')}
            value={gate ? t('Superada', 'Passed') : t('Bloqueada', 'Blocked')}
            sub={t(`Ejecutado a las ${ranAt}`, `Run at ${ranAt}`)}
            ok={!!gate}
          />
        </div>
      )}

      {outcomes && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs text-ink-2">
              <tr>
                <th className="px-5 py-3 font-medium">{t('Caso', 'Case')}</th>
                <th className="px-3 py-3 font-medium">{t('Tipo', 'Type')}</th>
                <th className="px-3 py-3 font-medium">{t('Esperado', 'Expected')}</th>
                <th className="px-3 py-3 font-medium">{t('Obtenido', 'Got')}</th>
                <th className="px-5 py-3 font-medium">{t('Resultado', 'Result')}</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((o) => (
                <tr key={o.case.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5">
                    <span className="font-medium">{o.case.id}</span> <span className="text-ink-2">{o.case.title[lang]}</span>
                  </td>
                  <td className="px-3 py-2.5"><Chip>{CASE_KIND_LABEL[o.case.kind][lang]}</Chip></td>
                  <td className="px-3 py-2.5 text-xs text-ink-2">
                    {o.case.fire && `${t('Dispara', 'Fires')} ${o.case.fire.join(', ')}`}
                    {o.case.notFire && `${t('No dispara', 'Does not fire')} ${o.case.notFire.join(', ')}`}
                    {o.case.blocked && t(`Bloquea ${o.case.blocked.join(', ')} por datos`, `Blocks ${o.case.blocked.join(', ')} on data`)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ink-2">
                    {o.fired.length ? `${t('Disparadas', 'Fired')}: ${o.fired.join(', ')}` : t('Ninguna disparada', 'None fired')}
                    {o.blocked.length > 0 && ` · ${t('bloqueadas', 'blocked')}: ${o.blocked.join(', ')}`}
                  </td>
                  <td className="px-5 py-2.5">
                    {o.pass ? (
                      <span className="flex items-center gap-1.5 text-brand-800">
                        <CircleCheck aria-hidden className="size-4" /> {t('Superado', 'Passed')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-medium text-major">
                        <CircleX aria-hidden className="size-4" /> {t('Fallo', 'Failed')}
                        {o.missed.length > 0 && ` · ${t('omitido', 'missed')} ${o.missed.join(', ')}`}
                        {o.unexpected.length > 0 && ` · ${t('inesperado', 'unexpected')} ${o.unexpected.join(', ')}`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value, sub, ok }: { label: string; value: string; sub?: string; ok: boolean }) {
  return (
    <Card className={`p-5 ${ok ? '' : 'border-major/40 bg-major-bg/40'}`}>
      <div className="text-xs text-ink-2">{label}</div>
      <div className={`mt-1 text-2xl font-medium ${ok ? 'text-brand-800' : 'text-major'}`}>{value}</div>
      {sub && <div className="text-xs text-ink-3">{sub}</div>}
    </Card>
  );
}
