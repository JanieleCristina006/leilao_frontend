import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { apiRequest, responseObject } from '../lib/api';
import { mapAuction, mapLot } from '../lib/api-mappers';
import { BRL, fmtDateTime } from '../lib/format';
import { Artwork, Badge, Button, Eyebrow, LoadingState, Notice, Page, btn } from '../components/ui';
import NotFound from './NotFound';

type ReceiptData = Record<string, unknown>;
const object = (value: unknown): ReceiptData => value && typeof value === 'object' && !Array.isArray(value) ? value as ReceiptData : {};

export default function Receipt() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { lots, auctions, loading: appLoading } = useApp();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const autoPrintStarted = useRef(false);
  const shouldAutoPrint = searchParams.get('download') === 'pdf';

  useEffect(() => {
    let active = true;
    autoPrintStarted.current = false;
    setLoading(true);
    setReceipt(null);
    setError('');
    apiRequest<unknown>(`/lots/${encodeURIComponent(id)}/receipt`)
      .then((payload) => { if (active) setReceipt(responseObject(payload)); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o comprovante.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    document.body.classList.add('receipt-page');
    return () => document.body.classList.remove('receipt-page');
  }, []);

  const receiptLot = object(receipt?.lot ?? receipt?.lotSnapshot);
  const receiptAuction = object(receipt?.auction ?? receipt?.auctionSnapshot ?? receiptLot.auction);
  const resultData = object(receipt?.result);
  const lot = receiptLot.id ? mapLot(receiptLot)
    : lots.find((item) => item.id === id) ?? (receipt && (receipt.lotId || receipt.lotTitle || receipt.lotTitleSnapshot)
      ? mapLot({
        id: receipt.lotId ?? id,
        auctionId: receipt.auctionId ?? receiptAuction.id,
        title: receipt.lotTitle ?? receipt.lotTitleSnapshot ?? receipt.title,
        description: receipt.lotDescription ?? receipt.lotDescriptionSnapshot ?? receipt.description,
        imageUrl: receipt.lotImageUrl ?? receipt.lotImageUrlSnapshot ?? receipt.imageUrl,
        startingBid: receipt.startingBid,
        currentBid: receipt.finalAmount ?? receipt.finalPrice,
        bidCount: receipt.bidCount ?? receipt.totalBids,
        status: receipt.status ?? resultData.status ?? receipt.outcome,
        endsAt: receipt.closedAt ?? receipt.endedAt ?? receipt.endsAt,
      })
      : undefined);
  const auction = receiptAuction.id ? mapAuction(receiptAuction)
    : (lot ? auctions.find((item) => item.id === lot.auctionId) : undefined) ?? (receipt && (receipt.auctionId || receipt.auctionTitle || receipt.auctionTitleSnapshot)
      ? mapAuction({
        id: receipt.auctionId ?? receiptAuction.id,
        title: receipt.auctionTitle ?? receipt.auctionTitleSnapshot,
        status: 'FINISHED',
        startsAt: receipt.auctionStartsAt,
        endsAt: receipt.auctionEndsAt ?? receipt.closedAt,
      })
      : undefined);

  const canShowReceipt = !!lot && !!auction && !loading;
  const printReceipt = () => {
    if (!lot) return;
    const previousTitle = document.title;
    document.title = `Comprovante - ${lot.title}`;
    window.print();
    document.title = previousTitle;
  };

  useEffect(() => {
    if (!shouldAutoPrint || !canShowReceipt || autoPrintStarted.current || !lot) return;
    const previousTitle = document.title;
    document.title = `Comprovante - ${lot.title}`;
    const timer = window.setTimeout(() => {
      autoPrintStarted.current = true;
      window.print();
      document.title = previousTitle;
    }, 400);
    return () => window.clearTimeout(timer);
  }, [shouldAutoPrint, canShowReceipt, lot?.title]);

  if (loading || (!lot && appLoading)) return <Page width="narrow"><LoadingState label="Carregando comprovante…" /></Page>;
  if (!lot || !auction) return error ? <Page width="narrow"><Notice tone="error">{error}</Notice></Page> : <NotFound />;

  const status = String(receipt?.status ?? resultData.status ?? receipt?.outcome ?? (typeof receipt?.result === 'string' ? receipt.result : lot.status)).toUpperCase();
  const sold = status === 'SOLD' || status === 'WON';
  const finalAmount = Number(receipt?.finalAmount ?? receipt?.finalPrice ?? receipt?.winningAmount ?? resultData.finalAmount ?? resultData.finalPrice ?? lot.currentBid ?? 0);
  const bidCount = Number(receipt?.bidCount ?? receipt?.totalBids ?? receipt?.acceptedBidCount ?? lot.bidCount);
  const lastHash = String(receipt?.lastBidHash ?? receipt?.lastHash ?? receipt?.hashAnchor ?? receipt?.lastHashSnapshot ?? '');
  const closedAt = String(receipt?.closedAt ?? receipt?.endedAt ?? receipt?.endsAt ?? lot.endsAt);
  return (
    <Page width="narrow">
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Eyebrow>Comprovante público</Eyebrow>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" size="md" onClick={printReceipt}>Baixar PDF</Button>
          <Link to={`/lotes/${lot.id}/auditoria`} className={btn('primary', 'md')}>Verificar auditoria</Link>
        </div>
      </div>

      <div className="receipt-print">
        <article className="receipt-document flex flex-col gap-8 rounded-[4px] border border-line bg-surface p-6 md:p-10">
          <h2 className="receipt-print-heading text-xl font-bold">Comprovante público</h2>
          <div className="receipt-summary-grid grid items-start gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Artwork src={lot.imageUrl} alt={lot.title} className="aspect-square" />
            <div className="flex min-w-0 flex-col gap-3.5">
              <Badge status={sold ? 'SOLD' : 'UNSOLD'} />
              <h1 className="text-[36px] leading-[1.05] font-extrabold tracking-tight text-balance md:text-[40px]">{lot.title}</h1>
              <div className="mt-2 flex flex-col gap-1 border-t border-ink pt-4">
                <span className="text-[13px] text-muted">Valor final</span>
                <span className="font-mono text-[40px] font-medium tracking-tight">{BRL(sold ? finalAmount : 0)}</span>
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-8 gap-y-5 border-t border-line pt-6">
            <Item label="Leilão" value={auction.title} />
            <Item label="Encerrado em" value={fmtDateTime(closedAt)} />
            <Item label="Lances aceitos" value={String(bidCount)} />
            <Item label="Lance inicial" value={BRL(lot.startingBid)} mono />
            <div className="col-span-full flex flex-col gap-1">
              <dt className="text-xs text-muted">Hash do último lance (SHA-256)</dt>
              <dd className="m-0 font-mono text-[13px] break-all text-body">{lastHash || 'Sem lances registrados'}</dd>
            </div>
          </dl>
        </article>
        <p className="max-w-[640px] text-[13px] leading-relaxed text-muted">
          Este comprovante usa os dados públicos registrados pela API. Nome, e-mail e identificação do vencedor não são exibidos.
        </p>
      </div>
    </Page>
  );
}

function Item({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`m-0 text-[15px] ${mono ? 'font-mono' : 'font-semibold'}`}>{value}</dd>
    </div>
  );
}
