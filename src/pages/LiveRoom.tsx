import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useLive } from '../store/LiveContext';
import { BRL, BRLshort, clock, countdown, pad, parseMoney, plain } from '../lib/format';
import { ANTI_SNIPE_MS } from '../lib/status';
import { Artwork, Breadcrumb, Button, LiveDot, MoneyInput, Notice, Page, Stat, btn } from '../components/ui';
import NotFound from './NotFound';

export default function LiveRoom() {
  const { id } = useParams();
  const { lots, auctions, wallets } = useApp();
  const live = useLive();
  const lot = lots.find((l) => l.id === id);
  const auction = lot && auctions.find((a) => a.id === lot.auctionId);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const joinLiveLot = live.join;
  const leaveLiveLot = live.leave;
  const syncLiveLot = live.syncLot;

  const canJoin = !!lot && auction?.status === 'ACTIVE' && lot.status === 'OPEN';
  useEffect(() => {
    if (!lot || !canJoin) return;
    const lotId = lot.id;
    joinLiveLot(lot);
    return () => leaveLiveLot(lotId);
  }, [lot?.id, canJoin, joinLiveLot, leaveLiveLot]);

  useEffect(() => {
    if (!lot || !canJoin) return;
    const lotId = lot.id;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncLiveLot(lotId);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [lot?.id, canJoin, syncLiveLot]);

  if (!lot || !auction) return <NotFound />;
  if (!canJoin && !live.has(lot.id)) {
    return (
      <Page width="narrow">
        <Breadcrumb items={[{ label: 'Leilões', to: '/leiloes' }, { label: auction.title, to: `/leiloes/${auction.id}` }, { label: `Lote ${pad(lot.number)}` }]} />
        <Notice tone="warn" title="A sala deste lote não está aberta">
          {lot.status === 'CANCELLED' ? 'Este lote foi cancelado pelo leiloeiro.' : lot.status === 'WAITING' ? 'O leilão ainda não começou.' : 'Este lote já foi encerrado.'}
        </Notice>
        <div><Link to={`/leiloes/${auction.id}`} className={btn('secondary')}>Voltar ao leilão</Link></div>
      </Page>
    );
  }

  const s = live.get(lot);
  const W = wallets.BIDDER;
  const remaining = s.endsAt - live.now;
  const urgent = !s.closed && remaining < ANTI_SNIPE_MS;
  const top = s.bids[s.bids.length - 1];
  const min = live.minBid(s, lot);
  const typed = parseMoney(value);
  const quick = [min, min + lot.minimumIncrement, min + lot.minimumIncrement * 3];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const err = await live.placeBid(lot.id, typed);
    setSubmitting(false);
    setError(err ?? '');
    if (!err) setValue('');
  };

  return (
    <Page>
      <Breadcrumb items={[{ label: 'Leilões', to: '/leiloes' }, { label: auction.title, to: `/leiloes/${auction.id}` }, { label: `Lote ${pad(lot.number)}` }]} />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <section className="flex flex-col gap-6">
          <Artwork src={lot.imageUrl} alt={`${lot.title}, de ${lot.artist}`} className="aspect-[4/5] max-h-[640px]" />
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[13px] text-muted">Lote {pad(lot.number)} · {auction.title}</span>
            <h1 className="break-words text-[30px] leading-[1.05] font-extrabold tracking-tight text-balance sm:text-[36px] md:text-[44px]">{lot.title}</h1>
            <span className="text-[17px] text-body">{lot.artist}</span>
          </div>
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-6 gap-y-4 border-t border-line pt-5">
            <Stat label="Lance inicial" value={BRL(lot.startingBid)} />
            <Stat label="Incremento mínimo" value={BRL(lot.minimumIncrement)} />
            <Stat label="Data da obra" value={lot.date} />
            <Stat label="ID externo" value={lot.externalId} />
          </dl>
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <div className="flex min-w-0 flex-col gap-5 rounded-[4px] border border-line bg-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                {s.closed ? (
                  <span className="text-xs font-bold tracking-[0.1em] text-body uppercase">Encerrado</span>
                ) : (
                  <span className="flex items-center gap-2 text-xs font-bold tracking-[0.1em] text-live uppercase"><LiveDot />Ao vivo</span>
                )}
                <span className="text-[13px] text-muted">{s.closed ? 'Resultado registrado' : urgent ? 'Reta final: lances prorrogam o lote' : s.connected ? 'Conectado à sala ao vivo' : 'Conectando à sala ao vivo…'}</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span aria-live="off" className={`font-mono text-[40px] leading-none font-medium ${urgent ? 'text-accent' : ''}`}>{s.closed ? '00:00' : countdown(remaining)}</span>
                <span className="text-xs text-muted">Encerra às {clock(s.endsAt)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-line pt-5">
              <span className="text-[13px] text-muted">{s.closed ? 'Valor final' : top ? 'Lance atual' : 'Lance inicial'}</span>
              <span aria-live="polite" className="break-all font-mono text-[32px] leading-tight font-medium tracking-tight sm:text-[40px]">{BRL(top?.amount ?? lot.startingBid)}</span>
              <span className="text-[13px] text-muted">{s.bids.length} lances registrados</span>
            </div>

            {s.notice && !s.closed && <Notice tone="warn">{s.notice}</Notice>}
            {s.leading && <Notice tone="ok" title="Você lidera este lote">Seu lance de {BRL(s.myBid)} está reservado na carteira.</Notice>}
            {s.outbid && !s.closed && <Notice tone="error" title="Você foi superado">Sua reserva voltou ao saldo disponível. Oferte de novo para retomar a liderança.</Notice>}

            {!s.closed ? (
              <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="bid" className="text-sm font-semibold">Seu lance</label>
                  <span className="text-[13px] text-muted">Mínimo {BRL(min)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {quick.map((v) => (
                    <Button key={v} variant="ghost" size="md" disabled={s.leading} className="font-mono text-[13px] font-normal" onClick={() => { setValue(plain(v)); setError(''); }}>
                      {BRLshort(v)}
                    </Button>
                  ))}
                </div>
                <MoneyInput id="bid" large value={value} disabled={s.leading} placeholder={plain(min)} invalid={!!error} onChange={(e) => { setValue(e.target.value); setError(''); }} />
                {error && <span role="alert" className="text-sm leading-snug text-live">{error}</span>}
                <Button type="submit" size="xl" disabled={s.leading} loading={submitting} className="font-bold">
                  {submitting ? 'Enviando lance…' : s.leading ? 'Você está liderando' : !Number.isNaN(typed) && typed > 0 ? `Dar lance de ${BRL(typed)}` : 'Dar lance'}
                </Button>
                <span className="text-[13px] leading-snug text-muted">
                  O valor fica reservado na sua carteira enquanto você lidera. Se outro licitante superar, a reserva volta ao saldo disponível.
                </span>
              </form>
            ) : (
              <div className="flex flex-col gap-3.5 border-t border-line pt-5">
                <strong className="text-[26px] leading-tight font-extrabold tracking-tight">
                  {s.result === 'WON' ? 'Você arrematou este lote' : s.result === 'UNSOLD' ? 'Lote encerrado sem lances' : 'Lote encerrado'}
                </strong>
                <span className="text-[15px] leading-relaxed text-body">
                  {s.result === 'WON'
                    ? `Valor final ${BRL(top!.amount)}, debitado do saldo comprometido. O comprovante já está disponível.`
                    : s.result === 'SOLD' ? `Vendido por ${BRL(top!.amount)} a outro licitante.` : 'Nenhum lance foi registrado.'}
                </span>
                <div className="flex flex-wrap gap-2.5">
                  <Link to={`/lotes/${lot.id}/comprovante`} className={btn('primary')}>Ver comprovante</Link>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 rounded-[2px] bg-page px-4 py-3.5">
              <div className="flex flex-col gap-0.5"><span className="text-xs text-muted">Disponível</span><span className="font-mono text-[15px]">{BRL(W.availableBalance)}</span></div>
              <div className="flex flex-col gap-0.5"><span className="text-xs text-muted">Reservado em lances</span><span className="font-mono text-[15px]">{BRL(W.committedBalance)}</span></div>
            </div>
          </div>

          <div className="flex flex-col rounded-[4px] border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="text-[15px] font-bold">Histórico de lances</span>
              <span className="text-xs text-muted">Atualizado ao vivo</span>
            </div>
            <ol className="max-h-[320px] overflow-auto">
              {s.bids.length === 0 && <li className="px-5 py-6 text-sm text-muted">Nenhum lance ainda. O primeiro lance deve ser de pelo menos {BRL(lot.startingBid)}.</li>}
              {[...s.bids].reverse().map((b) => (
                <li key={b.seq} className={`grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-soft px-5 py-3 ${b.mine ? 'bg-ok-bg/50' : ''}`}>
                  <span className="font-mono text-xs text-muted">#{b.seq}</span>
                  <div className="flex flex-col"><span className={`text-sm ${b.mine ? 'font-bold' : ''}`}>{b.bidder}</span><span className="text-xs text-muted">{clock(b.at)}</span></div>
                  <span className={`font-mono text-[15px] ${b.mine ? 'font-bold' : ''}`}>{BRL(b.amount)}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </Page>
  );
}
