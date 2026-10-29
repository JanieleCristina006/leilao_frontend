import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Artwork as Art } from '../types';
import { useApp } from '../store/AppContext';
import { BRL, hasTwoDecimalsMax, parseMoney } from '../lib/format';
import { STATUS } from '../lib/status';
import { Artwork, Breadcrumb, Button, Eyebrow, Field, LoadingState, MoneyInput, Notice, Page, PageTitle, TextInput, inputCls } from '../components/ui';

type SearchState = { status: 'idle' | 'loading' | 'done' | 'error'; results: Art[]; message?: string };

export default function LotForm() {
  const { auctions, addLot, searchArtworks, notify } = useApp();
  const nav = useNavigate();
  const options = auctions.filter((a) => a.status !== 'FINISHED' && a.status !== 'CANCELLED');

  const [q, setQ] = useState('');
  const [search, setSearch] = useState<SearchState>({ status: 'idle', results: [] });
  const [picked, setPicked] = useState<Art | null>(null);

  const [auctionId, setAuctionId] = useState(options[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [externalId, setExternalId] = useState('');
  const [startingBid, setStartingBid] = useState('');
  const [increment, setIncrement] = useState('1,00');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auctionId && options[0]) setAuctionId(options[0].id);
  }, [auctionId, options[0]?.id]);

  const runSearch = async (term: string) => {
    if (!term.trim()) return setSearch({ status: 'error', results: [], message: 'Informe o nome de uma obra ou artista.' });
    setQ(term);
    setSearch({ status: 'loading', results: [] });
    try {
      const results = await searchArtworks(term.trim());
      setSearch({ status: 'done', results });
    } catch (error) {
      setSearch({ status: 'error', results: [], message: error instanceof Error ? error.message : 'Não foi possível buscar obras agora.' });
    }
  };

  const pick = (a: Art) => {
    setPicked(a);
    setTitle(a.title);
    setImageUrl(a.img);
    setExternalId(a.id);
    setDescription((d) => d || `${a.artist}, ${a.date}.`);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    const start = parseMoney(startingBid);
    const inc = Number.isNaN(parseMoney(increment)) ? 1 : parseMoney(increment);
    if (!auctionId) er.auctionId = 'Escolha um leilão.';
    if (!title.trim()) er.title = 'O título é obrigatório.';
    if (Number.isNaN(start) || start < 0) er.startingBid = 'Informe um lance inicial igual ou maior que zero.';
    else if (!hasTwoDecimalsMax(start)) er.startingBid = 'Use no máximo duas casas decimais.';
    if (inc <= 0 || !hasTwoDecimalsMax(inc)) er.increment = 'Informe um incremento positivo com até duas casas decimais.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSubmitting(true);
    const failure = await addLot({
      auctionId,
      title: title.trim(),
      description: description.trim(),
      imageUrl,
      externalId,
      startingBid: start,
      minimumIncrement: inc,
    });
    setSubmitting(false);
    if (failure) return setErrors({ form: failure });
    notify('Lote cadastrado.');
    nav('/leiloeiro/leiloes');
  };

  const start = parseMoney(startingBid);
  const inc = parseMoney(increment);

  return (
    <Page>
      <Breadcrumb items={[{ label: 'Meus leilões', to: '/leiloeiro/leiloes' }, { label: 'Novo lote' }]} />
      <PageTitle title="Novo lote" />

      <section className="flex flex-col gap-4 border-t border-ink pt-6">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-muted">Passo 1 de 2 · opcional</span>
          <h2 className="text-[28px] font-extrabold tracking-tight">Buscar obra no Art Institute of Chicago</h2>
          <span className="text-sm text-muted">Ao escolher uma obra, título, imagem e ID externo são preenchidos automaticamente.</span>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void runSearch(q); }} className="flex flex-wrap gap-2" role="search">
          <TextInput aria-label="Nome da obra ou do artista" placeholder="Nome da obra ou do artista" value={q} onChange={(e) => setQ(e.target.value)} className="min-w-[220px] flex-1" />
          <Button type="submit" loading={search.status === 'loading'}>{search.status === 'loading' ? 'Buscando…' : 'Buscar'}</Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-muted">Sugestões:</span>
          {['Monet', 'Hokusai', 'Van Gogh', 'Vermeer'].map((s) => (
            <button type="button" key={s} onClick={() => void runSearch(s)} className="h-8 rounded-full border border-field px-3 text-[13px] hover:bg-soft">{s}</button>
          ))}
        </div>
        {search.status === 'loading' && <LoadingState label="Buscando obras…" compact />}
        {search.status === 'error' && <Notice tone="error">{search.message} Você pode preencher o lote manualmente abaixo.</Notice>}
        {search.status === 'done' && !search.results.length && <p className="text-[15px] text-muted">Nenhuma obra com imagem encontrada para essa busca.</p>}
        {search.results.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,170px),1fr))] gap-4">
            {search.results.map((a) => {
              const on = picked?.id === a.id;
              return (
                <button key={a.id} onClick={() => pick(a)} aria-pressed={on}
                  className={`flex flex-col gap-2 rounded-[4px] border-2 p-2 text-left ${on ? 'border-ink bg-surface' : 'border-transparent hover:bg-soft'}`}>
                  <Artwork src={a.img} alt="" className="aspect-square" />
                  <span className="text-sm leading-snug font-semibold">{a.title}</span>
                  <span className="text-xs text-muted">{a.artist}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-ink pt-6">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-muted">Passo 2 de 2</span>
          <h2 className="text-[28px] font-extrabold tracking-tight">Dados do lote</h2>
        </div>
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <form onSubmit={submit} className="flex min-w-0 flex-col gap-5" noValidate>
            {errors.form && <p role="alert" className="text-sm text-live">{errors.form}</p>}
            <Field id="l-auction" label="Leilão" required error={errors.auctionId}>
              <select id="l-auction" value={auctionId} onChange={(e) => setAuctionId(e.target.value)} className={`${inputCls} border-field`}>
                {options.length === 0 && <option value="">Crie um leilão primeiro</option>}
                {options.map((a) => <option key={a.id} value={a.id}>{a.title} · {STATUS[a.status].label}</option>)}
              </select>
            </Field>
            <Field id="l-title" label="Título" required error={errors.title}>
              <TextInput id="l-title" value={title} invalid={!!errors.title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field id="l-desc" label="Descrição" optional>
              <textarea id="l-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} h-auto resize-y border-field py-3 leading-relaxed`} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="l-img" label="URL da imagem" optional>
                <TextInput id="l-img" placeholder="https://" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="text-sm" />
              </Field>
              <Field id="l-ext" label="ID externo" optional>
                <TextInput id="l-ext" placeholder="Preenchido pela busca" value={externalId} onChange={(e) => setExternalId(e.target.value)} className="bg-page font-mono text-sm" />
              </Field>
              <Field id="l-start" label="Lance inicial" required error={errors.startingBid}>
                <MoneyInput id="l-start" value={startingBid} invalid={!!errors.startingBid} onChange={(e) => setStartingBid(e.target.value)} />
              </Field>
              <Field id="l-inc" label="Incremento mínimo" hint="Padrão: R$ 1,00" error={errors.increment}>
                <MoneyInput id="l-inc" value={increment} invalid={!!errors.increment} onChange={(e) => setIncrement(e.target.value)} />
              </Field>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-6">
              <Button variant="ghost" onClick={() => nav('/leiloeiro/leiloes')}>Cancelar</Button>
              <Button type="submit" disabled={!options.length} loading={submitting}>{submitting ? 'Cadastrando…' : 'Cadastrar lote'}</Button>
            </div>
          </form>
          <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
            <Eyebrow>Como o licitante verá</Eyebrow>
            {imageUrl ? <Artwork src={imageUrl} alt="" className="aspect-square" /> : <div className="flex aspect-square items-center justify-center rounded-[2px] bg-neutral-bg text-sm text-body">Sem imagem</div>}
            <h3 className="text-[24px] leading-tight font-extrabold tracking-tight">{title || 'Título do lote'}</h3>
            <div className="flex items-baseline justify-between border-t border-line pt-2.5"><span className="text-[13px] text-muted">Lance inicial</span><span className="font-mono">{Number.isNaN(start) ? 'R$ —' : BRL(start)}</span></div>
            <div className="flex items-baseline justify-between"><span className="text-[13px] text-muted">Incremento</span><span className="font-mono text-sm">{BRL(Number.isNaN(inc) ? 1 : inc)}</span></div>
          </aside>
        </div>
      </section>
    </Page>
  );
}
