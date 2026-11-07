import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { SEVERITY_LABEL } from '../domain/rules';
import type { Severity } from '../domain/types';
import { useLang } from '../i18n';

type Variant = 'primary' | 'outline' | 'ghost' | 'link' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; icon?: ReactNode };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'outline', size = 'md', icon, className = '', children, ...rest },
  ref,
) {
  const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm' };
  const variants: Record<Variant, string> = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
    outline: 'border border-line-strong bg-white text-ink hover:bg-canvas',
    ghost: 'text-ink-2 hover:bg-tint',
    link: 'border border-line bg-white text-brand-800 hover:bg-brand-50',
    danger: 'border border-major/40 bg-white text-major hover:bg-major-bg',
  };
  return (
    <button
      ref={ref}
      type="button"
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(
  function IconButton({ label, children, className = '', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={`inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-white text-ink-2 transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

export type Tone = 'brand' | 'neutral' | 'major' | 'moderate' | 'minor' | 'judge' | 'id' | 'solidMajor';

export function Chip({ tone = 'neutral', icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  const tones: Record<Tone, string> = {
    brand: 'border border-brand-600 bg-white text-brand-800',
    neutral: 'bg-tint text-ink',
    major: 'bg-major-bg text-major',
    moderate: 'bg-moderate-bg text-moderate',
    minor: 'bg-minor-bg text-minor',
    judge: 'bg-judge-bg text-judge',
    id: 'bg-idchip-bg text-idchip',
    solidMajor: 'bg-major text-white',
  };
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

export function SeverityChip({ severity }: { severity: Severity }) {
  const { lang } = useLang();
  return <Chip tone={severity}>{SEVERITY_LABEL[lang][severity]}</Chip>;
}

export function SeverityIcon({ severity, className = 'size-5' }: { severity: Severity; className?: string }) {
  if (severity === 'major') return <CircleAlert aria-hidden className={`${className} text-major`} />;
  if (severity === 'moderate') return <TriangleAlert aria-hidden className={`${className} text-moderate`} />;
  return <Info aria-hidden className={`${className} text-minor`} />;
}

export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLElement> & { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-white ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ icon, title, right }: { icon?: ReactNode; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-6 pt-5 pb-3">
      {icon}
      <h2 className="text-[17px] font-medium text-ink">{title}</h2>
      <div className="ml-auto flex items-center gap-2">{right}</div>
    </div>
  );
}

export function Banner({ title, children, icon }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg bg-brand-50 p-4 text-ink">
      <div className="pt-0.5">
        {icon ?? (
          <span className="flex size-5 items-center justify-center rounded-full bg-brand-700 text-white">
            <Info aria-hidden className="size-3.5" />
          </span>
        )}
      </div>
      <div className="text-sm leading-5">
        <div className="font-medium">{title}</div>
        <div className="text-ink-2">{children}</div>
      </div>
    </div>
  );
}
