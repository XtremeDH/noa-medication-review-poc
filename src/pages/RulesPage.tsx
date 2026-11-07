import { RULE_SET_VERSION, RULES, TYPE_LABEL } from '../domain/rules';
import { SOURCES } from '../domain/sources';
import { useLang } from '../i18n';
import { reasonLabel } from '../review/DismissDialog';
import { useStore } from '../store';
import { Banner, Card, Chip, SeverityChip } from '../ui/ui';

export function RulesPage() {
  const { disabledRules, toggleRule, queue } = useStore();
  const { lang, t } = useLang();
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-[22px] font-medium">{t('Reglas clínicas', 'Clinical rules')}</h1>
        <p className="mt-1 text-sm text-ink-2">
          {RULE_SET_VERSION} · {RULES.length} {t('reglas', 'rules')} · {RULES.length - disabledRules.size} {t('activas', 'active')}.{' '}
          {t('Cada juicio clínico vive en una regla versionada, no en un prompt.', 'Every clinical judgement lives in a versioned rule, not in a prompt.')}
        </p>
      </div>
      <Banner title={t('Interruptor por regla', 'Per-rule kill switch')}>
        {t(
          'Desactivar una regla la retira de todas las revisiones al momento, sin publicar una versión nueva. Queda registrado en la traza.',
          'Switching a rule off removes it from every review immediately, without a release. It is recorded in the trace.',
        )}
      </Banner>

      {queue.length > 0 && (
        <Card>
          <div className="px-6 pt-5 pb-2 text-[17px] font-medium">
            {t('Cola de revisión clínica', 'Clinical review queue')} ({queue.length})
          </div>
          <ul className="divide-y divide-line px-6 pb-4 text-sm">
            {queue.map((q) => (
              <li key={q.at} className="flex justify-between gap-4 py-2">
                <span>
                  <span className="font-medium">{q.title}</span> · {reasonLabel(q.reason, lang)}
                  {q.note && <span className="text-ink-2"> · {q.note}</span>}
                </span>
                <span className="text-xs text-ink-3">
                  {new Date(q.at).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'es-ES')} ·{' '}
                  {t('revisar en 5 días laborables', 'review within 5 working days')}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs text-ink-2">
            <tr>
              <th className="px-5 py-3 font-medium">ID</th>
              <th className="px-3 py-3 font-medium">{t('Tipo', 'Type')}</th>
              <th className="px-3 py-3 font-medium">{t('Regla', 'Rule')}</th>
              <th className="px-3 py-3 font-medium">{t('Gravedad', 'Severity')}</th>
              <th className="px-3 py-3 font-medium">{t('Requiere', 'Requires')}</th>
              <th className="px-3 py-3 font-medium">{t('Fuente', 'Source')}</th>
              <th className="px-3 py-3 font-medium">{t('Versión', 'Version')}</th>
              <th className="px-5 py-3 font-medium">{t('Estado', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {RULES.map((r) => {
              const on = !disabledRules.has(r.id);
              const req =
                typeof r.requires === 'function'
                  ? t('Según fármacos', 'Depends on drugs')
                  : r.requires.join(', ') || t('Nada', 'Nothing');
              return (
                <tr key={r.id} className={`border-b border-line last:border-0 ${on ? '' : 'bg-canvas text-ink-3'}`}>
                  <td className="px-5 py-3 font-medium">{r.id}</td>
                  <td className="px-3 py-3"><Chip>{TYPE_LABEL[lang][r.type]}</Chip></td>
                  <td className="px-3 py-3">{r.summary[lang]}</td>
                  <td className="px-3 py-3"><SeverityChip severity={r.severity} /></td>
                  <td className="px-3 py-3 text-xs text-ink-2">{req}</td>
                  <td className="px-3 py-3 text-xs text-ink-2">{SOURCES[r.sourceId].document[lang]}</td>
                  <td className="px-3 py-3 text-xs">v{r.version}</td>
                  <td className="px-5 py-3">
                    <label className="flex cursor-pointer items-center gap-2" data-tour="rule-switch">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={on}
                        onChange={() => toggleRule(r.id)}
                        className="peer sr-only"
                        aria-label={`${t('Regla', 'Rule')} ${r.id}`}
                      />
                      <span className="relative h-6 w-10 rounded-full bg-line-strong transition-colors peer-checked:bg-brand-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
                      <span className="text-xs">{on ? t('Activa', 'On') : t('Desactivada', 'Off')}</span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
