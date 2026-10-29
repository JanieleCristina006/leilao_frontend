import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Lot } from '../types';
import { useApp } from '../store/AppContext';
import { useLive } from '../store/LiveContext';
import { apiRequest } from '../lib/api';
import { mapAuction } from '../lib/api-mappers';
import { BRL, countdown, fmtDateTime, fmtShortDateTime, pad } from '../lib/format';
import { ANTI_SNIPE_MS } from '../lib/status';
import { Artwork, Badge, Breadcrumb, LoadingState, Notice, Page, Stat, btn } from '../components/ui';
import NotFound from './NotFound';

export default function AuctionDetail() {
  const { id } = useParams();
  const { auctions, lots, loading: appLoading } = useApp();
  const live = useLive();
  const [detail, setDetail] = useState<ReturnType<typeof mapAuction> | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setDetailLoading(true);
    apiRequest<unknown>(`/auctions/${encodeURIComponent(id ?? '')}`)
      .then((payload) => { if (active) setDetail(mapAuction(payload)); })
      .catch(() => { if (active) setDetail(null); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [id]);
  const auction = detail ?? auctions.find((a) => a.id === id);
  if (!auction && (detailLoading || appLoading)) return <Page><LoadingState label="Carregando leilão…" /></Page>;
  if (!auction || auction.status === 'DRAFT') return <NotFound />;
  const items = lots.filter((l) => l.auctionId === auction.id);

  return (
    <Page>
      <Breadcrumb items={[{ label: 'Leilões', to: '/leiloes' }, { label: auction.title }]} />
      <div className="grid items-end gap-x-16 gap-y-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Badge status={auction.status} />
          <h1 className="text-[40px] leading-none font-extrabold tracking-tight text-balance md:text-[52px]">{auction.title}</h1>
          <p className="max-w-[560px] text-[17px] leading-relaxed text-pretty text-body">{auction.description}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-ink pt-5">
          <Stat label="Início" value={fmtDateTime(auction.startsAt)} />
          <Stat label="Encerramento previsto" value={fmtDateTime(auction.endsAt)} />
          <Stat label="Lotes" value={`${items.length} lotes`} />
          <Stat label="Leiloeiro" value={auction.auctioneerName} />
        </dl>
      </div>

      {auction.status === 'ACTIVE' && (
        <Notice title="Regra de prorrogação">
          Um lance nos 2 minutos finais estende o encerramento daquele lote em mais 2 minutos. Cada lote pode encerrar em um horário diferente.
        </Notice>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-x-6 gap-y-10">
        {items.map((lot) => <LotCard key={lot.id} lot={lot} startsAt={auction.startsAt} now={live.now} endsAt={live.get(lot).endsAt} />)}
      </div>
    </Page>
  );
}

function LotCard({ lot, startsAt, now, endsAt }: { lot: Lot; startsAt: string; now: number; endsAt: number }) {
  const remaining = endsAt - now;
  const closed = lot.status === 'SOLD' || lot.status === 'UNSOLD';
  const priceLabel = closed ? 'Valor final' : lot.currentBid != null ? 'Lance atual' : 'Lance inicial';
  const price = closed ? (lot.status === 'SOLD' ? lot.currentBid ?? 0 : 0) : lot.currentBid ?? lot.startingBid;

  let meta = '';
  let action = null;
  if (lot.status === 'OPEN') {
    meta = `${lot.bidCount ? `${lot.bidCount} lances` : 'Sem lances'} · encerra em ${countdown(remaining)}`;
    action = <Link to={`/lotes/${lot.id}/sala`} className={btn('primary', 'md')}>Entrar na sala</Link>;
  } else if (closed) {
    meta = lot.status === 'SOLD' ? `Encerrado em ${fmtShortDateTime(lot.endsAt)}` : 'Encerrado sem lances';
    action = <Link to={`/lotes/${lot.id}/comprovante`} className={btn('secondary', 'md')}>Ver comprovante</Link>;
  } else if (lot.status === 'WAITING') {
    meta = `Abre em ${fmtDateTime(startsAt)}`;
    action = <button disabled className={btn('ghost', 'md')}>Disponível na abertura</button>;
  } else {
    meta = 'Cancelado pelo leiloeiro';
    action = <button disabled className={btn('ghost', 'md')}>Lote cancelado</button>;
  }

  return (
    <article className="flex h-full flex-col gap-3">
      <Artwork src={lot.imageUrl} alt={`${lot.title}, de ${lot.artist}`} className="aspect-square" dim={lot.status === 'CANCELLED'} />
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted">Lote {pad(lot.number)}</span>
        <Badge status={lot.status} />
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[22px] leading-tight font-extrabold tracking-tight">{lot.title}</h3>
        <span className="text-sm text-muted">{lot.artist}</span>
      </div>
      <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-line pt-2.5">
        <span className="text-[13px] text-muted">{priceLabel}</span>
        <span className="font-mono text-base font-medium">{BRL(price)}</span>
      </div>
      <span className={`font-mono text-[13px] ${lot.status === 'OPEN' && remaining < ANTI_SNIPE_MS ? 'text-accent' : 'text-muted'}`}>{meta}</span>
      {action}
    </article>
  );
}
