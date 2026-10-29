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
            <TextInput id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className="pr-24" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
            <button type="button" onClick={() => setShow(!show)} className="link absolute top-1.5 right-1.5 h-9 px-2.5 text-[13px] font-semibold">
              {show ? 'Ocultar' : 'Mostrar'}
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
