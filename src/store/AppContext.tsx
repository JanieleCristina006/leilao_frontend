import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Artwork, Auction, Bid, Lot, Role, Transaction, User, Wallet } from '../types';
import { apiRequest, ApiError, messageForStatus, responseList, responseObject } from '../lib/api';
import { mapArtworks, mapAuctions, mapBid, mapLots, mapUser, mapWallet, mapLot, unwrap } from '../lib/api-mappers';
import { toApiDecimal } from '../lib/format';

export interface Session {
  role: Role;
  userId: string;
  name: string;
  email: string;
  token: string;
}

type WalletOwner = 'BIDDER' | 'AUCTIONEER';
type AuctionDraft = Pick<Auction, 'title' | 'description' | 'status' | 'startsAt' | 'endsAt'>;
type LotDraft = Pick<Lot, 'auctionId' | 'title' | 'description' | 'imageUrl' | 'externalId' | 'startingBid' | 'minimumIncrement'>;
type UserDraft = Pick<User, 'name' | 'email'>;
type LotData = { lot: Lot; bids: Bid[] };

interface AppCtx {
  session: Session | null;
  authReady: boolean;
  loading: boolean;
  apiError: string;
  login: (email: string, password: string) => Promise<Session>;
  logout: () => void;
  auctions: Auction[];
  lots: Lot[];
  users: User[];
  wallets: Record<WalletOwner, Wallet>;
  toast: { message: string; tone: 'success' | 'error' } | null;
  notify: (msg: string, tone?: 'success' | 'error') => void;
  refreshData: () => Promise<void>;
  loadLot: (id: string) => Promise<LotData>;
  placeBid: (lotId: string, amount: number) => Promise<Bid>;
  deposit: (amount: number) => Promise<string | null>;
  saveAuction: (auction: AuctionDraft, id?: string) => Promise<string | null>;
  deleteAuction: (id: string) => Promise<string | null>;
  addLot: (lot: LotDraft) => Promise<string | null>;
  cancelLot: (id: string) => Promise<string | null>;
  updateLot: (id: string, patch: Partial<Lot>) => void;
  searchArtworks: (query: string) => Promise<Artwork[]>;
  registerUser: (name: string, email: string, password: string) => Promise<string | null>;
  updateUser: (id: string, patch: UserDraft) => Promise<string | null>;
  updateUserRole: (id: string, role: Role) => Promise<string | null>;
  deleteUser: (id: string) => Promise<string | null>;
}

const Ctx = createContext<AppCtx | null>(null);
const SESSION_KEY = 'verzel.session';
const emptyWallet = (): Wallet => ({ availableBalance: 0, committedBalance: 0, totalBalance: 0, transactions: [] });
const emptyWallets = (): Record<WalletOwner, Wallet> => ({ BIDDER: emptyWallet(), AUCTIONEER: emptyWallet() });

function readSession(): Session | null {
  let stored: string | null;
  try {
    stored = localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (!stored) return null;

  try {
    const value = JSON.parse(stored) as Partial<Session> | null;
    if (!value?.token || typeof value.token !== 'string'
      || (value.role !== 'BIDDER' && value.role !== 'AUCTIONEER' && value.role !== 'ADMIN')) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return {
      token: value.token,
      role: value.role,
      userId: typeof value.userId === 'string' ? value.userId : '',
      name: typeof value.name === 'string' && value.name.trim() ? value.name : 'Conta',
      email: typeof value.email === 'string' ? value.email : '',
    };
  } catch {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore unavailable browser storage.
    }
    return null;
  }
}

function roleFrom(value: unknown): Role {
  if (value === 'BIDDER' || value === 'AUCTIONEER' || value === 'ADMIN') return value;
  throw new Error('A API não informou um perfil válido para esta conta.');
}

function profileRecord(value: unknown): Record<string, unknown> {
  const outer = responseObject(value);
  const user = responseObject(outer.user ?? outer.profile ?? outer.account ?? outer);
  const nested = responseObject(user.profile ?? user.user ?? user.account ?? user.data);
  const deeper = responseObject(nested.profile ?? nested.user ?? nested.account);
  return { ...outer, ...user, ...nested, ...deeper };
}

function sessionFrom(profileValue: unknown, token: string, fallback?: Session, supplementalValue?: unknown): Session {
  const profile = { ...profileRecord(supplementalValue), ...profileRecord(profileValue) };
  const composedName = [profile.firstName ?? profile.first_name, profile.lastName ?? profile.last_name]
    .filter((part): part is string => typeof part === 'string' && !!part.trim())
    .join(' ');
  const name = [profile.name, profile.fullName, profile.full_name, profile.displayName, profile.display_name, profile.username, composedName]
    .find((candidate): candidate is string => typeof candidate === 'string' && !!candidate.trim());
  return {
    role: roleFrom(profile.role ?? fallback?.role),
    userId: String(profile.id ?? profile.userId ?? profile.sub ?? fallback?.userId ?? ''),
    name: typeof name === 'string' && name.trim() ? name : fallback?.name ?? 'Conta',
    email: String(profile.email ?? fallback?.email ?? ''),
    token,
  };
}

function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message || messageForStatus(error.status);
  if (error instanceof Error) return error.message;
  return 'Não foi possível concluir a solicitação.';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(readSession);
  const [authReady, setAuthReady] = useState(() => !readSession());
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [wallets, setWallets] = useState<Record<WalletOwner, Wallet>>(emptyWallets);
  const [toast, setToast] = useState<AppCtx['toast']>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const authEpoch = useRef(0);

  const persistSession = useCallback((value: Session | null) => {
    setSessionState(value);
    try {
      if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      // The active session remains usable until the page reloads if storage is unavailable.
    }
  }, []);

  const clearAccountData = useCallback(() => {
    setAuctions([]);
    setLots([]);
    setUsers([]);
    setWallets(emptyWallets());
    setApiError('');
  }, []);

  const notify = useCallback((msg: string, tone: 'success' | 'error' = 'success') => {
    window.clearTimeout(toastTimer.current);
    setToast({ message: msg, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  const loadDataFor = useCallback(async (activeSession: Session | null, isCurrent: () => boolean = () => true) => {
    setLoading(true);
    const token = activeSession?.token;
    try {
      const [auctionPayload, lotPayload] = await Promise.all([
        apiRequest<unknown>('/auctions', { token }),
        apiRequest<unknown>('/lots', { token }),
      ]);
      if (!isCurrent()) return;
      let nextAuctions = mapAuctions(auctionPayload);
      let nextLots = mapLots(lotPayload, nextAuctions);

      if (activeSession?.role === 'AUCTIONEER') {
        const [mineAuctions, mineLots] = await Promise.all([
          apiRequest<unknown>('/auctions/mine', { token }),
          apiRequest<unknown>('/lots/mine', { token }),
        ]);
        if (!isCurrent()) return;
        nextAuctions = mapAuctions(mineAuctions);
        nextLots = mapLots(mineLots, nextAuctions);
      }

      setAuctions(nextAuctions);
      setLots(nextLots);

      if (activeSession?.role === 'ADMIN') {
        const userPayload = await apiRequest<unknown>('/users', { token });
        if (!isCurrent()) return;
        setUsers(responseList(userPayload).map(mapUser));
      } else {
        setUsers([]);
      }

      if (activeSession?.role === 'BIDDER' || activeSession?.role === 'AUCTIONEER') {
        const [walletPayload, transactionPayload] = await Promise.all([
          apiRequest<unknown>('/wallet/me', { token }),
          apiRequest<unknown>('/wallet/me/transactions', { token }),
        ]);
        if (!isCurrent()) return;
        const owner: WalletOwner = activeSession.role;
        setWallets({ ...emptyWallets(), [owner]: mapWallet(walletPayload, transactionPayload) });
      } else {
        setWallets(emptyWallets());
      }

      if (isCurrent()) setApiError('');
    } catch (error) {
      if (isCurrent()) setApiError(errorText(error));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const epoch = authEpoch.current;
    const isCurrent = () => active && authEpoch.current === epoch;
    const current = session;
    async function initialize() {
      let verifiedSession = current;
      if (current?.token) {
        try {
          const profile = await apiRequest<unknown>('/auth/me', { token: current.token });
          // The saved browser role is only a cache. Authorization uses the role returned by the API.
          verifiedSession = sessionFrom(profile, current.token);
          if (isCurrent()) persistSession(verifiedSession);
        } catch (error) {
          verifiedSession = null;
          if (isCurrent()) {
            persistSession(null);
            if (!(error instanceof ApiError && error.status === 401)) setApiError(errorText(error));
          }
        }
      }
      if (!isCurrent()) return;
      setAuthReady(true);
      await loadDataFor(verifiedSession, isCurrent);
    }
    void initialize();
    return () => { active = false; };
    // The effect follows the token; profile updates do not change it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, loadDataFor, persistSession]);

  const refreshData = useCallback(() => loadDataFor(session), [loadDataFor, session]);

  const login = useCallback(async (email: string, password: string): Promise<Session> => {
    // Drop a previous account before authentication so its token and data cannot leak into this login.
    if (session?.token) {
      authEpoch.current += 1;
      clearAccountData();
    }
    persistSession(null);
    const response = await apiRequest<unknown>('/auth/login', { method: 'POST', body: { email, password } });
    const auth = responseObject(response);
    const token = String(auth.accessToken ?? auth.access_token ?? auth.token ?? '');
    if (!token) throw new Error('A API não retornou um token de acesso.');
    const profile = await apiRequest<unknown>('/auth/me', { token });
    const next = sessionFrom(profile, token, undefined, auth);
    persistSession(next);
    setAuthReady(true);
    return next;
  }, [clearAccountData, persistSession, session?.token]);

  const logout = useCallback(() => {
    authEpoch.current += 1;
    persistSession(null);
    setAuthReady(true);
    clearAccountData();
  }, [clearAccountData, persistSession]);

  const handleMutationError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) logout();
    return errorText(error);
  }, [logout]);

  const loadLot = useCallback(async (id: string): Promise<LotData> => {
    const payload = await apiRequest<unknown>(`/lots/${encodeURIComponent(id)}`, { token: session?.token });
    const outer = unwrap(payload);
    const lotPayload = outer.lot ?? outer;
    const mapped = mapLot(lotPayload, 0, auctions);
    const bidsPayload = outer.bids ?? responseObject(lotPayload).bids;
    const bids = responseList(bidsPayload).map((item, index) => mapBid(item, index, session?.userId)).sort((a, b) => a.seq - b.seq);
    setLots((current) => current.map((item) => item.id === mapped.id ? mapped : item));
    return { lot: mapped, bids };
  }, [auctions, session?.token, session?.userId]);

  const placeBid = useCallback(async (lotId: string, amount: number) => {
    const payload = await apiRequest<unknown>('/bids', {
      method: 'POST',
      token: session?.token,
      body: { lotId, amount: toApiDecimal(amount) },
    });
    const outer = unwrap(payload);
    const rawBid = outer.bid ?? outer;
    await Promise.all([loadLot(lotId), refreshData()]);
    return mapBid(rawBid, 0, session?.userId);
  }, [loadLot, refreshData, session?.token, session?.userId]);

  const deposit = useCallback(async (amount: number) => {
    try {
      await apiRequest('/wallet/deposits', {
        method: 'POST',
        token: session?.token,
        body: { amount: toApiDecimal(amount) },
      });
      await refreshData();
      return null;
    } catch (error) {
      return handleMutationError(error);
    }
  }, [handleMutationError, refreshData, session?.token]);

  const saveAuction = useCallback(async (auction: AuctionDraft, id?: string) => {
    try {
      await apiRequest(id ? `/auctions/${encodeURIComponent(id)}` : '/auctions', {
        method: id ? 'PATCH' : 'POST',
        token: session?.token,
        body: { ...auction, description: auction.description.trim() || undefined },
      });
      await refreshData();
      return null;
    } catch (error) {
      return handleMutationError(error);
    }
  }, [handleMutationError, refreshData, session?.token]);

  const deleteAuction = useCallback(async (id: string) => {
    try {
      await apiRequest(`/auctions/${encodeURIComponent(id)}`, { method: 'DELETE', token: session?.token });
      await refreshData();
      return null;
    } catch (error) {
      return handleMutationError(error);
    }
  }, [handleMutationError, refreshData, session?.token]);

  const addLot = useCallback(async (lot: LotDraft) => {
    try {
      await apiRequest('/lots', {
        method: 'POST',
        token: session?.token,
        body: {
          auctionId: lot.auctionId,
          title: lot.title,
          startingBid: lot.startingBid,
          minimumIncrement: lot.minimumIncrement,
          ...(lot.description.trim() ? { description: lot.description.trim() } : {}),
          ...(lot.imageUrl.trim() ? { imageUrl: lot.imageUrl.trim() } : {}),
          ...(lot.externalId.trim() ? { externalId: lot.externalId.trim() } : {}),
        },
      });
      await refreshData();
      return null;
    } catch (error) {
      return handleMutationError(error);
    }
  }, [handleMutationError, refreshData, session?.token]);

  const cancelLot = useCallback(async (id: string) => {
    try {
      await apiRequest(`/lots/${encodeURIComponent(id)}/cancel`, { method: 'POST', token: session?.token });
      await refreshData();
      return null;
    } catch (error) {
      return handleMutationError(error);
    }
  }, [handleMutationError, refreshData, session?.token]);

  const updateLot = useCallback((id: string, patch: Partial<Lot>) => {
    setLots((current) => current.map((lot) => lot.id === id ? { ...lot, ...patch } : lot));
  }, []);

  const searchArtworks = useCallback(async (query: string) => {
    const payload = await apiRequest<unknown>(`/lots/artworks/search?q=${encodeURIComponent(query)}`, { token: session?.token });
    return mapArtworks(payload);
  }, [session?.token]);

  const registerUser = useCallback(async (name: string, email: string, password: string) => {
    try {
      await apiRequest('/users', { method: 'POST', body: { name, email, password } });
      return null;
    } catch (error) {
      return handleMutationError(error);
    }
  }, [handleMutationError]);

  const updateUser = useCallback(async (id: string, patch: UserDraft) => {
    try {
      await apiRequest(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', token: session?.token, body: patch });
      await refreshData();
      return null;
    } catch (error) {
      return handleMutationError(error);
    }
  }, [handleMutationError, refreshData, session?.token]);

  const updateUserRole = useCallback(async (id: string, role: Role) => {
    try {
      const token = session?.token;
      await apiRequest(`/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', token, body: { role } });
      if (session?.userId === id && token) {
        const profile = await apiRequest<unknown>('/auth/me', { token });
        const nextSession = sessionFrom(profile, token);
        persistSession(nextSession);
        await loadDataFor(nextSession);
      } else {
        await refreshData();
      }
      return null;
    } catch (error) {
      return handleMutationError(error);
    }
  }, [handleMutationError, loadDataFor, persistSession, refreshData, session?.token, session?.userId]);

  const deleteUser = useCallback(async (id: string) => {
    try {
      await apiRequest(`/users/${encodeURIComponent(id)}`, { method: 'DELETE', token: session?.token });
      await refreshData();
      return null;
    } catch (error) {
      return handleMutationError(error);
    }
  }, [handleMutationError, refreshData, session?.token]);

  return (
    <Ctx.Provider value={{
      session, authReady, loading, apiError, login, logout, auctions, lots, users, wallets, toast, notify,
      refreshData, loadLot, placeBid, deposit, saveAuction, deleteAuction, addLot, cancelLot, updateLot,
      searchArtworks, registerUser, updateUser, updateUserRole, deleteUser,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return ctx;
}
