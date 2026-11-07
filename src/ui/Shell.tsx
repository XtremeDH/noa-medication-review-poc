import type { ReactNode } from 'react';
import {
  BookOpen, Calendar, ChevronRight, CircleHelp, FlaskConical, History, LayoutGrid, ListChecks, Mic, PanelLeft, Search, Settings, Users,
} from 'lucide-react';
import type { Lang } from '../domain/lang';
import { useLang } from '../i18n';
import { useStore, type View } from '../store';

const NAV: { es: string; en: string; icon: ReactNode; view?: View['name']; guide?: boolean }[] = [
  { es: 'Panel principal', en: 'Dashboard', icon: <LayoutGrid className="size-[18px]" /> },
  { es: 'Agenda', en: 'Calendar', icon: <Calendar className="size-[18px]" /> },
  { es: 'Pacientes', en: 'Patients', icon: <Users className="size-[18px]" />, view: 'patients' },
  { es: 'Noa Notes', en: 'Noa Notes', icon: <Mic className="size-[18px]" /> },
  { es: 'Reglas clínicas', en: 'Clinical rules', icon: <ListChecks className="size-[18px]" />, view: 'rules' },
  { es: 'Evaluación', en: 'Evaluation', icon: <FlaskConical className="size-[18px]" />, view: 'eval' },
  { es: 'Auditoría', en: 'Audit', icon: <History className="size-[18px]" />, view: 'audit' },
  { es: 'Manual de uso', en: 'User guide', icon: <BookOpen className="size-[18px]" />, guide: true },
];

export function Sidebar() {
  const { view, go, setTour } = useStore();
  const { lang, t } = useLang();
  const current = view.name === 'patient' ? 'patients' : view.name;
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-sidebar">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}docplanner.svg`} alt="" className="size-7" />
          <span className="text-[26px] leading-none font-bold tracking-tight text-ink">noa</span>
        </div>
        <div className="mt-1 text-xs font-medium text-ink-2">{t('Clinic Cloud · Revisión de medicación', 'Clinic Cloud · Medication review')}</div>
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm text-ink-3">
          <Search aria-hidden className="size-4" />
          <input aria-label={t('Buscar', 'Search')} placeholder={t('Buscar', 'Search')} className="w-full bg-transparent outline-none placeholder:text-ink-3" />
        </label>
        <button type="button" aria-label={t('Ajustes', 'Settings')} title={t('Ajustes', 'Settings')} className="flex size-10 cursor-pointer items-center justify-center rounded-md border border-line bg-white text-ink-2 hover:bg-canvas">
          <Settings className="size-4" />
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 px-2" aria-label={t('Principal', 'Main')} data-tour="nav">
        {NAV.map((n) => {
          const active = n.view === current;
          const enabled = !!n.view || !!n.guide;
          return (
            <button
              key={n.es}
              type="button"
              disabled={!enabled}
              title={enabled ? undefined : t('No incluido en el POC', 'Not part of the POC')}
              onClick={() => (n.guide ? setTour(true) : n.view && go({ name: n.view } as View))}
              aria-current={active ? 'page' : undefined}
              className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors ${
                active
                  ? 'bg-brand-50 font-medium text-brand-800'
                  : enabled
                    ? 'cursor-pointer text-ink hover:bg-tint'
                    : 'cursor-default text-ink-3'
              }`}
            >
              {n.icon}
              {n[lang]}
            </button>
          );
        })}
      </nav>
      <div className="m-3 rounded-md border border-line bg-white p-3 text-xs leading-5 text-ink-2">
        <div className="font-medium text-ink">{t('Prueba de concepto', 'Proof of concept')}</div>
        {t(
          'Datos sintéticos. Reglas y fuentes ilustrativas, pendientes de revisión farmacéutica.',
          'Synthetic data. Rules and sources are illustrative and pending pharmacist review.',
        )}
      </div>
    </aside>
  );
}

function LangSwitch() {
  const { lang, setLang, t } = useLang();
  const opts: { v: Lang; label: string; name: string }[] = [
    { v: 'es', label: 'ES', name: 'Español' },
    { v: 'en', label: 'EN', name: 'English' },
  ];
  return (
    <div role="radiogroup" aria-label={t('Idioma', 'Language')} data-tour="lang" className="flex rounded-md border border-line p-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={lang === o.v}
          title={o.name}
          onClick={() => setLang(o.v)}
          className={`h-8 min-w-10 cursor-pointer rounded px-2 text-xs font-medium transition-colors ${
            lang === o.v ? 'bg-brand-700 text-white' : 'text-ink-2 hover:bg-tint'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TopBar({ crumbs }: { crumbs: { label: string; onClick?: () => void }[] }) {
  const { t } = useLang();
  const { setTour } = useStore();
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-5">
      <PanelLeft aria-hidden className="size-5 shrink-0 text-ink-2" />
      <nav aria-label={t('Ruta', 'Breadcrumb')} className="flex min-w-0 items-center gap-2 overflow-hidden text-sm whitespace-nowrap">
        {crumbs.map((c, i) => (
          <span key={c.label} className="flex items-center gap-2">
            {i > 0 && <ChevronRight aria-hidden className="size-4 text-ink-3" />}
            {c.onClick ? (
              <button type="button" onClick={c.onClick} className="cursor-pointer text-ink-2 hover:text-ink hover:underline">
                {c.label}
              </button>
            ) : (
              <span className="text-ink">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-3 text-sm text-ink-2">
        <LangSwitch />
        <button
          type="button"
          data-tour="help"
          onClick={() => setTour(true)}
          aria-label={t('Ver la guía', 'Open the guide')}
          title={t('Ver la guía', 'Open the guide')}
          className="flex size-9 cursor-pointer items-center justify-center rounded-md text-ink-2 hover:bg-tint hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          <CircleHelp className="size-5" />
        </button>
        <span className="hidden whitespace-nowrap xl:inline">{t('Dra. Lucía Ortega · Medicina interna', 'Dr Lucía Ortega · Internal medicine')}</span>
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-700 text-xs font-medium text-white">LO</span>
      </div>
    </header>
  );
}
