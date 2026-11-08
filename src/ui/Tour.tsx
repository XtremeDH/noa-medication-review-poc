import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLang } from '../i18n';
import { useStore, type View } from '../store';
import { Button } from './ui';

interface Step {
  /** Matches a `data-tour` attribute; the first match is highlighted. Omit for a centred card. */
  target?: string;
  view: View;
  review?: string;
  es: [title: string, body: string];
  en: [title: string, body: string];
}

const PATIENTS: View = { name: 'patients' };
const CARMEN: View = { name: 'patient', id: 'p1' };
const ANTONIO: View = { name: 'patient', id: 'p2' };
const MERCEDES: View = { name: 'patient', id: 'p3' };

const STEPS: Step[] = [
  {
    view: PATIENTS,
    es: ['Guía rápida de Noa', 'En 2 minutos verá dónde pulsar y qué hace cada parte, desde la consulta hasta la revisión de medicación. Use Siguiente o las flechas del teclado; Esc para salir.'],
    en: ['Noa quick guide', "In 2 minutes you'll see where to click and what each part does, from the consultation to the medication review. Use Next or the arrow keys; Esc to exit."],
  },
  {
    target: 'patient-row', view: PATIENTS,
    es: ['Consultas de hoy', 'Cada fila es un paciente con consulta hoy. La columna Revisión resume el estado: medicamentos por confirmar, hallazgos mayores o fuera de alcance. Pulse un paciente para abrirlo.'],
    en: ["Today's visits", 'Each row is a patient seen today. The Review column sums up the status: medicines to confirm, major findings, or out of scope. Click a patient to open them.'],
  },
  {
    target: 'nav', view: PATIENTS,
    es: ['Menú', 'Pacientes: consultas y revisiones. Reglas clínicas: las 25 reglas y su interruptor. Evaluación: las pruebas que deciden si una versión se publica. Auditoría: la traza de cada revisión.'],
    en: ['Menu', 'Patients: visits and reviews. Clinical rules: the 25 rules and their on/off switch. Evaluation: the tests that decide whether a version ships. Audit: the trace of every review.'],
  },
  {
    target: 'lang', view: PATIENTS,
    es: ['Idioma', 'Cambie entre español e inglés en cualquier momento. En inglés, la consulta (grabada en español) se muestra traducida, con el original a un clic.'],
    en: ['Language', 'Switch between Spanish and English at any time. In English, the consultation (recorded in Spanish) is shown translated, with the original one click away.'],
  },
  {
    target: 'med-card', view: CARMEN,
    es: ['Medicación reconciliada', 'Une la historia clínica, la lista que trae el paciente y lo que dijo en consulta. Cada fila indica su origen; lo que solo dice el paciente aparece como Referido en consulta.'],
    en: ['Reconciled medication', 'Combines the clinical record, the list the patient brings and what they said in the visit. Each row shows its source; anything only the patient mentions is marked Reported in consultation.'],
  },
  {
    target: 'med-issue', view: CARMEN,
    es: ['Confirme lo dudoso', 'Si la IA no está segura (confianza baja) o hay un conflicto con la historia, la fila queda en ámbar. Elija una opción, por ejemplo Confirmar o Usar historia. Hasta entonces las reglas no se ejecutan.'],
    en: ['Confirm anything uncertain', "If the AI is unsure (low confidence) or the record disagrees, the row turns amber. Pick an option, for example Confirm or Use record. Until then the rules don't run."],
  },
  {
    target: 'dropped', view: CARMEN,
    es: ['Verificación de evidencia', 'Cada medicamento extraído debe citar una frase literal de la consulta. Si la frase no existe, se descarta y se registra como alucinación: nunca llega a las reglas.'],
    en: ['Evidence check', "Every extracted medicine must quote a sentence word for word from the consultation. If the sentence doesn't exist, the item is dropped and logged as a hallucination: it never reaches the rules."],
  },
  {
    target: 'transcript', view: CARMEN,
    es: ['Consulta (Noa Notes)', 'La transcripción de la visita. Las frases resaltadas son la evidencia de cada medicamento extraído.'],
    en: ['Consultation (Noa Notes)', 'The visit transcript. Highlighted sentences are the evidence behind each extracted medicine.'],
  },
  {
    target: 'clinical', view: CARMEN,
    es: ['Datos clínicos', 'El FGe y el aclaramiento se calculan, no se extraen. Las analíticas antiguas aparecen en ámbar con su antigüedad, porque algunas reglas necesitan datos recientes.'],
    en: ['Clinical data', 'eGFR and creatinine clearance are calculated, not extracted. Old labs show in amber with their age, because some rules need recent values.'],
  },
  {
    target: 'review-btn', view: CARMEN,
    es: ['Revisar medicación', 'Pulse aquí para abrir la revisión. El contador indica cuántos medicamentos faltan por confirmar.'],
    en: ['Review medication', 'Click here to open the review. The counter shows how many medicines still need confirming.'],
  },
  {
    target: 'vitals', view: CARMEN, review: 'p1',
    es: ['Valores clave', 'FGe, aclaramiento, potasio y peso, cada uno con su fecha. Si un valor es antiguo, se marca en ámbar.'],
    en: ['Key values', 'eGFR, creatinine clearance, potassium and weight, each with its date. Old values are marked in amber.'],
  },
  {
    target: 'banner', view: CARMEN, review: 'p1',
    es: ['Solo apoyo a la decisión', 'Noa informa; usted decide. Las reglas deciden qué se muestra y la IA solo extrae la medicación. Pulse Mostrar más para el detalle.'],
    en: ['Decision support only', 'Noa informs; you decide. Rules decide what is shown and the AI only extracts the medication. Click Show more for details.'],
  },
  {
    target: 'confirm', view: CARMEN, review: 'p1',
    es: ['Primero, confirmar', 'Con medicamentos pendientes, la revisión espera. Confírmelos aquí mismo y los hallazgos aparecen al instante.'],
    en: ['Confirm first', 'While medicines are pending, the review waits. Confirm them right here and the findings appear immediately.'],
  },
  {
    target: 'finding', view: MERCEDES, review: 'p3',
    es: ['Tarjeta de hallazgo', 'Ahora una paciente con la lista ya confirmada. Cada tarjeta muestra la gravedad (Mayor en rojo), el tipo y el motivo. Actuar hoy aparece con un valor urgente, como potasio por encima de 5,5. Se muestran 5 primero y el resto con Mostrar más.'],
    en: ['Finding card', 'Now a patient whose list is already confirmed. Each card shows severity (Major in red), type and reason. Act today appears for urgent values, such as potassium above 5.5. The first 5 are shown; the rest via Show more.'],
  },
  {
    target: 'finding-source', view: MERCEDES, review: 'p3',
    es: ['Fuente', 'Abre la fuente fijada de la regla: los criterios (esperado y encontrado) y el pasaje resaltado de la ficha técnica o de STOPP/START.'],
    en: ['Source', "Opens the rule's pinned source: the criteria (expected and found) and the highlighted passage from the SmPC or STOPP/START."],
  },
  {
    target: 'finding-info', view: MERCEDES, review: 'p3',
    es: ['Datos usados', 'Muestra cada dato que usó la regla, con su origen, su fecha y, si viene de la consulta, la frase literal.'],
    en: ['Data used', 'Shows every value the rule used, with its source, date and, if it came from the consultation, the exact sentence.'],
  },
  {
    target: 'finding-actions', view: MERCEDES, review: 'p3',
    es: ['Aceptar, modificar o descartar', 'Aceptar registra su acuerdo. Modificar pide una nota con lo que cambió. Descartar exige un motivo; Datos incorrectos y Regla incorrecta van a la cola de revisión clínica. Un descarte se mantiene hasta que cambie algún dato.'],
    en: ['Accept, modify or dismiss', 'Accept records your agreement. Modify asks for a note on what you changed. Dismiss needs a reason; Data wrong and Rule wrong go to the clinical review queue. A dismissal holds until an input changes.'],
  },
  {
    target: 'finding-missing', view: ANTONIO, review: 'p2',
    es: ['Faltan datos', 'Si una regla necesita un dato que falta o es antiguo, no se ejecuta y aparece esta tarjeta. Cree un borrador de analítica (usted la envía) o pida al paciente que suba resultados en Doctoralia.'],
    en: ['Missing data', 'If a rule needs a value that is missing or too old, it does not run and this card appears instead. Create a draft lab order (you send it) or ask the patient to upload results in Doctoralia.'],
  },
  {
    target: 'finish', view: ANTONIO, review: 'p2',
    es: ['Finalizar revisión', 'Se activa cuando ha actuado sobre todos los hallazgos mayores. Todo queda registrado en la traza.'],
    en: ['Finish review', 'Turns on once you have acted on every major finding. Everything is recorded in the trace.'],
  },
  {
    target: 'rule-switch', view: { name: 'rules' },
    es: ['Interruptor por regla', 'Desactive una regla y deja de aplicarse en todas las revisiones al momento, sin publicar una versión nueva.'],
    en: ['Per-rule switch', 'Switch a rule off and it stops applying to every review immediately, without a new release.'],
  },
  {
    target: 'eval-run', view: { name: 'eval' },
    es: ['Evaluación', 'Ejecuta el conjunto congelado de casos. Una versión solo se publica si no se omite ningún hallazgo mayor.'],
    en: ['Evaluation', 'Runs the frozen set of test cases. A version only ships if no major finding is missed.'],
  },
  {
    target: 'audit', view: { name: 'audit' },
    es: ['Auditoría', 'Cada revisión deja una traza: versiones, etapas, ruta y cada acción del médico, con el paciente seudonimizado.'],
    en: ['Audit', 'Every review leaves a trace: versions, stages, route and every doctor action, with the patient pseudonymised.'],
  },
  {
    target: 'arch', view: { name: 'architecture' },
    es: ['Arquitectura IA', 'El mapa del sistema: pulse cualquier caja del diagrama para ver qué hace, sus prompts, sus puertas, qué se monitoriza y qué experimentos A/B lo mejoran. Las pestañas detallan prompts, puertas, monitorización y pruebas A/B.'],
    en: ['AI architecture', 'The system map: click any box in the diagram to see what it does, its prompts, its gates, what is monitored and which A/B experiments improve it. The tabs detail prompts, gates, monitoring and A/B tests.'],
  },
  {
    target: 'help', view: PATIENTS,
    es: ['Volver a ver la guía', 'Pulse este botón, o Manual de uso en el menú, cuando quiera repetir la guía.'],
    en: ['See the guide again', 'Click this button, or User guide in the menu, whenever you want to replay the guide.'],
  },
];

const SEEN_KEY = 'noa.tourSeen';
const W = 360;
const GAP = 12;
const PAD = 6;

interface Box { top: number; left: number; width: number; height: number }

const sameView = (a: View, b: View) => a.name === b.name && (a.name !== 'patient' || (b.name === 'patient' && a.id === b.id));

function place(r: Box | null, h: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x = (v: number) => Math.min(Math.max(16, v), vw - W - 16);
  const y = (v: number) => Math.min(Math.max(16, v), vh - h - 16);
  if (!r) return { left: (vw - W) / 2, top: Math.max(16, (vh - h) / 2) };
  const bottom = r.top + r.height;
  const right = r.left + r.width;
  if (bottom + GAP + h < vh - 8) return { left: x(r.left), top: bottom + GAP };
  if (r.top - GAP - h > 8) return { left: x(r.left), top: r.top - GAP - h };
  if (right + GAP + W < vw - 8) return { left: right + GAP, top: y(r.top) };
  if (r.left - GAP - W > 8) return { left: r.left - GAP - W, top: y(r.top) };
  return { left: x(vw - W - 16), top: y(vh - h - 16) };
}

export function Tour() {
  const { tour, setTour, view, go, setReview } = useStore();
  const { lang, t } = useLang();
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [ready, setReady] = useState(false);
  const [h, setH] = useState(220);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) setTour(true);
  }, [setTour]);

  useEffect(() => {
    if (tour) setI(0);
  }, [tour]);

  // Each step declares the screen it needs, so Back and Next both land in the right state.
  useEffect(() => {
    if (!tour) return;
    if (!sameView(view, step.view)) go(step.view);
    setReview(step.review ?? null);
  }, [tour, i]);

  useEffect(() => {
    if (!tour) return;
    setReady(false);
    setBox(null);
    const started = performance.now();
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scrolled = false;
    let raf = 0;
    const tick = () => {
      const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      if (el) {
        if (!scrolled) {
          const tall = el.getBoundingClientRect().height > window.innerHeight * 0.6;
          el.scrollIntoView({ block: tall ? 'start' : 'center', behavior: smooth ? 'smooth' : 'auto' });
          scrolled = true;
        }
        const r = el.getBoundingClientRect();
        const top = Math.max(r.top, 0);
        const bottom = Math.min(r.bottom, window.innerHeight);
        setBox((b) =>
          b && b.top === top && b.left === r.left && b.width === r.width && b.height === bottom - top
            ? b
            : { top, left: r.left, width: r.width, height: Math.max(0, bottom - top) },
        );
        setReady(true);
      } else if (!step.target || performance.now() - started > 1200) {
        setBox(null);
        setReady(true);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tour, i, step.target]);

  useLayoutEffect(() => {
    if (cardRef.current) setH(cardRef.current.offsetHeight);
  });

  useEffect(() => {
    if (tour && ready) nextRef.current?.focus();
  }, [tour, ready, i]);

  const close = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setReview(null);
    setTour(false);
  };
  const next = () => (last ? close() : setI((v) => v + 1));
  const back = () => setI((v) => Math.max(0, v - 1));

  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  if (!tour) return null;
  const [title, body] = step[lang];
  const pos = place(box, h);

  return (
    <div className="fixed inset-0 z-[70]" aria-hidden={!ready}>
      {/* Blocks clicks on the app while the guide is open. */}
      <div className={`absolute inset-0 ${box ? '' : 'bg-ink/55'}`} />
      {box && (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-brand-500 transition-all duration-200"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(31, 35, 40, 0.55)',
          }}
        />
      )}
      {ready && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          className="animate-slide-in absolute rounded-lg bg-white p-5 shadow-2xl"
          style={{ width: W, top: pos.top, left: pos.left }}
        >
          <div className="flex items-center justify-between text-xs text-ink-3">
            <span className="font-medium text-brand-800">{t('Guía', 'Guide')}</span>
            <span aria-live="polite">
              {i + 1} / {STEPS.length}
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-tint">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
          </div>
          <h2 id="tour-title" className="mt-3 text-base font-medium text-ink">{title}</h2>
          <p id="tour-body" className="mt-1.5 text-sm leading-6 text-ink-2">{body}</p>
          {step.target && !box && (
            <p className="mt-2 text-xs text-ink-3">
              {t('Este elemento no está visible ahora (por ejemplo, ya lo ha confirmado).', "This element isn't visible right now (for example, you already confirmed it).")}
            </p>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={close} className="h-10 cursor-pointer px-1 text-sm text-ink-2 underline hover:text-ink">
              {t('Salir de la guía', 'Skip guide')}
            </button>
            <div className="ml-auto flex gap-2">
              {i > 0 && (
                <Button size="sm" onClick={back}>
                  {t('Atrás', 'Back')}
                </Button>
              )}
              <Button ref={nextRef} size="sm" variant="primary" onClick={next}>
                {i === 0 ? t('Empezar', 'Start') : last ? t('Terminar', 'Finish') : t('Siguiente', 'Next')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
