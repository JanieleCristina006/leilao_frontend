import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { BRL, initials } from '../lib/format';
import { ROLE_LABEL } from '../lib/status';
import { Logo, btn } from './ui';

const NAV = {
  BIDDER: [
    { to: '/leiloes', label: 'Leilões', match: ['/leiloes', '/lotes'] },
    { to: '/meus-arremates', label: 'Meus arremates', match: ['/meus-arremates'] },
    { to: '/carteira', label: 'Carteira', match: ['/carteira'] },
  ],
  AUCTIONEER: [
    { to: '/leiloeiro/leiloes', label: 'Meus leilões', match: ['/leiloeiro/leiloes'] },
    { to: '/leiloeiro/lotes/novo', label: 'Novo lote', match: ['/leiloeiro/lotes'] },
    { to: '/carteira', label: 'Carteira', match: ['/carteira'] },
  ],
  ADMIN: [{ to: '/admin/usuarios', label: 'Usuários', match: ['/admin'] }],
};

export default function Header() {
  const { session, logout, wallets } = useApp();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const items = session ? NAV[session.role] : [{ to: '/leiloes', label: 'Leilões', match: ['/leiloes', '/lotes'] }];

  return (
    <header className="border-b border-line bg-page">
      <div className="mx-auto flex min-h-[72px] max-w-[1240px] flex-wrap items-center gap-x-10 gap-y-3 px-5 md:px-8">
        <Logo />
        <nav aria-label="Principal" className="flex flex-1 flex-wrap gap-7 self-stretch">
          {items.map((it) => {
            const active = it.match.some((m) => pathname.startsWith(m)) && !(it.to === '/leiloeiro/leiloes' && pathname.includes('/lotes'));
            return (
              <NavLink key={it.to} to={it.to}
                className={`flex min-h-[72px] items-center border-b-2 text-[15px] font-semibold no-underline ${active ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
                {it.label}
              </NavLink>
            );
          })}
        </nav>

        {session?.role === 'BIDDER' && (
          <Link to="/carteira" className="flex flex-col items-end gap-0.5 no-underline">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Saldo disponível</span>
            <span className="font-mono text-[15px] font-medium">{BRL(wallets.BIDDER.availableBalance)}</span>
          </Link>
        )}

        {session ? (
          <div className="flex items-center gap-3">
            <div aria-hidden className="flex size-10 items-center justify-center rounded-full bg-ink text-sm font-bold text-page">{initials(session.name)}</div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{session.name}</span>
              <span className="text-xs text-muted">{ROLE_LABEL[session.role]}</span>
            </div>
            <button onClick={() => { logout(); nav('/entrar'); }} className={btn('ghost', 'sm', 'ml-2')}>Sair</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link to="/entrar" className={btn('ghost', 'md')}>Entrar</Link>
            <Link to="/cadastro" className={btn('primary', 'md')}>Criar conta</Link>
          </div>
        )}
      </div>
    </header>
  );
}
