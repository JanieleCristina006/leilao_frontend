import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuctionStatus } from '../types';
import { useApp } from '../store/AppContext';
import { useLive } from '../store/LiveContext';
import { countdown, fmtPeriod } from '../lib/format';
import { ANTI_SNIPE_MS } from '../lib/status';
import { Artwork, Badge, EmptyState, LiveDot, LoadingState, Page, PageTitle, Segmented, Stat, btn } from '../components/ui';

type Filter = 'ALL' | Extract<AuctionStatus, 'ACTIVE' | 'SCHEDULED' | 'FINISHED'>;

export default function Auctions() {
  const { auctions, lots, loading } = useApp();
  const live = useLive();
  const [filter, setFilter] = useState<Filter>('ALL');

  const publicAuctions = auctions.filter((a) => a.status !== 'DRAFT' && a.status !== 'CANCELLED');
  const featured = publicAuctions.find((a) => a.status === 'ACTIVE');
  const lotsOf = (id: string) => lots.filter((l) => l.auctionId === id);
  const cover = (id: string) => lotsOf(id)[0];

  const soonest = useMemo(() => {
    if (!featured) return null;
    return lotsOf(featured.id).filter((l) => l.status === 'OPEN').sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt))[0] ?? null;
  }, [featured, lots]);
  const soonestEnds = soonest ? live.get(soonest).endsAt : 0;
  const remaining = soonestEnds - live.now;

  const options = (['ALL', 'ACTIVE', 'SCHEDULED', 'FINISHED'] as Filter[]).map((v) => ({
    value: v,
    label: { ALL: 'Todos', ACTIVE: 'Ao vivo', SCHEDULED: 'Agendados', FINISHED: 'Encerrados' }[v],
    count: v === 'ALL' ? publicAuctions.length : publicAuctions.filter((a) => a.status === v).length,
  }));
  const showFeatured = featured && (filter === 'ALL' || filter === 'ACTIVE');
  const grid = publicAuctions.filter((a) => a.id !== featured?.id && (filter === 'ALL' || a.status === filter));

  if (loading && auctions.length === 0) {
    return <Page><PageTitle eyebrow="Catálogo" title="Leilões" /><LoadingState label="Carregando leilões…" /></Page>;
  }

  return (
    <Page>
      <PageTitle eyebrow="Catálogo" title="Leilões" actions={<Segmented label="Filtrar por situação" options={options} value={filter} onChange={setFilter} />} />

      {showFeatured && featured && (
        <article className="grid overflow-hidden rounded-[4px] border border-line bg-surface md:grid-cols-2">
          <Artwork src={cover(featured.id)?.imageUrl ?? ''} alt={cover(featured.id)?.title ?? ''} className="min-h-[320px] rounded-none md:min-h-[400px]" />
          <div className="flex flex-col justify-center gap-5 p-8 md:p-10">
            <span className="flex items-center gap-2 text-[13px] font-bold tracking-[0.08em] text-live uppercase"><LiveDot />Ao vivo agora</span>
            <h2 className="text-[36px] leading-[1.05] font-extrabold tracking-tight md:text-[44px]">{featured.title}</h2>
            <p className="text-base leading-relaxed text-pretty text-body">{featured.description}</p>
            <dl className="grid grid-cols-3 gap-4 border-t border-line pt-5">
              <Stat label="Período" value={fmtPeriod(featured.startsAt, featured.endsAt)} />
              <Stat label="Lotes" value={`${lotsOf(featured.id).length} lotes`} />
              {soonest && (
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-muted">Lote {String(soonest.number).padStart(2, '0')} encerra em</dt>
                  <dd className={`m-0 font-mono text-[15px] font-semibold ${remaining < ANTI_SNIPE_MS ? 'text-accent' : ''}`}>{countdown(remaining)}</dd>
                </div>
              )}
            </dl>
            <div className="flex flex-wrap gap-3">
              {soonest && <Link to={`/lotes/${soonest.id}/sala`} className={btn('primary')}>Entrar na sala ao vivo</Link>}
              <Link to={`/leiloes/${featured.id}`} className={btn('secondary')}>Ver todos os lotes</Link>
            </div>
          </div>
        </article>
      )}

      {grid.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-x-6 gap-y-8">
          {grid.map((a) => (
            <Link key={a.id} to={`/leiloes/${a.id}`} className="group flex flex-col gap-3.5 no-underline">
              <Artwork src={cover(a.id)?.imageUrl ?? ''} alt={cover(a.id)?.title ?? ''} className="aspect-[4/3] transition-opacity group-hover:opacity-90" />
              <Badge status={a.status} />
              <span className="text-[24px] leading-tight font-extrabold tracking-tight group-hover:underline">{a.title}</span>
              <span className="text-sm text-muted">{fmtPeriod(a.startsAt, a.endsAt)} · {lotsOf(a.id).length} lotes</span>
            </Link>
          ))}
        </div>
      )}
      {!showFeatured && grid.length === 0 && <EmptyState>Nenhum leilão nesta situação.</EmptyState>}
    </Page>
  );
}
