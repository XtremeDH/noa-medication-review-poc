import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Globe, Maximize2, Minimize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { fmtDate } from '../domain/dates';
import type { Finding } from '../domain/engine';
import { RULE_BY_ID, TYPE_LABEL } from '../domain/rules';
import { SOURCES } from '../domain/sources';
import { useLang } from '../i18n';
import { Button, Chip, IconButton, SeverityChip } from '../ui/ui';

const ZOOMS = [0.9, 1, 1.15, 1.3];

/** Full-screen source view, modelled on the Docviser "Detalii din ghid" screen. */
export function SourceModal({ finding, onClose }: { finding: Finding; onClose: () => void }) {
  const { lang, t } = useLang();
  const [idx, setIdx] = useState(0);
  const reason = finding.reasons[Math.min(idx, finding.reasons.length - 1)];
  const doc = SOURCES[reason.sourceId];
  const rule = RULE_BY_ID[reason.ruleId];
  const [passage, setPassage] = useState(doc.highlight);
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);

  useEffect(() => setPassage(SOURCES[reason.sourceId].highlight), [reason.sourceId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const n = doc.paragraphs.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white" role="dialog" aria-modal="true" aria-labelledby="source-title">
      <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-16 lg:py-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="source-title" className="text-[26px] font-medium">{t('Detalles de la fuente', 'Source details')}</h2>
            <p className="mt-1 text-ink-2">
              {finding.title}
              {finding.meds.length > 1 && ` · ${finding.meds.join(', ')}`}
            </p>
          </div>
          <IconButton label={t('Cerrar', 'Close')} className="size-14" onClick={onClose}>
            <X className="size-6" />
          </IconButton>
        </div>

        <div className={`mt-10 grid gap-10 ${full ? '' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]'}`}>
          {!full && (
            <section className="h-fit rounded-xl border border-line p-6">
              {finding.reasons.length > 1 && (
                <div role="tablist" aria-label={t('Reglas de este hallazgo', 'Rules behind this finding')} className="mb-4 flex flex-wrap gap-2">
                  {finding.reasons.map((r, i) => (
                    <button
                      key={r.ruleId}
                      role="tab"
                      type="button"
                      aria-selected={r === reason}
                      onClick={() => setIdx(i)}
                      className={`h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium ${
                        r === reason ? 'bg-brand-700 text-white' : 'bg-tint text-ink hover:bg-line'
                      }`}
                    >
                      {r.ruleId}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                <SeverityChip severity={reason.severity} />
                <Chip>{TYPE_LABEL[lang][reason.type]}</Chip>
              </div>
              <p className="mt-3 text-lg leading-7 font-medium">{reason.message}</p>
              <p className="mt-2 text-sm text-ink-2">
                <span className="font-medium text-ink">{t('Acción sugerida', 'Suggested action')}: </span>
                {reason.action}
              </p>
              <p className="mt-3 text-sm text-ink-3">
                {t('Regla', 'Rule')} {rule.id} v{rule.version} · {rule.author[lang]} · {t('revisada por', 'reviewed by')}{' '}
                {rule.reviewedBy[lang].toLowerCase()} {t('el', 'on')} {fmtDate(rule.lastReviewed)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
                <Globe aria-hidden className="size-4" />
                {doc.document[lang]} · {doc.section[lang]}
              </p>

              <hr className="my-5 border-line" />
              <h3 className="text-sm font-medium text-ink-2">{t('Criterios', 'Criteria')}</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-6">
                {reason.criteria.map((c) => (
                  <li key={c.label} className={c.met ? 'text-ink' : 'text-ink-3'}>
                    {c.label}: {t('esperado', 'expected')} {c.expected} · {t('encontrado', 'found')} {c.found} ·{' '}
                    <span className="font-medium">{c.met ? t('cumplido', 'met') : t('no cumplido', 'not met')}</span>
                  </li>
                ))}
              </ul>

              <h3 className="mt-5 text-sm font-medium text-ink-2">{t('Sección de la fuente', 'Source section')}</h3>
              <p className="mt-1 text-[15px]">{doc.section[lang]}</p>

              <hr className="my-5 border-line" />
              <blockquote className="border-l-4 border-line-strong pl-4 text-[15px] leading-7 text-ink">
                {doc.paragraphs[doc.highlight][lang]}
              </blockquote>
              <p className="mt-4 text-[13px] leading-5 text-ink-3">
                {doc.publisher} · {doc.version[lang]}.{' '}
                {t(
                  'Paráfrasis ilustrativa para el diseño: sustituir por el texto con licencia y verificar con un farmacéutico clínico antes de cualquier uso real.',
                  'Illustrative paraphrase for design purposes: replace with the licensed text and have a clinical pharmacist verify it before any real use.',
                )}
              </p>
            </section>
          )}

          <section className="overflow-hidden rounded-xl border border-line">
            <div className="flex items-start justify-between gap-4 p-6">
              <div>
                <div className="text-xl font-medium">{doc.document[lang]}</div>
                <div className="mt-1 text-ink-3">{doc.section[lang]}</div>
              </div>
              <IconButton
                label={full ? t('Salir de pantalla completa', 'Exit full screen') : t('Pantalla completa', 'Full screen')}
                onClick={() => setFull((v) => !v)}
              >
                {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </IconButton>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-y border-line px-6 py-3">
              <IconButton label={t('Reducir', 'Zoom out')} onClick={() => setZoom((z) => ZOOMS[Math.max(0, ZOOMS.indexOf(z) - 1)])}>
                <ZoomOut className="size-4" />
              </IconButton>
              <select
                aria-label="Zoom"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-10 rounded-md border border-line bg-white px-3 text-sm"
              >
                {ZOOMS.map((z) => (
                  <option key={z} value={z}>
                    {z === 1 ? t('Ajustar', 'Fit') : `${Math.round(z * 100)} %`}
                  </option>
                ))}
              </select>
              <IconButton label={t('Ampliar', 'Zoom in')} onClick={() => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + 1)])}>
                <ZoomIn className="size-4" />
              </IconButton>
              <span className="mx-auto text-sm text-ink-2">
                {t('Pasaje', 'Passage')} {passage + 1} {t('de', 'of')} {n}
              </span>
              <Button icon={<ChevronLeft className="size-4" />} disabled={passage === 0} onClick={() => setPassage((p) => p - 1)}>
                {t('Anterior', 'Previous')}
              </Button>
              <Button disabled={passage === n - 1} onClick={() => setPassage((p) => p + 1)}>
                {t('Siguiente', 'Next')} <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="bg-canvas p-6">
              <article className="mx-auto max-w-3xl bg-white p-8 shadow-sm" style={{ fontSize: `${zoom}rem` }}>
                <div className="flex items-center gap-3 border-b-2 border-brand-600 pb-3">
                  <span className="flex size-10 items-center justify-center rounded bg-brand-700 text-xs font-bold text-white">
                    {doc.publisher.slice(0, 4).toUpperCase()}
                  </span>
                  <div>
                    <div className="text-[1.15em] font-bold">{doc.document[lang]}</div>
                    <div className="text-[0.8em] text-ink-3">{doc.publisher} · {doc.version[lang]}</div>
                  </div>
                </div>
                <h4 className="mt-5 text-center text-[0.95em] font-bold tracking-wide uppercase">{doc.section[lang]}</h4>
                <div className="mt-4 space-y-3 leading-relaxed">
                  {doc.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className={`rounded px-1 ${i === doc.highlight ? 'bg-[#fff3b0]' : ''} ${i === passage ? 'outline-2 outline-offset-2 outline-brand-600' : ''}`}
                    >
                      {p[lang]}
                    </p>
                  ))}
                </div>
                <p className="mt-8 border border-ink px-2 py-1 text-[0.7em] font-bold">
                  {t(
                    `Nota: texto parafraseado para el POC. Resaltado: pasaje fijado por la regla ${rule.id}.`,
                    `Note: paraphrased text for the POC. Highlighted: passage pinned by rule ${rule.id}.`,
                  )}
                </p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
