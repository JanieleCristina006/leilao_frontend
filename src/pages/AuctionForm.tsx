import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AuctionStatus } from '../types';
import { useApp } from '../store/AppContext';
import { toLocalInput } from '../lib/format';
import { Breadcrumb, Button, Eyebrow, Field, Page, PageTitle, TextInput, inputCls } from '../components/ui';

const STATUS_OPTS: { value: AuctionStatus; label: string; desc: string }[] = [
  { value: 'DRAFT', label: 'Rascunho', desc: 'Só você vê. Ideal para montar os lotes.' },
  { value: 'SCHEDULED', label: 'Agendado', desc: 'Visível no catálogo, sem aceitar lances.' },
  { value: 'ACTIVE', label: 'Ativo', desc: 'Aceita lances dentro do período.' },
];

export default function AuctionForm() {
  const { id } = useParams();
  const { auctions, saveAuction, notify } = useApp();
  const nav = useNavigate();
  const editing = auctions.find((a) => a.id === id);

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [startsAt, setStartsAt] = useState(editing ? toLocalInput(editing.startsAt) : '2026-11-20T18:00');
  const [endsAt, setEndsAt] = useState(editing ? toLocalInput(editing.endsAt) : '2026-11-20T21:00');
  const [status, setStatus] = useState<AuctionStatus>(editing?.status === 'FINISHED' ? 'ACTIVE' : editing?.status ?? 'SCHEDULED');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setTitle(editing.title);
    setDescription(editing.description);
    setStartsAt(toLocalInput(editing.startsAt));
    setEndsAt(toLocalInput(editing.endsAt));
    setStatus(editing.status === 'FINISHED' ? 'ACTIVE' : editing.status);
  }, [editing?.id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!title.trim()) er.title = 'O título é obrigatório.';
    if (!startsAt) er.startsAt = 'Informe a data de início.';
    if (!endsAt) er.endsAt = 'Informe a data de encerramento.';
    else if (startsAt && new Date(endsAt) <= new Date(startsAt)) er.endsAt = 'O encerramento precisa ser posterior ao início.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSubmitting(true);
    const failure = await saveAuction({
      title: title.trim(),
      description: description.trim(),
      status,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    }, editing?.id);
    setSubmitting(false);
    if (failure) return setErrors({ form: failure });
    notify(editing ? 'Leilão atualizado.' : 'Leilão criado. Agora adicione os lotes.');
    nav('/leiloeiro/leiloes');
  };

  const heading = editing ? 'Editar leilão' : 'Novo leilão';
  return (
    <Page>
      <Breadcrumb items={[{ label: 'Meus leilões', to: '/leiloeiro/leiloes' }, { label: heading }]} />
      <PageTitle title={heading} />
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form onSubmit={submit} className="flex min-w-0 flex-col gap-6" noValidate>
          {errors.form && <p role="alert" className="text-sm text-live">{errors.form}</p>}
          <Field id="a-title" label="Título" required error={errors.title}>
            <TextInput id="a-title" placeholder="Ex.: Leilão de arte contemporânea" value={title} invalid={!!errors.title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field id="a-desc" label="Descrição" optional>
            <textarea id="a-desc" rows={4} placeholder="Apresente a curadoria em poucas linhas." value={description} onChange={(e) => setDescription(e.target.value)}
              className={`${inputCls} h-auto resize-y border-field py-3 leading-relaxed`} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="a-start" label="Início" required error={errors.startsAt}>
              <TextInput id="a-start" type="datetime-local" value={startsAt} invalid={!!errors.startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </Field>
            <Field id="a-end" label="Encerramento" required error={errors.endsAt}>
              <TextInput id="a-end" type="datetime-local" value={endsAt} invalid={!!errors.endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </Field>
          </div>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-sm font-semibold">Situação</legend>
            <div role="radiogroup" className="grid gap-2.5 sm:grid-cols-3">
              {STATUS_OPTS.map((o) => {
                const on = status === o.value;
                return (
                  <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => setStatus(o.value)}
                    className={`flex flex-col gap-1 rounded-[2px] border px-4 py-3.5 text-left transition-colors ${on ? 'border-ink bg-surface' : 'border-field hover:bg-soft'}`}>
                    <span className="text-[15px] font-bold">{o.label}</span>
                    <span className="text-[13px] leading-snug text-muted">{o.desc}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-6">
            <Button variant="ghost" onClick={() => nav('/leiloeiro/leiloes')}>Cancelar</Button>
            <Button type="submit" loading={submitting}>{submitting ? 'Salvando…' : 'Salvar leilão'}</Button>
          </div>
        </form>
        <aside className="flex flex-col gap-4 rounded-[2px] bg-soft p-6">
          <Eyebrow>Antes de salvar</Eyebrow>
          <ul className="flex list-disc flex-col gap-3 pl-4.5 text-sm leading-relaxed">
            <li>O encerramento precisa ser posterior ao início.</li>
            <li>Cada lote herda o horário de encerramento do leilão e pode ser prorrogado individualmente por lances nos minutos finais.</li>
            <li>Lances só são aceitos com o leilão Ativo e dentro do período.</li>
            <li>Um leilão só pode ser excluído se não tiver lotes.</li>
          </ul>
        </aside>
      </div>
    </Page>
  );
}
