import { useState, type FormEvent } from 'react';
import { useApp } from '../store/AppContext';
import { BRL, BRLshort, fmtShortDateTime, parseMoney, plain } from '../lib/format';
import { ROLE_LABEL, TX } from '../lib/status';
import { Button, MoneyInput, Page, PageTitle, SectionTitle } from '../components/ui';

export default function WalletPage() {
  const { session, wallets, deposit, notify } = useApp();
  const isBidder = session?.role === 'BIDDER';
  const W = wallets[isBidder ? 'BIDDER' : 'AUCTIONEER'];
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitDeposit = async (e: FormEvent) => {
    e.preventDefault();
    const v = parseMoney(amount);
    if (Number.isNaN(v) || v <= 0) return setError('O valor do depósito precisa ser maior que zero.');
    setSubmitting(true);
    const failure = await deposit(v);
    setSubmitting(false);
    if (failure) return setError(failure);
    setAmount('');
    notify(`Depósito de ${BRL(v)} adicionado ao saldo disponível.`);
  };

  const cells = [
    { label: 'Saldo disponível', value: W.availableBalance, hint: 'Pode ser usado em novos lances.' },
    { label: 'Comprometido', value: W.committedBalance, hint: 'Reservado nos lotes em que você lidera.' },
    { label: 'Total', value: W.totalBalance ?? W.availableBalance + W.committedBalance, hint: 'Disponível + comprometido.', muted: true },
  ];

  return (
    <Page>
      <PageTitle eyebrow={session ? ROLE_LABEL[session.role] : ''} title="Carteira" />
      <div className="grid border-y border-t-ink border-b-line sm:grid-cols-3">
        {cells.map((c, i) => (
          <div key={c.label} className={`flex flex-col gap-2 py-6 ${i ? 'border-line sm:border-l sm:pl-6' : 'sm:pr-6'} ${i ? 'border-t sm:border-t-0' : ''}`}>
            <span className="text-sm font-semibold">{c.label}</span>
            <span className={`font-mono text-[32px] font-medium tracking-tight md:text-[36px] ${c.muted ? 'text-muted' : ''}`}>{BRL(c.value)}</span>
            <span className="text-[13px] text-muted">{c.hint}</span>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {isBidder ? (
          <form onSubmit={submitDeposit} className="flex flex-col gap-4.5 rounded-[4px] border border-line bg-surface p-7" noValidate>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[28px] font-extrabold tracking-tight">Depositar</h2>
              <span className="text-sm leading-snug text-muted">Depósito simulado: nenhum dinheiro real é movimentado. O valor entra no saldo disponível.</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[500, 1000, 5000].map((v) => (
                <Button key={v} variant="ghost" size="md" className="font-mono text-[13px] font-normal" onClick={() => { setAmount(plain(v)); setError(''); }}>{BRLshort(v)}</Button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="deposit" className="text-sm font-semibold">Valor</label>
              <MoneyInput id="deposit" value={amount} invalid={!!error} onChange={(e) => { setAmount(e.target.value); setError(''); }} />
              {error && <span role="alert" className="text-[13px] text-live">{error}</span>}
            </div>
            <Button type="submit" size="xl" loading={submitting}>{submitting ? 'Processando…' : 'Depositar'}</Button>
          </form>
        ) : (
          <div className="flex flex-col gap-2.5 rounded-[4px] border border-line bg-surface p-7">
            <h2 className="text-[28px] font-extrabold tracking-tight">Recebimentos</h2>
            <p className="text-[15px] leading-relaxed text-body">
              Quando um lote seu é vendido, o valor arrematado é creditado no seu saldo disponível automaticamente. Depósitos são exclusivos de licitantes.
            </p>
          </div>
        )}

        <section className="flex flex-col gap-3">
          <SectionTitle aside="Mais recentes primeiro">Extrato</SectionTitle>
          <ul aria-label="Movimentações da carteira" className="max-h-[420px] overflow-y-auto overscroll-contain border-t border-line pr-3">
            {W.transactions.map((t) => {
              const m = TX[t.type];
              const incoming = t.type === 'DEPOSIT' || t.type === 'AUCTION_EARNING';
              const outgoing = t.type === 'AUCTION_PAYMENT';
              const rowTone = incoming ? 'border-l-4 border-l-ok bg-ok-bg/45 pl-3' : outgoing ? 'border-l-4 border-l-live bg-live-bg/45 pl-3' : '';
              const amountTone = incoming ? 'bg-ok-bg text-ok ring-1 ring-ok/30' : outgoing ? 'bg-live-bg text-live ring-1 ring-live/30' : 'bg-soft text-ink';
              return (
                <li key={t.id} className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-b border-line py-4 ${rowTone}`}>
                  <span className="text-[15px] font-semibold">{m.label}</span>
                  <span className={`inline-flex items-center justify-self-end rounded-[2px] px-2.5 py-1 text-right font-mono text-[15px] font-bold ${amountTone}`}>{m.sign}{BRL(Math.abs(t.amount))}</span>
                  <span className="text-[13px] text-muted">{t.description} · {fmtShortDateTime(t.createdAt)}</span>
                  <span className="text-right text-[13px] text-muted">{m.effect}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Page>
  );
}
