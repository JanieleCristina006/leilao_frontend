import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { ARTWORKS } from '../data/artworks';
import { homeFor } from '../lib/status';
import AuthLayout from '../components/AuthLayout';
import { Button, Field, Notice, TextInput } from '../components/ui';

export default function Login() {
  const { login } = useApp();
  const nav = useNavigate();
  const location = useLocation();
  const routeState = location.state as { from?: string; registeredEmail?: string } | null;
  const from = routeState?.from;
  const [email, setEmail] = useState(routeState?.registeredEmail ?? '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || password.length < 8) {
      setError('E-mail ou senha incorretos. Confira os dados e tente novamente.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const profile = await login(email.trim(), password);
      nav(from ?? homeFor(profile.role), { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar. Confira seus dados e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout art={ARTWORKS[0]} caption="Acervo Verzel">
      <div className="flex flex-col gap-2">
        <h1 className="text-[44px] leading-none font-extrabold tracking-tight">Entrar</h1>
        <p className="text-base leading-relaxed text-muted">Acompanhe leilões ao vivo, dê lances e consulte sua carteira.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <Field id="email" label="E-mail">
          <TextInput id="email" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} />
        </Field>
        <Field id="password" label="Senha">
          <div className="relative">
            <TextInput id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className="pr-12" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={show}
              title={show ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ink"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                {show ? (
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
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" size="xl" loading={submitting}>{submitting ? 'Entrando…' : 'Entrar'}</Button>
      </form>
      <p className="text-[15px] text-muted">Ainda não tem conta? <Link to="/cadastro" className="link text-ink">Criar conta</Link></p>
    </AuthLayout>
  );
}
