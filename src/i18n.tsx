import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { td, tr, type Lang } from './domain/lang';

interface LangCtx {
  lang: Lang;
  setLang(l: Lang): void;
  t(es: string, en: string): string;
  d(s: string): string;
}

const Ctx = createContext<LangCtx | null>(null);
const KEY = 'noa.lang';

const initial = (): Lang => {
  const saved = localStorage.getItem(KEY);
  if (saved === 'es' || saved === 'en') return saved;
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
};

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>(initial);
  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(KEY, l);
    set(l);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = tr(lang, 'Noa · Revisión de medicación (POC)', 'Noa · Medication review (POC)');
  }, [lang]);
  return (
    <Ctx.Provider value={{ lang, setLang, t: (es, en) => tr(lang, es, en), d: (s) => td(s, lang) }}>{children}</Ctx.Provider>
  );
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLang outside LangProvider');
  return c;
}
