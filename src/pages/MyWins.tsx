import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Artwork, Button, EmptyState, LoadingState, Notice, Page, PageTitle, SectionTitle, btn } from '../components/ui';
import { Modal } from '../components/Modal';
import { BRL, fmtShortDateTime } from '../lib/format';
import { TX } from '../lib/status';
import { useApp } from '../store/AppContext';
import { apiRequest, responseList } from '../lib/api';

type ApiRecord = Record<string, unknown>;
const object = (value: unknown): ApiRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as ApiRecord : {};
const firstText = (...values: unknown[]) => values.find((value): value is string => typeof value === 'string' && !!value.trim()) ?? '';
type Win = {
  receiptId: string;
  issuedAt: string;
  finalAmount: number;
  sharePath: string;
  lot: { id: string; title: string; description: string; imageUrl: string };
  auction: { title: string };
};

export default function MyWins() {
  const { session } = useApp();
  const [wins, setWins] = useState<Win[]>([]);
  const [winsLoading, setWinsLoading] = useState(true);
  const [winsError, setWinsError] = useState('');
  const [selected, setSelected] = useState<Win | null>(null);

  useEffect(() => {
    if (!session?.token) {
      setWins([]);
      setWinsError('');
      setWinsLoading(false);
      return;
    }
    let active = true;
    setWinsLoading(true);
    setWinsError('');
    apiRequest<unknown>('/bids/me/wins', { token: session.token })
      .then((payload) => {
        if (!active) return;
        const envelope = object(payload);
        const rows = Array.isArray(payload) ? payload
          : Array.isArray(envelope.data) ? envelope.data
            : Array.isArray(envelope.result) ? envelope.result
              : Array.isArray(envelope.wins) ? envelope.wins
                : responseList(payload);
        setWins(rows.map(mapWin).filter((win): win is Win => win !== null));
      })
      .catch((error) => {
        if (active) setWinsError(error instanceof Error ? error.message : 'Não foi possível carregar seus arremates.');
      })
      .finally(() => { if (active) setWinsLoading(false); });
    return () => { active = false; };
  }, [session?.token]);

  const total = wins.reduce((sum, win) => sum + Math.abs(win.finalAmount), 0);

  if (winsLoading) {
    return <Page><PageTitle eyebrow="Licitante" title="Meus arremates" /><LoadingState label="Carregando seus arremates…" /></Page>;
  }

  return (
    <Page>
      <PageTitle eyebrow="Licitante" title="Meus arremates" />

      <div className="grid border-y border-t-ink border-b-line sm:grid-cols-2">
        <div className="flex flex-col gap-2 py-6 sm:pr-6">
          <span className="text-sm font-semibold">Lotes arrematados</span>
          <span className="font-mono text-[32px] font-medium tracking-tight md:text-[36px]">{wins.length}</span>
          <span className="text-[13px] text-muted">Registrados na sua carteira.</span>
        </div>
        <div className="flex flex-col gap-2 border-t border-line py-6 sm:border-l sm:border-t-0 sm:pl-6">
          <span className="text-sm font-semibold">Total pago</span>
          <span className="font-mono text-[32px] font-medium tracking-tight md:text-[36px]">{BRL(total)}</span>
          <span className="text-[13px] text-muted">Soma das transações de arrematação.</span>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle aside="Mais recentes primeiro">Histórico</SectionTitle>
        {winsError && <Notice tone="error">{winsError}</Notice>}
        {wins.length ? (
          <ul className="border-t border-line">
            {wins.map((win) => (
              <li key={win.receiptId} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-b border-line py-5">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[15px] font-semibold">{win.lot.title || TX.AUCTION_PAYMENT.label}</span>
                  <span className="text-[13px] text-muted">{win.issuedAt ? `Arrematado em ${fmtShortDateTime(win.issuedAt)}` : 'Data do arremate não informada'}</span>
                </div>
                <span className="text-right font-mono text-[15px] font-semibold text-live">− {BRL(Math.abs(win.finalAmount))}</span>
                <Button variant="ghost" size="sm" className="col-span-2 w-fit" onClick={() => setSelected(win)}>Ver detalhes</Button>
              </li>
            ))}
          </ul>
        ) : !winsError ? (
          <div className="border-t border-line">
            <EmptyState>Seus lotes arrematados aparecerão aqui depois que o pagamento for registrado.</EmptyState>
            <div className="-mt-8 flex justify-center">
              <Link to="/leiloes" className={`${btn('secondary', 'md')} no-underline`}>Explorar leilões</Link>
            </div>
          </div>
        ) : null}
      </section>

      <Modal open={!!selected} size="wide" title={selected?.lot.title ?? ''} onClose={() => setSelected(null)}
        footer={<>
          {selected?.lot.id && <Link to={`/lotes/${encodeURIComponent(selected.lot.id)}/comprovante?download=pdf`} className={`${btn('secondary', 'md')} no-underline`}>Baixar PDF</Link>}
          {selected?.lot.id && <Link to={`/lotes/${encodeURIComponent(selected.lot.id)}/comprovante`} className={`${btn('secondary', 'md')} no-underline`}>Ver comprovante</Link>}
          <Button variant="primary" size="md" onClick={() => setSelected(null)}>Fechar</Button>
        </>}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              {selected.lot.imageUrl ? (
                <Artwork src={selected.lot.imageUrl} alt={selected.lot.title} className="aspect-[4/5] max-h-[420px]" />
              ) : (
                <div className="flex aspect-[4/5] max-h-[420px] items-center justify-center rounded-[2px] bg-neutral-bg px-6 text-center text-sm text-muted">Imagem da obra indisponível</div>
              )}
              <div className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Arremate confirmado</span>
                  {selected.auction.title && <span className="text-[15px] text-body">{selected.auction.title}</span>}
                </div>
                <div className="flex flex-col gap-1 border-t border-line pt-4">
                  <span className="text-[13px] text-muted">Valor pago</span>
                  <span className="font-mono text-[32px] font-medium tracking-tight">{BRL(Math.abs(selected.finalAmount))}</span>
                </div>
                <dl className="flex flex-col gap-4 border-t border-line pt-4">
                  {selected.issuedAt && <Detail label="Data do arremate" value={fmtShortDateTime(selected.issuedAt)} />}
                  {selected.lot.description && <Detail label="Descrição" value={selected.lot.description} />}
                </dl>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Page>
  );
}

function mapWin(value: unknown): Win | null {
  const raw = object(value);
  const lot = object(raw.lot ?? raw.lotSnapshot);
  const auction = object(raw.auction ?? raw.auctionSnapshot ?? lot.auction);
  const lotId = firstText(lot.id, raw.lotId);
  if (!lotId) return null;
  const amount = Number(raw.finalAmount ?? raw.finalPrice ?? 0);
  return {
    receiptId: firstText(raw.receiptId, raw.id, lotId),
    issuedAt: firstText(raw.issuedAt, raw.closedAt, raw.createdAt),
    finalAmount: Number.isFinite(amount) ? amount : 0,
    sharePath: firstText(raw.sharePath, `/lots/${lotId}/receipt`),
    lot: {
      id: lotId,
      title: firstText(lot.title, raw.lotTitle, 'Lote arrematado'),
      description: firstText(lot.description, raw.lotDescription),
      imageUrl: firstText(lot.imageUrl, object(lot.artwork).imageUrl, object(lot.artwork).image),
    },
    auction: { title: firstText(auction.title, raw.auctionTitle) },
  };
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="m-0 text-sm leading-relaxed text-body">{value}</dd>
    </div>
  );
}
