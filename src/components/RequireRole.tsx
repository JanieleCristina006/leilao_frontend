import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '../types';
import { useApp } from '../store/AppContext';
import { homeFor } from '../lib/status';
import { LoadingState } from './ui';

/** Espelha os guards da API: 401 sem sessão → login; 403 papel errado → home do papel. */
export default function RequireRole({ roles }: { roles: Role[] }) {
  const { session, authReady } = useApp();
  const location = useLocation();
  if (!authReady) return <LoadingState label="Validando sessão…" />;
  if (!session) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  if (!roles.includes(session.role)) return <Navigate to={homeFor(session.role)} replace />;
  return <Outlet />;
}
