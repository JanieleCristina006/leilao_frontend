import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { BRL, initials } from '../lib/format';
import { ROLE_LABEL } from '../lib/status';
import { Logo, btn } from './ui';
import ThemeToggle from './ThemeToggle';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const items = session ? NAV[session.role] : [{ to: '/leiloes', label: 'Leilões', match: ['/leiloes', '/lotes'] }];
  const artHeader = /^\/leiloes\/[^/]+$/.test(pathname);
  const separator = artHeader ? 'border-white/20' : 'border-line';
  const closeMenu = () => setMenuOpen(false);
  const signOut = () => { logout(); closeMenu(); nav('/entrar'); };

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <header
      className={`border-b bg-page bg-cover bg-center ${separator} ${artHeader ? 'text-white' : ''}`}
      style={artHeader ? { backgroundImage: 'linear-gradient(90deg, rgba(8, 17, 31, 0.92), rgba(8, 17, 31, 0.68)), url("/art/14.jpg")' } : undefined}
    >
      <div className="mx-auto flex min-h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-5 lg:min-h-[72px] lg:gap-6 lg:px-8">
        <Logo light={artHeader} />

        <nav aria-label="Principal" className="hidden min-w-0 flex-1 items-stretch gap-4 lg:flex xl:gap-7">
          {items.map((it) => {
            const active = it.match.some((m) => pathname.startsWith(m)) && !(it.to === '/leiloeiro/leiloes' && pathname.includes('/lotes'));
            return (
              <NavLink key={it.to} to={it.to}
                className={`flex min-h-[72px] shrink-0 items-center border-b-2 text-sm font-semibold no-underline xl:text-[15px] ${active ? artHeader ? 'border-white text-white' : 'border-ink text-ink' : artHeader ? 'border-transparent text-white/75 hover:text-white' : 'border-transparent text-muted hover:text-ink'}`}>
                {it.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-auto hidden shrink-0 lg:block"><ThemeToggle light={artHeader} /></div>

        {session?.role === 'BIDDER' && (
          <Link to="/carteira" className={`hidden shrink-0 flex-col items-end gap-0.5 no-underline lg:flex ${artHeader ? 'text-white' : ''}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${artHeader ? 'text-white/65' : 'text-muted'}`}>Saldo disponível</span>
            <span className="font-mono text-[15px] font-medium">{BRL(wallets.BIDDER.availableBalance)}</span>
          </Link>
        )}

        {session ? (
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <div aria-hidden className={`flex size-10 items-center justify-center rounded-full text-sm font-bold ${artHeader ? 'bg-white text-ink' : 'bg-ink text-page'}`}>{initials(session.name)}</div>
            <div className="flex min-w-0 flex-col">
              <span className="max-w-32 truncate text-sm font-semibold">{session.name}</span>
              <span className={`text-xs ${artHeader ? 'text-white/65' : 'text-muted'}`}>{ROLE_LABEL[session.role]}</span>
            </div>
            <button onClick={signOut} className={btn('ghost', 'sm', `ml-1 ${artHeader ? 'border-white/35 text-white hover:bg-white/10' : ''}`)}>Sair</button>
          </div>
        ) : (
          <div className="hidden shrink-0 gap-2 lg:flex">
            <Link to="/entrar" className={btn('ghost', 'md', artHeader ? 'border-white/35 text-white hover:bg-white/10' : '')}>Entrar</Link>
            <Link to="/cadastro" className={btn('primary', 'md', artHeader ? 'bg-white text-ink hover:bg-white/90' : '')}>Criar conta</Link>
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:hidden">
          <ThemeToggle light={artHeader} />
          <button
            type="button"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
            className={`inline-flex size-10 items-center justify-center rounded-[2px] border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${artHeader ? 'border-white/35 text-white hover:bg-white/10 focus-visible:outline-white' : 'border-field text-ink hover:bg-soft focus-visible:outline-ink'}`}
          >
            {menuOpen ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5"><path d="m6 6 12 12M18 6 6 18" /></svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>
        </div>
      </div>

      <div id="mobile-navigation" className={`${menuOpen ? 'block' : 'hidden'} border-t lg:hidden ${artHeader ? 'border-white/20 bg-[#101b2c]/95' : 'border-line bg-page'}`}>
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-4 sm:px-5">
          {session?.role === 'BIDDER' && (
            <Link to="/carteira" onClick={closeMenu} className={`flex flex-col gap-0.5 rounded-[2px] px-4 py-3 no-underline ${artHeader ? 'bg-white/10 text-white' : 'bg-soft'}`}>
              <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${artHeader ? 'text-white/65' : 'text-muted'}`}>Saldo disponível</span>
              <span className="font-mono text-[15px] font-medium">{BRL(wallets.BIDDER.availableBalance)}</span>
            </Link>
          )}

          <nav aria-label="Navegação móvel" className="flex flex-col gap-1">
            {items.map((it) => {
              const active = it.match.some((m) => pathname.startsWith(m)) && !(it.to === '/leiloeiro/leiloes' && pathname.includes('/lotes'));
              return (
                <NavLink key={it.to} to={it.to} onClick={closeMenu}
                  className={`rounded-[2px] px-4 py-3 text-[15px] font-semibold no-underline ${active ? artHeader ? 'bg-white text-ink' : 'bg-ink text-page' : artHeader ? 'text-white/85 hover:bg-white/10' : 'text-ink hover:bg-soft'}`}>
                  {it.label}
                </NavLink>
              );
            })}
          </nav>

          {session ? (
            <div className={`flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${separator}`}>
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${artHeader ? 'bg-white text-ink' : 'bg-ink text-page'}`}>{initials(session.name)}</span>
                <div className="flex min-w-0 flex-col">
                  <span className="max-w-[min(55vw,240px)] truncate text-sm font-semibold">{session.name}</span>
                  <span className={`text-xs ${artHeader ? 'text-white/65' : 'text-muted'}`}>{ROLE_LABEL[session.role]}</span>
                </div>
              </div>
              <button onClick={signOut} className={btn('ghost', 'sm', artHeader ? 'border-white/35 text-white hover:bg-white/10' : '')}>Sair</button>
            </div>
          ) : (
            <div className={`grid grid-cols-2 gap-2 border-t pt-4 ${separator}`}>
              <Link to="/entrar" onClick={closeMenu} className={btn('ghost', 'md', artHeader ? 'border-white/35 text-white hover:bg-white/10' : '')}>Entrar</Link>
              <Link to="/cadastro" onClick={closeMenu} className={btn('primary', 'md', artHeader ? 'bg-white text-ink hover:bg-white/90' : '')}>Criar conta</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
