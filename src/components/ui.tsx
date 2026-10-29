import { Link } from 'react-router-dom';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import type { AuctionStatus, LotStatus } from '../types';
import { STATUS } from '../lib/status';
import { API_URL } from '../lib/api';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';
type SpinnerSize = 'sm' | 'md' | 'lg';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-page hover:bg-ink-2 disabled:bg-disabled disabled:hover:bg-disabled',
  secondary: 'border border-ink text-ink hover:bg-soft',
  ghost: 'border border-field text-ink hover:bg-soft',
  danger: 'bg-accent text-white hover:bg-accent/90',
};
const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
  xl: 'h-14 px-6 text-base',
};
export const btn = (variant: Variant = 'primary', size: Size = 'lg', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-[2px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT[variant]} ${SIZE[size]} ${extra}`;

export function Spinner({ size = 'md' }: { size?: SpinnerSize }) {
  const sizeClass = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-8 border-[3px]' : 'size-5';
  return <span aria-hidden="true" className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current/20 border-t-current ${sizeClass}`} />;
}

export function LoadingState({ label = 'Carregando…', compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center justify-center gap-3 text-sm text-muted ${compact ? 'py-2' : 'py-12'}`}>
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function Button({ variant, size, className = '', loading = false, disabled, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button type="button" {...p} disabled={disabled || loading} aria-busy={loading || undefined} className={btn(variant, size, className)}>
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-baseline gap-2 no-underline">
      <span className="text-[28px] font-extrabold leading-none tracking-tight">Verzel</span>
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Leilões</span>
    </Link>
  );
}

export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{children}</span>
);

export function PageTitle({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-2.5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="text-[40px] font-extrabold leading-none tracking-tight text-balance md:text-[56px]">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="text-[28px] font-extrabold tracking-tight">{children}</h2>
      {aside && <span className="text-[13px] text-muted">{aside}</span>}
    </div>
  );
}

export function Page({ children, width = 'wide' }: { children: ReactNode; width?: 'wide' | 'mid' | 'narrow' }) {
  const max = width === 'narrow' ? 'max-w-[880px]' : width === 'mid' ? 'max-w-[1040px]' : 'max-w-[1240px]';
  return <main className={`mx-auto flex w-full flex-col gap-10 px-5 pt-10 pb-24 md:px-8 ${max}`}>{children}</main>;
}

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Navegação estrutural" className="flex flex-wrap gap-2 text-sm text-muted">
      {items.map((it, i) => (
        <span key={i} className="flex gap-2">
          {i > 0 && <span aria-hidden>/</span>}
          {it.to ? <Link to={it.to} className="link">{it.label}</Link> : <span className="text-ink">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Badge({ status }: { status: AuctionStatus | LotStatus }) {
  const s = STATUS[status];
  return <span className={`inline-flex self-start rounded-[2px] px-2 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

const artworkImagePath = /^\/iiif\/2\/([^/]+)(?:\/|$)/;
const artworkProxyPath = /^\/lots\/artworks\/image\/([^/]+)(?:\/|$)/;
const artworkImageIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveArtworkImageUrl(src: string) {
  let url: URL;
  try {
    url = new URL(src, API_URL);
  } catch {
    return src;
  }

  const imageId = ['www.artic.edu', 'artic.edu'].includes(url.hostname)
    ? artworkImagePath.exec(url.pathname)?.[1]
    : artworkProxyPath.exec(url.pathname)?.[1];

  if (!imageId || !artworkImageIdPattern.test(imageId)) return src;
  return `${API_URL}/lots/artworks/image/${encodeURIComponent(imageId)}`;
}

export function Artwork({ src, alt, className = '', dim = false }: { src: string; alt: string; className?: string; dim?: boolean }) {
  const imageUrl = resolveArtworkImageUrl(src);
  return (
    <div className={`relative overflow-hidden rounded-[2px] bg-neutral-bg ${className}`}>
      {src && <img src={imageUrl} alt={alt} loading="lazy" className={`absolute inset-0 size-full object-cover ${dim ? 'opacity-45 grayscale' : ''}`} />}
    </div>
  );
}

export const LiveDot = () => <span aria-hidden className="inline-block size-2 animate-pulse rounded-full bg-accent" />;

type Tone = 'info' | 'warn' | 'error' | 'ok';
const TONE: Record<Tone, string> = {
  info: 'bg-soft text-ink',
  warn: 'bg-warn-bg text-warn',
  error: 'bg-live-bg text-live',
  ok: 'bg-ok-bg text-ok',
};
export function Notice({ tone = 'info', title, children }: { tone?: Tone; title?: ReactNode; children?: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex flex-col gap-1 rounded-[2px] px-4 py-3 text-sm leading-relaxed ${TONE[tone]}`}>
      {title && <strong className="text-[15px]">{title}</strong>}
      {children && <span>{children}</span>}
    </div>
  );
}

export const inputCls =
  'w-full h-12 px-3.5 rounded-[2px] border bg-surface text-base text-ink outline-none placeholder:text-muted focus:border-ink focus:ring-3 focus:ring-ink/10';

export function Field({ id, label, required, optional, hint, error, children }: { id?: string; label: string; required?: boolean; optional?: boolean; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && <span className="text-accent"> *</span>}
        {optional && <span className="font-normal text-muted"> (opcional)</span>}
      </label>
      {children}
      {error ? <span role="alert" className="text-[13px] text-live">{error}</span> : hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
    </div>
  );
}

export function TextInput({ invalid, className = '', ...p }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...p} aria-invalid={invalid || undefined} className={`${inputCls} ${invalid ? 'border-accent' : 'border-field'} ${className}`} />;
}

export function MoneyInput({ invalid, large, ...p }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; large?: boolean }) {
  return (
    <div className={`flex items-center rounded-[2px] border bg-surface focus-within:border-ink focus-within:ring-3 focus-within:ring-ink/10 ${large ? 'h-14' : 'h-12'} ${invalid ? 'border-accent' : 'border-field'} ${p.disabled ? 'opacity-60' : ''}`}>
      <span className="pl-3.5 font-mono text-muted">R$</span>
      <input inputMode="decimal" placeholder="0,00" {...p} aria-invalid={invalid || undefined} className={`h-full min-w-0 flex-1 bg-transparent px-3 font-mono outline-none disabled:cursor-not-allowed ${large ? 'text-xl' : 'text-base'}`} />
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md', label }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md'; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap overflow-hidden rounded-[2px] border border-field">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} role="tab" aria-selected={on} onClick={() => onChange(o.value)}
            className={`flex items-center gap-2 px-4 font-semibold transition-colors ${size === 'sm' ? 'h-9 text-[13px]' : 'h-11 text-sm'} ${on ? 'bg-ink text-page' : 'text-ink hover:bg-soft'}`}>
            {o.label}
            {o.count !== undefined && <span className="font-mono text-xs opacity-70">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Stat({ label, value, hint, muted }: { label: string; value: string; hint?: string; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`m-0 text-[15px] font-semibold ${muted ? 'text-muted' : ''}`}>{value}</dd>
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-12 text-center text-base text-muted">{children}</p>;
}
