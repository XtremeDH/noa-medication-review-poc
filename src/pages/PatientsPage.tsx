import { ChevronRight } from 'lucide-react';
import { PATIENTS } from '../data/patients';
import { runReview } from '../domain/engine';
import { prepareMedications, resolveMedications } from '../domain/extraction';
import { useLang } from '../i18n';
import { useStore } from '../store';
import { Card, Chip } from '../ui/ui';

export function PatientsPage() {
  const { go, resolutions, disabledRules } = useStore();
  const { t, d } = useLang();
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-5">
        <h1 className="text-[22px] font-medium">{t('Consultas de hoy', "Today's visits")}</h1>
        <p className="mt-1 text-sm text-ink-2">
          {t('8 de noviembre de 2026 · Pacientes sintéticos del POC', '8 November 2026 · Synthetic POC patients')}
        </p>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs text-ink-2">
            <tr>
              <th className="px-5 py-3 font-medium">{t('Paciente', 'Patient')}</th>
              <th className="px-5 py-3 font-medium">{t('Edad · sexo', 'Age · sex')}</th>
              <th className="px-5 py-3 font-medium">{t('Motivo', 'Reason')}</th>
              <th className="px-5 py-3 font-medium">{t('Aseguradora', 'Insurer')}</th>
              <th className="px-5 py-3 font-medium">{t('Medicamentos', 'Medicines')}</th>
              <th className="px-5 py-3 font-medium">{t('Revisión', 'Review')}</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {PATIENTS.map((p) => {
              const prep = prepareMedications(p);
              const { active, pending } = resolveMedications(prep.entries, resolutions[p.id] ?? {});
              const r = runReview(p, active, {
                disabledRules,
                pendingCount: pending.length,
                pendingRegular: pending.filter((e) => e.reported?.regular).length,
              });
              const majors = r.findings.filter((f) => f.severity === 'major').length;
              return (
                <tr
                  key={p.id}
                  data-tour={p.id === 'p1' ? 'patient-row' : undefined}
                  onClick={() => go({ name: 'patient', id: p.id })}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas"
                >
                  <td className="px-5 py-4">
                    <button type="button" className="cursor-pointer text-left font-medium text-ink hover:underline">
                      {p.name}
                    </button>
                    <div className="text-xs text-ink-3">{p.recordId}</div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {p.age} · {p.sex === 'F' ? t('Mujer', 'Female') : t('Hombre', 'Male')}
                  </td>
                  <td className="px-5 py-4 text-ink-2">{d(p.reason)}</td>
                  <td className="px-5 py-4 text-ink-2">{p.insurer}</td>
                  <td className="px-5 py-4">{prep.entries.length}</td>
                  <td className="px-5 py-4">
                    {r.scope.status === 'out_of_scope' && <Chip>{t('Fuera de alcance', 'Out of scope')}</Chip>}
                    {r.scope.status === 'waiting' && (
                      <Chip tone="moderate">{t(`${pending.length} por confirmar`, `${pending.length} to confirm`)}</Chip>
                    )}
                    {r.scope.status === 'pass' &&
                      (majors ? (
                        <Chip tone="major">{t(`${majors} mayores`, `${majors} major`)}</Chip>
                      ) : (
                        <Chip tone="brand">{t('Sin hallazgos mayores', 'No major findings')}</Chip>
                      ))}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ChevronRight aria-hidden className="inline size-4 text-ink-3" />
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
