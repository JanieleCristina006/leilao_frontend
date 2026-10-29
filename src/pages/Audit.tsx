import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Integrity } from '../types';
import { useApp } from '../store/AppContext';
import { apiRequest, responseObject } from '../lib/api';
import { mapAuction, mapLot, mapBids } from '../lib/api-mappers';
import { BRL, clock, shortHash } from '../lib/format';
import { Breadcrumb, EmptyState, LoadingState, Notice, Page, PageTitle, SectionTitle } from '../components/ui';
import NotFound from './NotFound';

type AuditPayload = Record<string, unknown>;
const object = (value: unknown): AuditPayload => value && typeof value === 'object' && !Array.isArray(value) ? value as AuditPayload : {};

const RESULT: Record<Integrity, { label: string; box: string; border: string; desc: string }> = {
  INTACT: { label: 'Íntegra', box: 'bg-ok-bg text-ok', border: 'border-ok', desc: 'A API recalculou a cadeia de hashes e confirmou a integridade dos lances registrados.' },
  TAMPERED: { label: 'Adulterada', box: 'bg-live-bg text-live', border: 'border-live', desc: 'A API encontrou divergência na cadeia de hashes deste lote.' },
  INCOMPLETE: { label: 'Incompleta', box: 'bg-warn-bg text-warn', border: 'border-warn', desc: 'Parte do histórico não possui hashes verificáveis.' },
};

export default function Audit() {
  const { id = '' } = useParams();
  const { lots, auctions, loading: appLoading } = useApp();
  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<unknown>(`/lots/${encodeURIComponent(id)}/audit`)
      .then((payload) => {
        if (!active) return;
        const outer = responseObject(payload);
        setAudit(object(outer.audit ?? outer));
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a auditoria.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const rawLot = object(audit?.lot ?? audit?.lotSnapshot);
  const rawAuction = object(audit?.auction ?? audit?.auctionSnapshot ?? rawLot.auction);
  const lot = rawLot.id ? mapLot(rawLot) : lots.find((item) => item.id === id);
  const auction = rawAuction.id ? mapAuction(rawAuction) : lot && auctions.find((item) => item.id === lot.auctionId);
  if (loading || (!lot && appLoading)) return <Page><LoadingState label="Verificando a cadeia de lances…" /></Page>;
  if (!lot || !auction) return error ? <Page><Notice tone="error">{error}</Notice></Page> : <NotFound />;

  const rawIntegrity = String(audit?.integrity ?? 'INCOMPLETE').toUpperCase();
  const mode: Integrity = rawIntegrity === 'INTACT' || rawIntegrity === 'TAMPERED' ? rawIntegrity : 'INCOMPLETE';
  const result = RESULT[mode];
  const bidsPayload = audit?.bids ?? audit?.history;
  const bids = mapBids(bidsPayload);
  const last = bids[bids.length - 1];
  const registeredCount = Number(audit?.bidCount ?? audit?.registeredBidCount ?? lot.bidCount);
  const anchor = String(audit?.lastHash ?? audit?.storedLastHash ?? audit?.lastBidHash ?? '');
  const checks = [
    ['Lances recebidos pela verificação', String(bids.length)],
    ['Quantidade registrada no lote', String(registeredCount)],
    ['Último hash calculado', shortHash(last?.hash ?? null)],
    ['Hash de referência do lote', shortHash(anchor || null)],
  ];

  return (
    <Page width="mid">
      <Breadcrumb items={[{ label: auction.title, to: `/leiloes/${auction.id}` }, { label: lot.title, to: `/lotes/${lot.id}/comprovante` }, { label: 'Auditoria' }]} />
      <PageTitle eyebrow={`Auditoria pública · ${lot.title}`} title="Histórico verificável" />
      {error && <Notice tone="error">{error}</Notice>}

      <section className={`grid overflow-hidden rounded-[4px] border md:grid-cols-2 ${result.border}`}>
        <div className={`flex flex-col gap-2 p-7 ${result.box}`}>
          <span className="text-xs font-bold tracking-[0.12em] uppercase">Integridade informada pela API</span>
          <span className="text-[44px] leading-none font-extrabold tracking-tight">{result.label}</span>
          <span className="font-mono text-[13px]">{mode}</span>
          <span className="mt-2 text-[15px] leading-relaxed text-pretty">{result.desc}</span>
        </div>
        <ul className="flex flex-col bg-surface px-7 py-3">
          {checks.map(([label, detail]) => (
            <li key={label} className="grid grid-cols-[28px_1fr] items-start gap-2 border-b border-soft py-3.5 last:border-0">
              <span aria-hidden className={`text-base font-bold ${mode === 'INTACT' ? 'text-ok' : mode === 'TAMPERED' ? 'text-live' : 'text-warn'}`}>{mode === 'INTACT' ? '✓' : mode === 'TAMPERED' ? '!' : '·'}</span>
              <div className="flex flex-col gap-0.5"><span className="text-[15px] font-semibold">{label}</span><span className="text-[13px] text-muted">{detail}</span></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle aside="Licitantes identificados não são exibidos">Cadeia de lances</SectionTitle>
        {bids.length === 0 ? <EmptyState>Este lote não possui lances verificáveis.</EmptyState> : (
          <div className="overflow-x-auto rounded-[4px] border border-line bg-surface">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  {['Seq.', 'Valor', 'Horário', 'Hash anterior', 'Hash', 'Verificação'].map((heading) => <th key={heading} className="border-b border-line px-4 py-3 font-semibold">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {bids.map((bid) => {
                  const rowStatus = mode === 'INTACT' ? 'Verificado' : mode === 'TAMPERED' ? 'Divergência na cadeia' : bid.hash ? 'Cadeia incompleta' : 'Sem hash';
                  const statusClass = mode === 'INTACT' ? 'text-ok' : mode === 'TAMPERED' ? 'text-live' : 'text-warn';
                  return (
                    <tr key={`${bid.seq}-${bid.hash ?? bid.amount}`}>
                      <td className="border-b border-soft px-4 py-3 font-mono">{bid.seq}</td>
                      <td className="border-b border-soft px-4 py-3 font-mono">{BRL(bid.amount)}</td>
                      <td className="border-b border-soft px-4 py-3 text-muted">{clock(bid.at)}</td>
                      <td className="border-b border-soft px-4 py-3 font-mono text-xs text-muted">{bid.prevHash ? shortHash(bid.prevHash) : 'início da cadeia'}</td>
                      <td className="border-b border-soft px-4 py-3 font-mono text-xs">{shortHash(bid.hash)}</td>
                      <td className={`border-b border-soft px-4 py-3 font-semibold ${statusClass}`}>{rowStatus}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Page>
  );
}
