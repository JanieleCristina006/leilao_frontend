import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { ARTWORKS } from '../data/artworks';
import { isEmail } from '../lib/format';
import AuthLayout from '../components/AuthLayout';
import { Button, Field, TextInput } from '../components/ui';

export default function Register() {
  const { registerUser, notify } = useApp();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pwOk = password.length >= 8;
  const pwHint = pwOk
    ? { text: '✓ Senha com 8 caracteres ou mais', cls: 'text-ok' }
    : submitted
      ? { text: `A senha precisa de pelo menos 8 caracteres (faltam ${8 - password.length}).`, cls: 'text-live' }
      : { text: 'Mínimo de 8 caracteres.', cls: 'text-muted' };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const er: Record<string, string> = {};
    if (!name.trim()) er.name = 'Informe seu nome.';
    if (!isEmail(email)) er.email = 'Informe um e-mail válido.';
    setErrors(er);
    if (Object.keys(er).length || !pwOk) return;
    setSubmitting(true);
    const error = await registerUser(name.trim(), email.trim(), password);
    setSubmitting(false);
    if (error) return setErrors({ email: error });
    notify('Conta criada. Entre com seu e-mail e senha para continuar.');
    nav('/entrar', { state: { registeredEmail: email.trim() } });
  };

  return (
    <AuthLayout art={ARTWORKS[6]} caption="Leilões de arte" reverse>
      <div className="flex flex-col gap-2">
        <h1 className="text-[44px] leading-none font-extrabold tracking-tight">Criar conta</h1>
        <p className="text-base leading-relaxed text-pretty text-muted">
          Sua conta começa como licitante, com carteira de saldo zero. Perfis de leiloeiro são habilitados pela equipe Verzel.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field id="name" label="Nome completo" error={errors.name}>
          <TextInput id="name" autoComplete="name" value={name} invalid={!!errors.name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field id="reg-email" label="E-mail" error={errors.email}>
          <TextInput id="reg-email" type="email" autoComplete="email" placeholder="voce@email.com" value={email} invalid={!!errors.email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field id="reg-password" label="Senha" hint={<span className={pwHint.cls}>{pwHint.text}</span>}>
          <TextInput id="reg-password" type="password" autoComplete="new-password" value={password} invalid={submitted && !pwOk} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" size="xl" loading={submitting}>{submitting ? 'Criando conta…' : 'Criar conta'}</Button>
      </form>
      <p className="text-[15px] text-muted">Já tem conta? <Link to="/entrar" className="link text-ink">Entrar</Link></p>
    </AuthLayout>
  );
}
