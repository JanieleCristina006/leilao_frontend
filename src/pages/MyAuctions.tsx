import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { BRL, fmtPeriod } from '../lib/format';
import { Artwork, Badge, Button, EmptyState, LoadingState, Page, PageTitle, SectionTitle, btn } from '../components/ui';
import { Modal } from '../components/Modal';

type Confirm = { title: string; body: string; label: string; danger: boolean; run?: () => void | Promise<void> };

export default function MyAuctions() {
  const { auctions, lots, loading, deleteAuction, cancelLot, notify } = useApp();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const mine = auctions;
  const myLots = lots;
  const lotCount = (id: string) => lots.filter((l) => l.auctionId === id).length;
  const th = 'border-b border-line py-3 px-3 font-semibold first:pl-0 last:pr-0';
  const td = 'border-b border-line py-3.5 px-3 first:pl-0 last:pr-0';

  if (loading && !auctions.length && !lots.length) {
    return <Page><PageTitle eyebrow="Leiloeiro" title="Meus leilões" /><LoadingState label="Carregando seus leilões…" /></Page>;
  }

  return (
    <Page>
      <PageTitle eyebrow="Leiloeiro" title="Meus leilões" actions={<>
        <Link to="/leiloeiro/lotes/novo" className={btn('secondary')}>Adicionar lote</Link>
        <Link to="/leiloeiro/leiloes/novo" className={btn('primary')}>Novo leilão</Link>
      </>} />

      <section className="flex flex-col gap-3">
        <SectionTitle>Leilões</SectionTitle>
        {mine.length === 0 ? <EmptyState>Você ainda não criou leilões.</EmptyState> : (
          <div className="overflow-x-auto border-t border-ink">
            <table className="w-full min-w-[760px] border-collapse text-[15px]">
              <thead><tr className="text-left text-xs text-muted"><th className={th}>Leilão</th><th className={th}>Período</th><th className={th}>Situação</th><th className={th}>Lotes</th><th className={`${th} text-right`}>Ações</th></tr></thead>
              <tbody>
                {mine.map((a) => {
                  const n = lotCount(a.id);
                  return (
                    <tr key={a.id}>
                      <td className={`${td} font-semibold`}>{a.title}</td>
                      <td className={`${td} text-body`}>{a.status === 'DRAFT' ? 'Sem publicação' : fmtPeriod(a.startsAt, a.endsAt)}</td>
                      <td className={td}><Badge status={a.status} /></td>
                      <td className={`${td} font-mono`}>{n}</td>
                      <td className={td}>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => nav(`/leiloeiro/leiloes/${a.id}/editar`)}>Editar</Button>
                          <Button variant="ghost" size="sm" className={n ? 'text-disabled' : 'text-live'} title={n ? 'Remova os lotes antes de excluir' : 'Excluir leilão'}
                            onClick={() => setConfirm(n
                              ? { title: 'Não é possível excluir', body: `"${a.title}" tem ${n} lote(s) vinculado(s). Remova ou cancele os lotes antes de excluir o leilão.`, label: 'Entendi', danger: false }
                              : { title: 'Excluir leilão?', body: `"${a.title}" será removido permanentemente.`, label: 'Excluir', danger: true, run: async () => { const error = await deleteAuction(a.id); notify(error ?? 'Leilão excluído.', error ? 'error' : 'success'); } })}>
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle aside="Só é possível cancelar lotes que ainda não receberam lances.">Lotes</SectionTitle>
        <div className="overflow-x-auto border-t border-ink">
          <table className="w-full min-w-[820px] border-collapse text-[15px]">
            <thead><tr className="text-left text-xs text-muted"><th className={th}>Lote</th><th className={th}>Leilão</th><th className={th}>Lance atual</th><th className={th}>Lances</th><th className={th}>Situação</th><th className={`${th} text-right`}>Ações</th></tr></thead>
            <tbody>
              {myLots.map((l) => {
                const bids = l.bidCount;
                const cant = bids > 0 || !['OPEN', 'WAITING'].includes(l.status);
                const auction = mine.find((a) => a.id === l.auctionId)!;
                return (
                  <tr key={l.id}>
                    <td className={td}><div className="flex items-center gap-3"><Artwork src={l.imageUrl} alt="" className="size-11 flex-none" /><span className="font-semibold">{l.title}</span></div></td>
                    <td className={`${td} text-body`}>{auction.title}</td>
                    <td className={`${td} font-mono`}>{l.currentBid != null ? BRL(l.currentBid) : '—'}</td>
                    <td className={`${td} font-mono`}>{bids}</td>
                    <td className={td}><Badge status={l.status} /></td>
                    <td className={`${td} text-right`}>
                      <Button variant="ghost" size="sm" disabled={cant} title={cant ? (bids > 0 ? 'Lotes com lances não podem ser cancelados' : 'Lote já encerrado') : 'Cancelar lote'}
                        onClick={() => setConfirm({ title: 'Cancelar lote?', body: `"${l.title}" ainda não recebeu lances. Depois de cancelado, não volta a aceitar ofertas.`, label: 'Cancelar lote', danger: true, run: async () => { const error = await cancelLot(l.id); notify(error ?? 'Lote cancelado.', error ? 'error' : 'success'); } })}>
                        Cancelar lote
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={!!confirm} title={confirm?.title ?? ''} onClose={() => setConfirm(null)}
        footer={<>
          {confirm?.run && <Button variant="ghost" size="md" onClick={() => setConfirm(null)}>Voltar</Button>}
          <Button variant={confirm?.danger ? 'danger' : 'primary'} size="md" onClick={async () => { await confirm?.run?.(); setConfirm(null); }}>{confirm?.label}</Button>
        </>}>
        <p className="text-[15px] leading-relaxed text-body">{confirm?.body}</p>
      </Modal>
    </Page>
  );
}
