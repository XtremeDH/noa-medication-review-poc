import { useEffect, useState } from 'react';
import type { Finding } from '../domain/engine';
import type { Lang } from '../domain/lang';
import { useLang } from '../i18n';
import { Button } from '../ui/ui';

export const DISMISS_REASONS: { id: string; es: string; en: string; queue?: boolean }[] = [
  { id: 'not_relevant', es: 'No es relevante para este paciente', en: 'Not relevant for this patient' },
  { id: 'handled', es: 'Ya está gestionado', en: 'Already handled' },
  { id: 'declined', es: 'El paciente lo rechaza', en: 'Patient declined' },
  { id: 'benefit', es: 'El beneficio supera el riesgo', en: 'Benefit outweighs risk' },
  { id: 'data_wrong', es: 'Datos incorrectos', en: 'Data wrong', queue: true },
  { id: 'rule_wrong', es: 'Regla incorrecta', en: 'Rule wrong', queue: true },
];

export const isQueueReason = (id: string) => !!DISMISS_REASONS.find((r) => r.id === id)?.queue;
export const reasonLabel = (id: string, lang: Lang) => DISMISS_REASONS.find((r) => r.id === id)?.[lang] ?? id;

export function DismissDialog({
  finding, onCancel, onConfirm,
}: { finding: Finding; onCancel: () => void; onConfirm: (reasonId: string, note?: string) => void }) {
  const { lang, t } = useLang();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="dismiss-title">
      <div className="absolute inset-0 bg-ink/40" onClick={onCancel} aria-hidden />
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
        <h2 id="dismiss-title" className="text-lg font-medium">{t('Descartar hallazgo', 'Dismiss finding')}</h2>
        <p className="mt-1 text-sm text-ink-2">{finding.title}: {finding.message}</p>
        <fieldset className="mt-4 space-y-1">
          <legend className="mb-2 text-xs font-medium text-ink-2">{t('Motivo (obligatorio)', 'Reason (required)')}</legend>
          {DISMISS_REASONS.map((r) => (
            <label key={r.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-canvas">
              <input
                type="radio"
                name="dismiss-reason"
                value={r.id}
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
                className="size-4 accent-brand-700"
              />
              {r[lang]}
              {r.queue && <span className="ml-auto text-xs text-ink-3">{t('va a revisión clínica', 'goes to clinical review')}</span>}
            </label>
          ))}
        </fieldset>
        <label className="mt-4 block text-xs font-medium text-ink-2" htmlFor="dismiss-note">
          {t('Comentario (opcional)', 'Comment (optional)')}
        </label>
        <textarea
          id="dismiss-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-md border border-line-strong p-2 text-sm outline-none focus:border-brand-600"
        />
        <p className="mt-2 text-xs text-ink-3">
          {t(
            'El hallazgo quedará oculto para este paciente hasta que cambie algún dato de entrada.',
            'The finding stays hidden for this patient until one of its inputs changes.',
          )}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {t('Cancelar', 'Cancel')}
          </Button>
          <Button variant="primary" disabled={!reason} onClick={() => onConfirm(reason, note.trim() || undefined)}>
            {t('Descartar', 'Dismiss')}
          </Button>
        </div>
      </div>
    </div>
  );
}
