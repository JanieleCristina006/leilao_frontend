import { Link } from 'react-router-dom';
import { homeFor } from '../lib/status';
import { useApp } from '../store/AppContext';
import { Logo } from './ui';

export default function Footer() {
  const { session } = useApp();

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-[1240px] gap-8 px-4 py-8 sm:grid-cols-2 sm:px-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-12 md:px-8 md:py-10">
        <div className="flex flex-col items-start gap-3">
          <Logo to="/leiloes" />
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Explore leilões, acompanhe lotes ao vivo e consulte o histórico de cada arremate.
          </p>
        </div>

        <nav aria-label="Links do rodapé" className="flex flex-col items-start gap-3">
          <h2 className="text-sm font-bold">Explorar</h2>
          <Link to="/leiloes" className="text-sm text-muted no-underline hover:text-ink">Leilões</Link>
        </nav>

        <nav aria-label="Conta" className="flex flex-col items-start gap-3">
          <h2 className="text-sm font-bold">Conta</h2>
          {session ? (
            <Link to={homeFor(session.role)} className="text-sm text-muted no-underline hover:text-ink">Minha área</Link>
          ) : (
            <>
              <Link to="/entrar" className="text-sm text-muted no-underline hover:text-ink">Entrar</Link>
              <Link to="/cadastro" className="text-sm text-muted no-underline hover:text-ink">Criar conta</Link>
            </>
          )}
        </nav>

        <div className="border-t border-line pt-4 text-xs text-muted sm:col-span-2 md:col-span-3">
          © {new Date().getFullYear()} Verzel Leilões
        </div>
      </div>
    </footer>
  );
}
