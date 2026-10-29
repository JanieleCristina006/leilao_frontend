import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './store/AppContext';
import { useLive } from './store/LiveContext';
import { homeFor } from './lib/status';
import Header from './components/Header';
import Footer from './components/Footer';
import RequireRole from './components/RequireRole';
import { Toast } from './components/Modal';
import { LoadingState } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import Auctions from './pages/Auctions';
import AuctionDetail from './pages/AuctionDetail';
import LiveRoom from './pages/LiveRoom';
import WalletPage from './pages/Wallet';
import MyWins from './pages/MyWins';
import Receipt from './pages/Receipt';
import Audit from './pages/Audit';
import MyAuctions from './pages/MyAuctions';
import AuctionForm from './pages/AuctionForm';
import LotForm from './pages/LotForm';
import Users from './pages/Users';
import NotFound from './pages/NotFound';

export default function App() {
  const { session, toast, apiError, authReady, lots } = useApp();
  const live = useLive();
  const { pathname } = useLocation();
  const lotsRef = useRef(lots);
  lotsRef.current = lots;
  const auctioneerLotIds = session?.role === 'AUCTIONEER'
    ? lots.filter((lot) => lot.status === 'OPEN' || lot.status === 'WAITING').map((lot) => lot.id).join('|')
    : '';
  const isAuth = pathname === '/entrar' || pathname === '/cadastro';

  useEffect(() => {
    if (!auctioneerLotIds) return;
    const ids = auctioneerLotIds.split('|');
    ids.forEach((id) => {
      const lot = lotsRef.current.find((item) => item.id === id);
      if (lot) live.join(lot);
    });
    return () => ids.forEach(live.leave);
  }, [auctioneerLotIds, live.join, live.leave]);

  return (
    <div className="flex min-h-screen flex-col">
      {!isAuth && <Header />}
      <div className="flex-1">
        {apiError && (
          <div role="status" className="mx-auto max-w-[1240px] px-5 pt-4 text-sm text-live md:px-8">
            {apiError}
          </div>
        )}
        <Routes>
          <Route path="/" element={!authReady ? <LoadingState label="Validando sessão…" /> : <Navigate to={session ? homeFor(session.role) : '/leiloes'} replace />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />

          {/* Públicas (GET /auctions, GET /lots/:id/receipt, GET /lots/:id/audit) */}
          <Route path="/leiloes" element={<Auctions />} />
          <Route path="/leiloes/:id" element={<AuctionDetail />} />
          <Route path="/lotes/:id/comprovante" element={<Receipt />} />
          <Route path="/lotes/:id/auditoria" element={<Audit />} />

          <Route element={<RequireRole roles={['BIDDER']} />}>
            <Route path="/meus-arremates" element={<MyWins />} />
            <Route path="/lotes/:id/sala" element={<LiveRoom />} />
          </Route>
          <Route element={<RequireRole roles={['BIDDER', 'AUCTIONEER']} />}>
            <Route path="/carteira" element={<WalletPage />} />
          </Route>
          <Route element={<RequireRole roles={['AUCTIONEER']} />}>
            <Route path="/leiloeiro/leiloes" element={<MyAuctions />} />
            <Route path="/leiloeiro/leiloes/novo" element={<AuctionForm />} />
            <Route path="/leiloeiro/leiloes/:id/editar" element={<AuctionForm />} />
            <Route path="/leiloeiro/lotes/novo" element={<LotForm />} />
          </Route>
          <Route element={<RequireRole roles={['ADMIN']} />}>
            <Route path="/admin/usuarios" element={<Users />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!isAuth && <Footer />}
      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
}
