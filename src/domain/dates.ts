import type { Lang } from './lang';

// Fixed review date so the demo and the eval set are deterministic.
export const TODAY = '2026-11-08';

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export const fmtDate = (d?: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '-');

export const fmtNum = (n: number, lang: Lang = 'es') =>
  n.toLocaleString(lang === 'en' ? 'en-GB' : 'es-ES', { maximumFractionDigits: 2 });
