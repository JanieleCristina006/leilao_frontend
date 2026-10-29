import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Artwork, Button, EmptyState, LoadingState, Notice, Page, PageTitle, SectionTitle, btn } from '../components/ui';
import { Modal } from '../components/Modal';
import { BRL, fmtShortDateTime } from '../lib/format';
import { TX } from '../lib/status';
import { useApp } from '../store/AppContext';
import { apiRequest } from '../lib/api';
import type { Transaction } from '../types';

export default function MyWins() {
  const { wallets, lots, auctions, loading, notify } = useApp();
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const wins = wallets.BIDDER.transactions
    .filter((transaction) => transaction.type === 'AUCTION_PAYMENT')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const total = wins.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const selectedLot = selected?.lotId ? lots.find((lot) => lot.id === selected.lotId) : undefined;
  const selectedAuction = selectedLot ? auctions.find((auction) => auction.id === selectedLot.auctionId) : undefined;
  const selectedTitle = selectedLot?.title ?? selected?.lotTitle ?? selected?.description ?? TX.AUCTION_PAYMENT.label;
  const selectedImage = selectedLot?.imageUrl ?? selected?.lotImageUrl ?? '';
  const selectedArtist = selectedLot?.artist ?? selected?.lotArtist;
  const selectedAuctionTitle = selectedAuction?.title ?? selected?.auctionTitle;

  if (loading && wallets.BIDDER.transactions.length === 0) {
    return <Page><PageTitle eyebrow="Licitante" title="Meus arremates" /><LoadingState label="Carregando seus arremates…" /></Page>;
  }

  const downloadReceipt = async () => {
    if (!selected?.lotId) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const receipt = await apiRequest<unknown>(`/lots/${encodeURIComponent(selected.lotId)}/receipt`);
      const file = new Blob([`${JSON.stringify(receipt, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      const safeId = selected.lotId.replace(/[^a-z0-9_-]/gi, '_');
      anchor.href = url;
      anchor.download = `comprovante-arremate-${safeId}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Comprovante baixado.');
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Não foi possível baixar o comprovante.');
    } finally {
      setDownloading(false);
    }
  };

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
        {wins.length ? (
          <ul className="border-t border-line">
            {wins.map((transaction) => (
              <li key={transaction.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-b border-line py-5">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[15px] font-semibold">{transaction.lotTitle ?? transaction.description ?? TX.AUCTION_PAYMENT.label}</span>
                  <span className="text-[13px] text-muted">Arrematado em {fmtShortDateTime(transaction.createdAt)}</span>
                </div>
                <span className="text-right font-mono text-[15px] font-semibold text-live">− {BRL(Math.abs(transaction.amount))}</span>
                <Button variant="ghost" size="sm" className="col-span-2 w-fit" onClick={() => setSelected(transaction)}>Ver detalhes</Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-t border-line">
            <EmptyState>Seus lotes arrematados aparecerão aqui depois que o pagamento for registrado.</EmptyState>
            <div className="-mt-8 flex justify-center">
              <Link to="/leiloes" className={`${btn('secondary', 'md')} no-underline`}>Explorar leilões</Link>
            </div>
          </div>
        )}
      </section>

      <Modal open={!!selected} size="wide" title={selectedTitle} onClose={() => setSelected(null)}
        footer={<>
          {selected?.lotId && <Button variant="secondary" size="md" loading={downloading} onClick={downloadReceipt}>{downloading ? 'Baixando…' : 'Baixar comprovante'}</Button>}
          {selected?.lotId && <Link to={`/lotes/${encodeURIComponent(selected.lotId)}/comprovante`} className={`${btn('secondary', 'md')} no-underline`}>Ver comprovante</Link>}
          <Button variant="primary" size="md" onClick={() => setSelected(null)}>Fechar</Button>
        </>}>
        {selected && (
          <div className="flex flex-col gap-4">
            {downloadError && <Notice tone="error">{downloadError}</Notice>}
            <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              {selectedImage ? (
                <Artwork src={selectedImage} alt={selectedTitle} className="aspect-[4/5] max-h-[420px]" />
              ) : (
                <div className="flex aspect-[4/5] max-h-[420px] items-center justify-center rounded-[2px] bg-neutral-bg px-6 text-center text-sm text-muted">Imagem da obra indisponível</div>
              )}
              <div className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Arremate confirmado</span>
                  {selectedArtist && <span className="text-[15px] text-body">{selectedArtist}</span>}
                </div>
                <div className="flex flex-col gap-1 border-t border-line pt-4">
                  <span className="text-[13px] text-muted">Valor pago</span>
                  <span className="font-mono text-[32px] font-medium tracking-tight">{BRL(Math.abs(selected.amount))}</span>
                </div>
                <dl className="flex flex-col gap-4 border-t border-line pt-4">
                  <Detail label="Data do arremate" value={fmtShortDateTime(selected.createdAt)} />
                  {selectedAuctionTitle && <Detail label="Leilão" value={selectedAuctionTitle} />}
                  {selectedLot?.number != null && <Detail label="Número do lote" value={String(selectedLot.number)} />}
                  {selectedLot?.description && <Detail label="Descrição" value={selectedLot.description} />}
                </dl>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Page>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="m-0 text-sm leading-relaxed text-body">{value}</dd>
    </div>
  );
}
