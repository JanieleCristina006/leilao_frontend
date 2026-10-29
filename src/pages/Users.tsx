import { useState } from 'react';
import type { Role, User } from '../types';
import { useApp } from '../store/AppContext';
import { fmtDate, initials, isEmail, normalize } from '../lib/format';
import { ROLE_CLS, ROLE_LABEL } from '../lib/status';
import { Button, EmptyState, Field, inputCls, LoadingState, Notice, Page, PageTitle, TextInput } from '../components/ui';
import { Modal } from '../components/Modal';

type Filter = 'ALL' | Role;

export default function Users() {
  const { users, loading, updateUser, updateUserRole, deleteUser, notify } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [editing, setEditing] = useState<User | null>(null);
  const [removing, setRemoving] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('BIDDER');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const q = normalize(query);
  const rows = users.filter((u) => (filter === 'ALL' || u.role === filter) && (!q || normalize(u.name + u.email).includes(q)));
  const filters: { value: Filter; label: string }[] = [
    { value: 'ALL', label: 'Todos' }, { value: 'BIDDER', label: 'Licitantes' }, { value: 'AUCTIONEER', label: 'Leiloeiros' }, { value: 'ADMIN', label: 'Admins' },
  ];

  if (loading && !users.length) {
    return <Page><PageTitle eyebrow="Admin" title="Usuários" /><LoadingState label="Carregando usuários…" /></Page>;
  }

  const openEdit = (u: User) => { setEditing(u); setName(u.name); setEmail(u.email); setRole(u.role); setError(''); };
  const close = () => { setEditing(null); setRemoving(null); setError(''); };

  const save = async () => {
    if (!editing) return;
    if (!name.trim() || !isEmail(email)) return setError('Preencha nome e um e-mail válido.');
    setSaving(true);
    let failure = await updateUser(editing.id, { name: name.trim(), email: email.trim() });
    if (!failure && role !== editing.role) failure = await updateUserRole(editing.id, role);
    setSaving(false);
    if (failure) return setError(failure);
    notify('Usuário atualizado.');
    close();
  };
  const remove = async () => {
    if (!removing) return;
    setSaving(true);
    const failure = await deleteUser(removing.id);
    setSaving(false);
    if (failure) return setError(failure);
    notify('Usuário excluído.');
    close();
  };

  const th = 'border-b border-line py-3 px-3 font-semibold first:pl-0 last:pr-0';
  const td = 'border-b border-line py-3.5 px-3 first:pl-0 last:pr-0';

  return (
    <Page>
      <PageTitle eyebrow="Administração" title="Usuários" actions={
        <TextInput aria-label="Buscar usuários" placeholder="Buscar por nome ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} className="w-[min(100%,340px)]" />
      } />
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const on = filter === f.value;
          const count = f.value === 'ALL' ? users.length : users.filter((u) => u.role === f.value).length;
          return (
            <button key={f.value} onClick={() => setFilter(f.value)} aria-pressed={on}
              className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold ${on ? 'border-ink bg-ink text-page' : 'border-field hover:bg-soft'}`}>
              {f.label}<span className="font-mono opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? <EmptyState>Nenhum usuário encontrado.</EmptyState> : (
        <div className="overflow-x-auto border-t border-ink">
          <table className="w-full min-w-[760px] border-collapse text-[15px]">
            <thead><tr className="text-left text-xs text-muted"><th className={th}>Nome</th><th className={th}>E-mail</th><th className={th}>Papel</th><th className={th}>Cadastro</th><th className={`${th} text-right`}>Ações</th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className={td}><div className="flex items-center gap-3"><span aria-hidden className="flex size-9 flex-none items-center justify-center rounded-full bg-soft text-[13px] font-bold">{initials(u.name)}</span><span className="font-semibold">{u.name}</span></div></td>
                  <td className={`${td} text-body`}>{u.email}</td>
                  <td className={td}><span className={`rounded-[2px] px-2 py-1 text-xs font-bold ${ROLE_CLS[u.role]}`}>{ROLE_LABEL[u.role]}</span></td>
                  <td className={`${td} text-body`}>{fmtDate(u.createdAt)}</td>
                  <td className={td}>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                      <Button variant="ghost" size="sm" className="text-live hover:bg-live-bg" onClick={() => { setRemoving(u); setError(''); }}>Excluir</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="max-w-[640px] text-[13px] leading-relaxed text-muted">O cadastro público cria apenas licitantes. Perfis de leiloeiro e administrador são provisionados pela equipe técnica.</p>

      <Modal open={!!editing} title="Editar usuário" onClose={close}
        footer={<><Button variant="ghost" size="md" onClick={close}>Voltar</Button><Button size="md" loading={saving} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar'}</Button></>}>
        <p className="text-[15px] text-body">Papel atual: {editing && ROLE_LABEL[editing.role]}. A alteração será aplicada após confirmação da API.</p>
        <Field id="u-role" label="Papel">
          <select id="u-role" value={role} onChange={(e) => { setRole(e.target.value as Role); setError(''); }} className={`${inputCls} border-field`}>
            <option value="BIDDER">Licitante</option>
            <option value="AUCTIONEER">Leiloeiro</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </Field>
        <Field id="u-name" label="Nome"><TextInput id="u-name" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} /></Field>
        <Field id="u-email" label="E-mail"><TextInput id="u-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} /></Field>
        {error && <Notice tone="error">{error}</Notice>}
      </Modal>

      <Modal open={!!removing} title={`Excluir ${removing?.name ?? ''}?`} onClose={close}
        footer={<><Button variant="ghost" size="md" onClick={close}>Voltar</Button><Button variant="danger" size="md" loading={saving} onClick={() => void remove()}>{saving ? 'Excluindo…' : 'Excluir'}</Button></>}>
        <p className="text-[15px] text-body">Esta ação não pode ser desfeita.</p>
        {error && <Notice tone="error">{error}</Notice>}
      </Modal>
    </Page>
  );
}
