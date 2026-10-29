import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Lot } from '../types';
import { useApp } from '../store/AppContext';
import { useLive } from '../store/LiveContext';
import { apiRequest } from '../lib/api';
import { mapAuction } from '../lib/api-mappers';
import { BRL, countdown, fmtDateTime, fmtShortDateTime, pad } from '../lib/format';
import { ANTI_SNIPE_MS } from '../lib/status';
import { Artwork, Badge, Breadcrumb, LoadingState, Notice, Page } from '../components/ui';
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
    <Page width="mid">
      <Breadcrumb items={[{ label: 'Leilões', to: '/leiloes' }, { label: auction.title }]} />
      <section className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.82fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Badge status={auction.status} />
          <h1 className="break-words text-[40px] leading-[1.02] font-extrabold tracking-tight text-balance sm:text-[48px] md:text-[54px]">{auction.title}</h1>
          <p className="max-w-[560px] text-[16px] leading-relaxed text-pretty text-body sm:text-[17px]">{auction.description}</p>
        </div>
        <dl className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-1 lg:border-t-0 lg:border-l lg:py-1 lg:pl-8">
          <DetailFact icon="calendar" label="Início" value={fmtDateTime(auction.startsAt)} />
          <DetailFact icon="calendar" label="Encerramento previsto" value={fmtDateTime(auction.endsAt)} />
          <DetailFact icon="lots" label="Lotes" value={`${items.length} lotes`} />
          <DetailFact icon="auctioneer" label="Leiloeiro" value={auction.auctioneerName} />
        </dl>
      </section>

      {auction.status === 'ACTIVE' && (
        <Notice title="Regra de prorrogação">
          Um lance nos 2 minutos finais estende o encerramento daquele lote em mais 2 minutos. Cada lote pode encerrar em um horário diferente.
        </Notice>
      )}

      {items.length > 0 && (
        <section aria-label="Lotes deste leilão" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-line pt-5">
            <h2 className="text-[28px] font-extrabold tracking-tight">Lotes</h2>
            <span className="text-sm text-muted">{items.length} {items.length === 1 ? 'lote' : 'lotes'}</span>
          </div>
          <div className="grid w-full max-w-[720px] grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
            {items.map((lot) => <LotCard key={lot.id} lot={lot} startsAt={auction.startsAt} now={live.now} endsAt={live.get(lot).endsAt} />)}
          </div>
        </section>
      )}
    </Page>
  );
}

function DetailFact({ icon, label, value }: { icon: 'calendar' | 'lots' | 'auctioneer'; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink">
        {icon === 'calendar' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]"><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" /></svg>
        ) : icon === 'lots' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]"><path d="m14 4 6 6M12.5 5.5l6 6M4 20l8.5-8.5M3 21l4-1 10-10-3-3L4 17l-1 4ZM14 6l3-3 4 4-3 3" /></svg>
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-[13px] text-muted">{label}</dt>
        <dd className="m-0 break-words text-[15px] font-semibold">{value}</dd>
      </div>
    </div>
  );
}

function LotCard({ lot, startsAt, now, endsAt }: { lot: Lot; startsAt: string; now: number; endsAt: number }) {
  const remaining = endsAt - now;
  const closed = lot.status === 'SOLD' || lot.status === 'UNSOLD';
  const priceLabel = closed ? 'Valor final' : lot.currentBid != null ? 'Lance atual' : 'Lance inicial';
  const price = closed ? (lot.status === 'SOLD' ? lot.currentBid ?? 0 : 0) : lot.currentBid ?? lot.startingBid;

  let meta = '';
  let destination: string | null = null;
  if (lot.status === 'OPEN') {
    meta = `${lot.bidCount ? `${lot.bidCount} lances` : 'Sem lances'} · encerra em ${countdown(remaining)}`;
    destination = `/lotes/${lot.id}/sala`;
  } else if (closed) {
    meta = lot.status === 'SOLD' ? `Encerrado em ${fmtShortDateTime(lot.endsAt)}` : 'Encerrado sem lances';
    destination = `/lotes/${lot.id}/comprovante`;
  } else if (lot.status === 'WAITING') {
    meta = `Abre em ${fmtDateTime(startsAt)}`;
  } else {
    meta = 'Cancelado pelo leiloeiro';
  }

  const cardContent = (
    <>
      <div className="relative">
        <Artwork src={lot.imageUrl} alt={`${lot.title}, de ${lot.artist}`} className="aspect-[4/3] rounded-none" dim={lot.status === 'CANCELLED'} />
        <div className="absolute top-3 left-3"><Badge status={lot.status} /></div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Lote {pad(lot.number)}</span>
          <h3 className={`break-words text-[20px] leading-tight font-extrabold tracking-tight ${destination ? 'group-hover:underline' : ''}`}>{lot.title}</h3>
          <span className="text-sm text-muted">{lot.artist}</span>
        </div>
        <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-line pt-3">
          <span className="text-[13px] text-muted">{priceLabel}</span>
          <span className="font-mono text-sm font-medium">{BRL(price)}</span>
        </div>
        <span className={`font-mono text-[12px] ${lot.status === 'OPEN' && remaining < ANTI_SNIPE_MS ? 'text-accent' : 'text-muted'}`}>{meta}</span>
      </div>
    </>
  );

  const cardClass = 'flex h-full min-w-0 flex-col overflow-hidden rounded-[4px] border border-line bg-surface transition-shadow hover:shadow-[0_12px_32px_rgba(14,17,22,0.10)]';
  return destination
    ? <Link to={destination} className={`group ${cardClass} no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`}>{cardContent}</Link>
    : <article className={cardClass}>{cardContent}</article>;
}
