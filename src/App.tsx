import { CircleCheck } from 'lucide-react';
import { PATIENTS } from './data/patients';
import { useLang } from './i18n';
import { AuditPage } from './pages/AuditPage';
import { EvalPage } from './pages/EvalPage';
import { PatientPage } from './pages/PatientPage';
import { PatientsPage } from './pages/PatientsPage';
import { RulesPage } from './pages/RulesPage';
import { useStore } from './store';
import { Sidebar, TopBar } from './ui/Shell';
import { Tour } from './ui/Tour';

export function App() {
  const { view, go, toast } = useStore();
  const { t } = useLang();
  const toPatients = () => go({ name: 'patients' });

  let crumbs: { label: string; onClick?: () => void }[];
  let page;
  switch (view.name) {
    case 'patient': {
      const p = PATIENTS.find((x) => x.id === view.id)!;
      crumbs = [{ label: t('Pacientes', 'Patients'), onClick: toPatients }, { label: p.name }, { label: t('Revisión de medicación', 'Medication review') }];
      page = <PatientPage key={p.id} patient={p} />;
      break;
    }
    case 'rules':
      crumbs = [{ label: t('Reglas clínicas', 'Clinical rules') }];
      page = <RulesPage />;
      break;
    case 'eval':
      crumbs = [{ label: t('Evaluación', 'Evaluation') }];
      page = <EvalPage />;
      break;
    case 'audit':
      crumbs = [{ label: t('Auditoría', 'Audit') }];
      page = <AuditPage />;
      break;
    default:
      crumbs = [{ label: t('Pacientes', 'Patients') }, { label: t('Consultas de hoy', "Today's visits") }];
      page = <PatientsPage />;
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar crumbs={crumbs} />
        <main className="flex-1 overflow-y-auto">{page}</main>
      </div>
      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
        {toast && (
          <div className="animate-slide-in flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm text-white shadow-lg">
            <CircleCheck aria-hidden className="size-4 text-brand-200" />
            {toast}
          </div>
        )}
      </div>
      <Tour />
    </div>
  );
}
