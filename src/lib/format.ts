const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const pad = (n: number) => String(n).padStart(2, '0');

export const BRL = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const BRLshort = (v: number) => BRL(v).replace(/,00$/, '');
export const plain = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Aceita "4.300,00", "4300,5" ou "4300.50". Retorna NaN se vazio/inválido. */
export function parseMoney(input: string): number {
  let t = String(input ?? '').trim().replace(/[R$\s]/g, '');
  if (!t) return NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  return Number(t);
}
export const hasTwoDecimalsMax = (v: number) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6;
/** Valor decimal em texto, como a API espera ("100.00"). */
export const toApiDecimal = (v: number) => v.toFixed(2);

export const clock = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${fmtDate(iso)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fmtShortDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fmtPeriod = (startIso: string, endIso: string) => {
  const s = new Date(startIso);
  const e = new Date(endIso);
  return `${pad(s.getDate())} ${MONTHS[s.getMonth()]} · ${s.getHours()}h–${e.getHours()}h`;
};
export const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const countdown = (ms: number) => {
  const t = Math.max(0, ms);
  const h = Math.floor(t / 3_600_000);
  const m = Math.floor(t / 60_000) % 60;
  const s = Math.floor(t / 1000) % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const shortHash = (h: string | null) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : 'sem hash');

export const initials = (name: string) =>
  name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);

export const normalize = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
