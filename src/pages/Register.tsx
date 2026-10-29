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
  const [showPassword, setShowPassword] = useState(false);
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
          <div className="relative">
            <TextInput id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="pr-12" value={password} invalid={submitted && !pwOk} onChange={(e) => setPassword(e.target.value)} />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ink"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                {showPassword ? (
                  <>
                    <path d="m3 3 18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.3 2.2-2.5 3.3" />
                    <path d="M6.2 6.2C4.3 7.4 3 9.3 2.5 12c1 2.5 4.5 7 9.5 7 1.3 0 2.5-.3 3.5-.8" />
                  </>
                ) : (
                  <>
                    <path d="M2.5 12c1-2.5 4.5-7 9.5-7s8.5 4.5 9.5 7c-1 2.5-4.5 7-9.5 7S3.5 14.5 2.5 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </Field>
        <Button type="submit" size="xl" loading={submitting}>{submitting ? 'Criando conta…' : 'Criar conta'}</Button>
      </form>
      <p className="text-[15px] text-muted">Já tem conta? <Link to="/entrar" className="link text-ink">Entrar</Link></p>
    </AuthLayout>
  );
}
