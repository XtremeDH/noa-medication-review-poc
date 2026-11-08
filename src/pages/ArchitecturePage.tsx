import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowRight, Bot, RotateCcw } from 'lucide-react';
import {
  AB_METHOD_LABEL, AB_PRINCIPLES, AB_TESTS, ALL_NODES, DASHBOARDS, DRIFT, GATE_KIND_LABEL, GATES, KIND_LABEL, OPS_ROW,
  PIPELINE, PLATFORM_ROW, PROMPTS, SOURCES_ROW, TRACE_FIELDS, type AbMethod, type ArchNode, type NodeKind,
} from '../data/architecture';
import { useLang } from '../i18n';
import { Banner, Card, Chip, type Tone } from '../ui/ui';

type Tab = 'diagram' | 'prompts' | 'gates' | 'monitoring' | 'ab';

const KIND_STYLE: Record<NodeKind, string> = {
  llm: 'border-judge/40 bg-judge-bg',
  code: 'border-brand-200 bg-brand-50',
  gate: 'border-moderate/40 bg-moderate-bg',
  human: 'border-sky-300 bg-sky-50',
  external: 'border-line-strong bg-tint',
  ops: 'border-slate-300 bg-slate-50',
};

const KIND_TEXT: Record<NodeKind, string> = {
  llm: 'text-judge',
  code: 'text-brand-800',
  gate: 'text-moderate',
  human: 'text-sky-800',
  external: 'text-ink-2',
  ops: 'text-slate-700',
};

const GATE_TONE: Record<string, Tone> = { hard: 'major', human: 'brand', fallback: 'moderate', release: 'judge' };
const METHOD_TONE: Record<AbMethod, Tone> = { offline: 'neutral', shadow: 'judge', online: 'brand', stepped: 'moderate' };

export function ArchitecturePage() {
  const { lang, t } = useLang();
  const [tab, setTab] = useState<Tab>('diagram');
  const [nodeId, setNodeId] = useState('extract');
  const [focus, setFocus] = useState<string | null>(null);

  const jump = (to: Tab, id: string) => {
    setFocus(id);
    setTab(to);
    requestAnimationFrame(() => document.getElementById(`arch-${id}`)?.scrollIntoView({ block: 'center' }));
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'diagram', label: t('Diagrama', 'Diagram') },
    { id: 'prompts', label: t(`Prompts (${PROMPTS.length})`, `Prompts (${PROMPTS.length})`) },
    { id: 'gates', label: t(`Puertas (${GATES.length})`, `Gates (${GATES.length})`) },
    { id: 'monitoring', label: t('Monitorización', 'Monitoring') },
    { id: 'ab', label: t(`Pruebas A/B (${AB_TESTS.length})`, `A/B tests (${AB_TESTS.length})`) },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6" data-tour="arch">
      <div>
        <h1 className="text-[22px] font-medium">{t('Arquitectura del sistema de IA', 'AI system architecture')}</h1>
        <p className="mt-1 text-sm text-ink-2">
          {t(
            'Cómo se integra la IA en Noa: qué hace cada componente, qué prompts usa, qué puertas lo protegen, cómo se monitoriza y qué experimentos mejoran la calidad.',
            'How the AI fits into Noa: what each component does, which prompts it uses, which gates protect it, how it is monitored and which experiments improve quality.',
          )}
        </p>
      </div>

      <div role="tablist" aria-label={t('Secciones', 'Sections')} className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            type="button"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`-mb-px h-10 cursor-pointer border-b-2 px-4 text-sm font-medium transition-colors ${
              tab === x.id ? 'border-brand-700 text-brand-800' : 'border-transparent text-ink-2 hover:text-ink'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'diagram' && <Diagram nodeId={nodeId} setNodeId={setNodeId} jump={jump} />}
      {tab === 'prompts' && <Prompts focus={focus} />}
      {tab === 'gates' && <Gates focus={focus} />}
      {tab === 'monitoring' && <Monitoring />}
      {tab === 'ab' && <AbTests focus={focus} />}

      <p className="text-xs text-ink-3">
        {lang === 'en'
          ? 'Based on the system design document. The patient-list prompt and the A/B plan are proposals.'
          : 'Basado en el documento de diseño. El prompt de lista del paciente y el plan A/B son propuestas.'}
      </p>
    </div>
  );
}

function Diagram({ nodeId, setNodeId, jump }: { nodeId: string; setNodeId: (id: string) => void; jump: (to: Tab, id: string) => void }) {
  const { t } = useLang();
  const node = ALL_NODES.find((n) => n.id === nodeId)!;
  const Node = ({ n }: { n: ArchNode }) => <NodeBox n={n} selected={n.id === nodeId} onSelect={() => setNodeId(n.id)} />;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Legend />
        <Banner title={t('Límite del agente', 'Agent boundary')} icon={<Bot aria-hidden className="size-5 text-judge" />}>
          {t(
            'Es un flujo fijo, no un agente autónomo: el orquestador (código) llama a las herramientas en orden. El LLM solo interviene en los pasos 1 y 6, nunca elige herramientas, reglas, gravedad ni orden, y todo lo que produce pasa por puertas deterministas.',
            'This is a fixed workflow, not an autonomous agent: the orchestrator (code) calls the tools in order. The LLM only acts in steps 1 and 6, never chooses tools, rules, severity or order, and everything it produces goes through deterministic gates.',
          )}
        </Banner>

        <Lane title={t('Fuentes e integraciones', 'Sources and integrations')}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {SOURCES_ROW.map((n) => <Node key={n.id} n={n} />)}
          </div>
        </Lane>
        <Connector label={t('Datos estructurados, cada campo con fecha y origen', 'Structured data, every field with date and source')} />

        <Lane title={t('Flujo de revisión (por consulta)', 'Review pipeline (per consultation)')}>
          <div className="flex flex-wrap items-stretch gap-2">
            {PIPELINE.map((n, i) => (
              <div key={n.id} className="flex items-stretch gap-2">
                <div className="min-h-[84px] w-[150px]"><Node n={n} /></div>
                {i < PIPELINE.length - 1 && <ArrowRight aria-hidden className="size-4 shrink-0 self-center text-ink-3" />}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-md border border-dashed border-line-strong px-3 py-2 text-xs text-ink-2">
            <RotateCcw aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
            {t(
              'Bucle de mejora: acciones del médico y fallos de puertas → cola de revisión clínica → nuevos casos de evaluación → puerta de publicación → nueva versión de regla, prompt o modelo (primero en sombra).',
              'Improvement loop: doctor actions and gate failures → clinical review queue → new eval cases → release gate → new rule, prompt or model version (shadow first).',
            )}
          </div>
        </Lane>
        <Connector label={t('Herramientas y servicios usados por el orquestador', 'Tools and services used by the orchestrator')} />

        <Lane title={t('Plataforma', 'Platform')}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {PLATFORM_ROW.map((n) => <Node key={n.id} n={n} />)}
          </div>
        </Lane>
        <Connector label={t('Cada paso escribe en la traza', 'Every step writes to the trace')} />

        <Lane title={t('Operación y mejora continua', 'Operations and continuous improvement')}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {OPS_ROW.map((n) => <Node key={n.id} n={n} />)}
          </div>
        </Lane>
      </div>

      <Detail node={node} jump={jump} />
    </div>
  );
}

function Legend() {
  const { lang } = useLang();
  return (
    <div className="flex flex-wrap gap-3 text-xs" aria-label="Legend">
      {(Object.keys(KIND_LABEL) as NodeKind[]).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className={`size-3 rounded-sm border ${KIND_STYLE[k]}`} />
          {KIND_LABEL[k][lang]}
        </span>
      ))}
    </div>
  );
}

function Lane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h2 className="mb-3 text-xs font-medium tracking-wide text-ink-3 uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-ink-3">
      <ArrowDown aria-hidden className="size-4" />
      {label}
    </div>
  );
}

function NodeBox({ n, selected, onSelect }: { n: ArchNode; selected: boolean; onSelect: () => void }) {
  const { lang } = useLang();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex h-full w-full cursor-pointer flex-col gap-1 rounded-lg border p-3 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${KIND_STYLE[n.kind]} ${
        selected ? 'ring-2 ring-brand-600' : ''
      }`}
    >
      <span className={`flex items-center gap-1.5 text-[11px] font-medium ${KIND_TEXT[n.kind]}`}>
        {n.step && <span className="flex size-4 items-center justify-center rounded-full bg-white text-[10px] ring-1 ring-current">{n.step}</span>}
        {KIND_LABEL[n.kind][lang]}
      </span>
      <span className="text-[13px] leading-5 font-medium text-ink">{n.title[lang]}</span>
    </button>
  );
}

function Detail({ node, jump }: { node: ArchNode; jump: (to: Tab, id: string) => void }) {
  const { lang, t } = useLang();
  const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
      <h3 className="text-xs font-medium text-ink-3">{label}</h3>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </div>
  );
  const link = 'cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-brand-600';
  return (
    <Card className="h-fit space-y-4 p-5 xl:sticky xl:top-4">
      <div>
        <span className={`text-xs font-medium ${KIND_TEXT[node.kind]}`}>
          {node.step ? `${t('Paso', 'Step')} ${node.step} · ` : ''}
          {KIND_LABEL[node.kind][lang]}
        </span>
        <h2 className="mt-1 text-lg font-medium">{node.title[lang]}</h2>
        <p className="mt-1 text-sm leading-6 text-ink-2">{node.summary[lang]}</p>
      </div>
      {node.inputs && <Row label={t('Entradas', 'Inputs')}>{node.inputs[lang]}</Row>}
      {node.outputs && <Row label={t('Salidas', 'Outputs')}>{node.outputs[lang]}</Row>}
      {node.promptIds && (
        <Row label={t('Prompts', 'Prompts')}>
          <div className="flex flex-wrap gap-1.5">
            {node.promptIds.map((id) => (
              <button key={id} type="button" className={link} onClick={() => jump('prompts', id)}>
                <Chip tone="judge">{PROMPTS.find((p) => p.id === id)!.version}</Chip>
              </button>
            ))}
          </div>
        </Row>
      )}
      {node.gateIds && (
        <Row label={t('Puertas', 'Gates')}>
          <div className="flex flex-wrap gap-1.5">
            {node.gateIds.map((id) => {
              const g = GATES.find((x) => x.id === id)!;
              return (
                <button key={id} type="button" className={link} onClick={() => jump('gates', id)} title={g.condition[lang]}>
                  <Chip tone={GATE_TONE[g.kind]}>{id} · {g.name[lang]}</Chip>
                </button>
              );
            })}
          </div>
        </Row>
      )}
      {node.metrics && (
        <Row label={t('Se monitoriza', 'Monitored')}>
          <ul className="list-disc space-y-0.5 pl-5">{node.metrics.map((m) => <li key={m.en}>{m[lang]}</li>)}</ul>
        </Row>
      )}
      {node.failure && <Row label={t('Si falla', 'On failure')}>{node.failure[lang]}</Row>}
      {node.abIds && (
        <Row label={t('Experimentos', 'Experiments')}>
          <div className="flex flex-wrap gap-1.5">
            {node.abIds.map((id) => {
              const a = AB_TESTS.find((x) => x.id === id)!;
              return (
                <button key={id} type="button" className={link} onClick={() => jump('ab', id)} title={a.question[lang]}>
                  <Chip tone={METHOD_TONE[a.method]}>{id}</Chip>
                </button>
              );
            })}
          </div>
        </Row>
      )}
    </Card>
  );
}

function Prompts({ focus }: { focus: string | null }) {
  const { lang, t } = useLang();
  return (
    <div className="space-y-4">
      <Banner title={t('Gestión de prompts', 'Prompt management')}>
        {t(
          'Cada prompt es un archivo versionado; un cambio es un pull request revisado por el responsable clínico y un ingeniero, y ejecuta el conjunto de evaluación completo. Solo variables con nombre, nunca concatenar datos del paciente en las instrucciones. La versión anterior sigue desplegable con un flag del router. El orquestador, el router, las reglas y el ranking no usan prompts: son código.',
          'Each prompt is a versioned file; a change is a pull request reviewed by the clinical lead and an engineer, and runs the full eval set. Named variables only, never patient data concatenated into instructions. The previous version stays deployable via a router flag. The orchestrator, router, rules and ranking use no prompts: they are code.',
        )}
      </Banner>
      {PROMPTS.map((p) => (
        <Card key={p.id} className={`p-5 ${focus === p.id ? 'ring-2 ring-brand-600' : ''}`}>
          <div id={`arch-${p.id}`} className="flex flex-wrap items-center gap-2">
            <h2 className="text-[16px] font-medium">{p.name[lang]}</h2>
            <Chip tone="judge">{p.version}</Chip>
            <Chip tone={p.status === 'design' ? 'brand' : 'moderate'}>
              {p.status === 'design' ? t('En el diseño', 'In design doc') : t('Propuesto', 'Proposed')}
            </Chip>
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <Meta k={t('Etapa', 'Stage')} v={p.stage[lang]} />
            <Meta k={t('Modelo', 'Model')} v={p.model[lang]} />
            <Meta k={t('Ajustes', 'Settings')} v={p.settings} />
            <Meta k={t('Variables', 'Variables')} v={p.vars.join(' ')} />
            <Meta k={t('Salida', 'Output')} v={p.output[lang]} />
          </dl>
          <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-ink p-4 font-mono text-[12px] leading-5 whitespace-pre-wrap text-white">{p.text}</pre>
        </Card>
      ))}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-ink-3">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Gates({ focus }: { focus: string | null }) {
  const { lang, t } = useLang();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(GATE_KIND_LABEL).map(([k, v]) => (
          <Chip key={k} tone={GATE_TONE[k]}>{v[lang]}</Chip>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs text-ink-2">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-3 py-3 font-medium">{t('Etapa', 'Stage')}</th>
              <th className="px-3 py-3 font-medium">{t('Puerta', 'Gate')}</th>
              <th className="px-3 py-3 font-medium">{t('Tipo', 'Type')}</th>
              <th className="px-3 py-3 font-medium">{t('Pasa si', 'Passes if')}</th>
              <th className="px-3 py-3 font-medium">{t('Si falla', 'On failure')}</th>
              <th className="px-4 py-3 font-medium">{t('Métrica', 'Metric')}</th>
            </tr>
          </thead>
          <tbody>
            {GATES.map((g) => (
              <tr key={g.id} id={`arch-${g.id}`} className={`border-b border-line align-top last:border-0 ${focus === g.id ? 'bg-brand-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{g.id}</td>
                <td className="px-3 py-3 text-ink-2">{g.stage[lang]}</td>
                <td className="px-3 py-3 font-medium">{g.name[lang]}</td>
                <td className="px-3 py-3"><Chip tone={GATE_TONE[g.kind]}>{GATE_KIND_LABEL[g.kind][lang]}</Chip></td>
                <td className="px-3 py-3">{g.condition[lang]}</td>
                <td className="px-3 py-3 text-ink-2">{g.onFail[lang]}</td>
                <td className="px-4 py-3 text-xs text-ink-2">{g.metric[lang]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Monitoring() {
  const { lang, t } = useLang();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {DASHBOARDS.map((d) => (
          <Card key={d.name.en} className="p-5">
            <div className="text-xs text-ink-3">{d.question[lang]}</div>
            <h2 className="mt-0.5 text-[16px] font-medium">{d.name[lang]}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{d.metrics.map((m) => <li key={m.en}>{m[lang]}</li>)}</ul>
            <div className="mt-3 rounded-md bg-major-bg px-3 py-2 text-xs text-major">
              <span className="font-medium">{t('Alerta', 'Alert')}: </span>
              {d.alert[lang]}
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-[16px] font-medium">{t('Traza por revisión', 'Trace per review')}</h2>
          <p className="mt-1 text-sm text-ink-2">{t('OpenTelemetry, un span por etapa. Cualquier traza se puede repetir con la versión actual o una pasada.', 'OpenTelemetry, one span per stage. Any trace can be replayed against the current or a past version.')}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{TRACE_FIELDS.map((f) => <li key={f.en}>{f[lang]}</li>)}</ul>
        </Card>
        <Card className="p-5">
          <h2 className="text-[16px] font-medium">{t('Deriva y evaluación online', 'Drift and online evaluation')}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{DRIFT.map((f) => <li key={f.en}>{f[lang]}</li>)}</ul>
        </Card>
        <Card className="p-5">
          <h2 className="text-[16px] font-medium">{t('Incidentes y revisión semanal', 'Incidents and weekly review')}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>{t('Un incidente de seguridad confirmado se convierte en caso congelado antes de publicar el arreglo.', 'A confirmed safety incident becomes a frozen eval case before the fix ships.')}</li>
            <li>{t('Revisión semanal: descartes por regla, mayores con acción, alertas por paciente, vuelta al mensaje fijo.', 'Weekly review: dismissals per rule, majors acted on, alerts per patient, fixed-message fallback.')}</li>
            <li>{t('"Datos/regla incorrecta" revisados en 5 días laborables.', '"Data/rule wrong" reviewed within 5 working days.')}</li>
            <li>{t('Interruptor por regla y por versión de modelo, activo en minutos.', 'Kill switch per rule and per model version, effective within minutes.')}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function AbTests({ focus }: { focus: string | null }) {
  const { lang, t } = useLang();
  const order: AbMethod[] = ['offline', 'shadow', 'online', 'stepped'];
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="text-[16px] font-medium">{t('Principios', 'Principles')}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{AB_PRINCIPLES.map((p) => <li key={p.en}>{p[lang]}</li>)}</ul>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {order.map((m, i) => (
            <span key={m} className="flex items-center gap-2">
              <Chip tone={METHOD_TONE[m]}>{AB_METHOD_LABEL[m][lang]}</Chip>
              {i < order.length - 1 && <ArrowRight aria-hidden className="size-4 text-ink-3" />}
            </span>
          ))}
        </div>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs text-ink-2">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-3 py-3 font-medium">{t('Pregunta', 'Question')}</th>
              <th className="px-3 py-3 font-medium">{t('Método', 'Method')}</th>
              <th className="px-3 py-3 font-medium">{t('Brazos', 'Arms')}</th>
              <th className="px-3 py-3 font-medium">{t('Unidad', 'Unit')}</th>
              <th className="px-3 py-3 font-medium">{t('Métrica principal', 'Primary metric')}</th>
              <th className="px-3 py-3 font-medium">{t('Guardarraíles', 'Guardrails')}</th>
              <th className="px-3 py-3 font-medium">{t('Decisión', 'Decision rule')}</th>
              <th className="px-4 py-3 font-medium">{t('Duración', 'Duration')}</th>
            </tr>
          </thead>
          <tbody>
            {AB_TESTS.map((a) => (
              <tr key={a.id} id={`arch-${a.id}`} className={`border-b border-line align-top last:border-0 ${focus === a.id ? 'bg-brand-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{a.id}</td>
                <td className="px-3 py-3 font-medium">{a.question[lang]}</td>
                <td className="px-3 py-3"><Chip tone={METHOD_TONE[a.method]}>{AB_METHOD_LABEL[a.method][lang]}</Chip></td>
                <td className="px-3 py-3">{a.arms[lang]}</td>
                <td className="px-3 py-3 text-ink-2">{a.unit[lang]}</td>
                <td className="px-3 py-3">{a.primary[lang]}</td>
                <td className="px-3 py-3 text-ink-2">{a.guardrails[lang]}</td>
                <td className="px-3 py-3">{a.decision[lang]}</td>
                <td className="px-4 py-3 text-xs text-ink-2">{a.duration[lang]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
