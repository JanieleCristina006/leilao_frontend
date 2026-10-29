import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Bid, Lot } from '../types';
import { useApp } from './AppContext';
import { API_URL } from '../lib/api';
import { mapBid, mapBids } from '../lib/api-mappers';
import { BRL, clock, hasTwoDecimalsMax } from '../lib/format';
import { ANTI_SNIPE_MS } from '../lib/status';

export interface LiveState {
  lotId: string;
  bids: Bid[];
  endsAt: number;
  leading: boolean;
  outbid: boolean;
  myBid: number;
  closed: boolean;
  connected: boolean;
  notice: string;
  result: null | 'WON' | 'SOLD' | 'UNSOLD';
}

interface LiveCtx {
  now: number;
  has: (lotId: string) => boolean;
  get: (lot: Lot) => LiveState;
  join: (lot: Lot) => void;
  leave: (lotId: string) => void;
  placeBid: (lotId: string, amount: number) => Promise<string | null>;
  bidsFor: (lot: Lot) => Bid[];
  minBid: (state: LiveState, lot: Lot) => number;
}

const Ctx = createContext<LiveCtx | null>(null);
const asObject = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const readNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
};
const readTimestamp = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value < 1_000_000_000_000 ? value * 1000 : value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function eventBody(value: unknown) {
  const outer = asObject(value);
  const nested = asObject(outer.data ?? outer.payload);
  return Object.keys(nested).length ? { ...outer, ...nested } : outer;
}

function stateFor(lot: Lot, bids: Bid[] = []): LiveState {
  return {
    lotId: lot.id,
    bids,
    endsAt: Date.parse(lot.endsAt),
    leading: false,
    outbid: false,
    myBid: 0,
    closed: lot.status === 'SOLD' || lot.status === 'UNSOLD' || lot.status === 'CANCELLED',
    connected: false,
    notice: '',
    result: lot.status === 'UNSOLD' ? 'UNSOLD' : lot.status === 'SOLD' ? 'SOLD' : null,
  };
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const app = useApp();
  const appRef = useRef(app);
  appRef.current = app;
  const [now, setNow] = useState(Date.now());
  const serverOffset = useRef(0);
  const [states, setStates] = useState<Record<string, LiveState>>({});
  const statesRef = useRef(states);
  statesRef.current = states;
  const rooms = useRef(new Set<string>());
  const socketRef = useRef<Socket | null>(null);
  const readyRef = useRef(false);
  const activeUserRef = useRef(app.session?.userId ?? null);

  const patchState = useCallback((lotId: string, patch: Partial<LiveState> | ((current: LiveState) => LiveState)) => {
    setStates((current) => {
      const previous = current[lotId];
      if (!previous) return current;
      const nextLot = typeof patch === 'function' ? patch(previous) : { ...previous, ...patch };
      const next = { ...current, [lotId]: nextLot };
      statesRef.current = next;
      return next;
    });
  }, []);

  const updateFromSnapshot = useCallback((payload: unknown) => {
    const body = eventBody(payload);
    const snapshot = asObject(body.snapshot);
    const rawLot = asObject(body.lot ?? snapshot.lot ?? (Object.keys(snapshot).length ? snapshot : body));
    const lotId = String(body.lotId ?? snapshot.lotId ?? rawLot.lotId ?? rawLot.id ?? '');
    if (!lotId || !rooms.current.has(lotId)) return;
    const clockData = asObject(body.clock ?? snapshot.clock);
    const serverTimestamp = readTimestamp(body.serverTime ?? snapshot.serverTime ?? clockData.serverTime ?? body.serverNow ?? snapshot.serverNow);
    if (serverTimestamp !== null) {
      serverOffset.current = serverTimestamp - Date.now();
      setNow(Date.now() + serverOffset.current);
    }
    const bidsPayload = body.bids ?? snapshot.bids ?? body.history ?? snapshot.history ?? rawLot.bids;
    const bids = mapBids(bidsPayload, appRef.current.session?.userId);
    const leadership = asObject(body.leadership ?? snapshot.leadership);
    const leadingValue = body.isLeading ?? snapshot.isLeading ?? leadership.isLeading ?? rawLot.isLeading;
    const status = String(rawLot.status ?? body.status ?? '').toUpperCase();
    const endsAt = rawLot.endsAt ?? body.endsAt;
    const currentBid = readNumber(rawLot.currentBid ?? body.currentBid);
    const lotPatch: Partial<Lot> = {
      ...(typeof rawLot.title === 'string' ? { title: rawLot.title } : {}),
      ...(typeof rawLot.description === 'string' ? { description: rawLot.description } : {}),
      ...(typeof rawLot.imageUrl === 'string' ? { imageUrl: rawLot.imageUrl } : {}),
      ...(typeof rawLot.startingBid !== 'undefined' ? { startingBid: readNumber(rawLot.startingBid) ?? 0 } : {}),
      ...(typeof rawLot.minimumIncrement !== 'undefined' ? { minimumIncrement: readNumber(rawLot.minimumIncrement) ?? 1 } : {}),
      ...(currentBid !== null ? { currentBid } : {}),
      ...(typeof rawLot.bidCount === 'number' ? { bidCount: rawLot.bidCount } : {}),
      ...(typeof endsAt === 'string' && Number.isFinite(Date.parse(endsAt)) ? { endsAt } : {}),
      ...(status === 'OPEN' || status === 'SOLD' || status === 'UNSOLD' || status === 'CANCELLED' ? { status } : {}),
    };
    appRef.current.updateLot(lotId, lotPatch);
    const isClosed = status === 'SOLD' || status === 'UNSOLD' || status === 'CANCELLED';
    patchState(lotId, (current) => ({
      ...current,
      ...(bidsPayload !== undefined ? { bids } : {}),
      ...(typeof leadingValue === 'boolean' ? {
        leading: leadingValue,
        outbid: !leadingValue && current.leading,
        myBid: leadingValue ? bids.filter((bid) => bid.mine).slice(-1)[0]?.amount ?? current.myBid : 0,
      } : {}),
      ...(typeof endsAt === 'string' && Number.isFinite(Date.parse(endsAt)) ? { endsAt: Date.parse(endsAt) } : {}),
      ...(status ? { closed: isClosed } : {}),
      connected: true,
    }));
  }, [patchState]);

  const addEventBid = useCallback((payload: unknown) => {
    const body = eventBody(payload);
    const bidData = asObject(body.bid ?? body);
    const rawBid: Record<string, unknown> = {
      ...bidData,
      amount: bidData.amount ?? body.amount ?? body.currentBid ?? body.currentAmount,
    };
    const lotId = String(body.lotId ?? asObject(body.lot).id ?? rawBid.lotId ?? asObject(rawBid.lot).id ?? '');
    if (!lotId || !rooms.current.has(lotId)) return;
    if (readNumber(rawBid.amount) === null) return;
    const bid = mapBid(rawBid, statesRef.current[lotId]?.bids.length ?? 0, appRef.current.session?.userId);
    const endsAt = body.endsAt ?? body.newEndsAt ?? rawBid.endsAt;
    const endsAtMs = typeof endsAt === 'string' ? Date.parse(endsAt) : NaN;
    const currentState = statesRef.current[lotId];
    const alreadyAdded = bid.hash ? currentState?.bids.some((item) => item.hash === bid.hash) : currentState?.bids.some((item) => item.seq === bid.seq && item.amount === bid.amount);
    const nextBidCount = (currentState?.bids.length ?? 0) + (alreadyAdded ? 0 : 1);
    const patch: Partial<LiveState> = {
      ...(Number.isFinite(endsAtMs) ? { endsAt: endsAtMs } : {}),
      notice: body.extended === true || body.antiSnipe === true ? `Lance nos 2 minutos finais: encerramento prorrogado para ${clock(endsAtMs)}.` : '',
    };
    patchState(lotId, (current) => {
      const exists = bid.hash ? current.bids.some((item) => item.hash === bid.hash) : current.bids.some((item) => item.seq === bid.seq && item.amount === bid.amount);
      return { ...current, ...patch, bids: exists ? current.bids : [...current.bids, bid].sort((a, b) => a.seq - b.seq) };
    });
    const currentBid = readNumber(body.currentBid ?? rawBid.amount);
    if (currentBid != null) appRef.current.updateLot(lotId, {
      currentBid,
      bidCount: nextBidCount,
      ...(Number.isFinite(endsAtMs) ? { endsAt: new Date(endsAtMs).toISOString() } : {}),
    });
  }, [patchState]);

  const updateLeadership = useCallback((payload: unknown) => {
    const body = eventBody(payload);
    const lotId = String(body.lotId ?? asObject(body.lot).id ?? '');
    if (!lotId || !rooms.current.has(lotId)) return;
    const leader = asObject(body.leader ?? body.bidder ?? body.profile);
    const leaderId = String(body.leaderId ?? body.leadingUserId ?? body.currentLeaderId ?? body.profileId ?? body.bidderId ?? leader.id ?? '');
    const isMine = typeof body.isLeading === 'boolean'
      ? body.isLeading
      : body.mine === true || body.isMine === true || (!!leaderId && leaderId === appRef.current.session?.userId);
    const wasLeading = statesRef.current[lotId]?.leading ?? false;
    patchState(lotId, (current) => ({
      ...current,
      leading: isMine,
      outbid: current.leading && !isMine,
      myBid: isMine ? current.bids[current.bids.length - 1]?.amount ?? current.myBid : 0,
    }));
    if (wasLeading && !isMine) void appRef.current.refreshData();
  }, [patchState]);

  const closeLot = useCallback((payload: unknown, resultEvent = false) => {
    const body = eventBody(payload);
    const lotId = String(body.lotId ?? asObject(body.lot).id ?? '');
    if (!lotId || !rooms.current.has(lotId)) return;
    const resultData = asObject(body.result ?? body.receipt);
    const status = String(body.status ?? resultData.status ?? asObject(body.lot).status ?? body.result ?? '').toUpperCase();
    const winnerId = String(body.winnerId ?? body.winnerProfileId ?? resultData.winnerId ?? resultData.winnerProfileId ?? asObject(body.winner).id ?? '');
    const current = statesRef.current[lotId];
    const result: LiveState['result'] = status === 'UNSOLD' ? 'UNSOLD'
      : winnerId && winnerId === appRef.current.session?.userId || (!winnerId && current?.leading) ? 'WON'
        : status === 'SOLD' || status === 'WON' || winnerId ? 'SOLD' : null;
    const amount = readNumber(body.finalAmount ?? body.finalPrice ?? body.amount ?? resultData.finalAmount ?? resultData.finalPrice ?? asObject(body.winningBid).amount);
    patchState(lotId, (current) => ({ ...current, closed: true, result: result ?? current.result, leading: result === 'WON', myBid: result === 'WON' ? amount ?? current.myBid : 0 }));
    appRef.current.updateLot(lotId, {
      status: status === 'UNSOLD' ? 'UNSOLD' : status === 'CANCELLED' ? 'CANCELLED' : 'SOLD',
      ...(status === 'UNSOLD' ? { currentBid: null } : amount !== null ? { currentBid: amount } : {}),
      ...(typeof body.endsAt === 'string' ? { endsAt: body.endsAt } : {}),
    });
    void appRef.current.refreshData();
    if (resultEvent && result === 'WON') appRef.current.notify('Parabéns! Você arrematou este lote.');
  }, [patchState]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now() + serverOffset.current), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const userId = app.session?.userId ?? null;
    if (activeUserRef.current !== userId) {
      activeUserRef.current = userId;
      rooms.current.clear();
      statesRef.current = {};
      setStates({});
    }

    const token = app.session?.token;
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      readyRef.current = false;
      rooms.current.clear();
      statesRef.current = {};
      setStates({});
      return;
    }

    const socket = io(API_URL, { auth: { token }, autoConnect: false });
    socketRef.current = socket;
    const onDisconnect = () => {
      readyRef.current = false;
      setStates((current) => {
        const next = Object.fromEntries(Object.entries(current).map(([id, value]) => [id, { ...value, connected: false }]));
        statesRef.current = next;
        return next;
      });
    };
    const onReady = () => {
      readyRef.current = true;
      setStates((current) => {
        const next = Object.fromEntries(Object.entries(current).map(([id, value]) => [id, {
          ...value,
          connected: true,
          notice: value.notice.startsWith('Falha na conexão ao vivo:') ? '' : value.notice,
        }]));
        statesRef.current = next;
        return next;
      });
      rooms.current.forEach((lotId) => socket.emit('lot.join', { lotId }));
    };
    const markLiveError = (message: string, lotId?: string) => {
      setStates((current) => {
        const next = Object.fromEntries(Object.entries(current).map(([id, value]) => [id,
          (!lotId || lotId === id) ? { ...value, connected: false, notice: `Falha na conexão ao vivo: ${message}` } : value,
        ]));
        statesRef.current = next;
        return next;
      });
    };
    const onConnectError = (error: Error) => markLiveError(error.message || 'Não foi possível autenticar a conexão.');
    const onLiveError = (payload: unknown) => {
      const body = eventBody(payload);
      const message = typeof body.message === 'string' ? body.message
        : typeof body.error === 'string' ? body.error
          : 'A API não conseguiu abrir a sala deste lote.';
      markLiveError(message, typeof body.lotId === 'string' ? body.lotId : undefined);
    };
    const onSnapshot = (payload: unknown) => updateFromSnapshot(payload);
    const onBid = (payload: unknown) => addEventBid(payload);
    const onLeadership = (payload: unknown) => updateLeadership(payload);
    const onClosed = (payload: unknown) => closeLot(payload);
    const onResult = (payload: unknown) => closeLot(payload, true);

    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('live.ready', onReady);
    socket.on('live.error', onLiveError);
    socket.on('lot.snapshot', onSnapshot);
    socket.on('bid.updated', onBid);
    socket.on('leadership.updated', onLeadership);
    socket.on('lot.closed', onClosed);
    socket.on('lot.result', onResult);
    socket.connect();

    return () => {
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('live.ready', onReady);
      socket.off('live.error', onLiveError);
      socket.off('lot.snapshot', onSnapshot);
      socket.off('bid.updated', onBid);
      socket.off('leadership.updated', onLeadership);
      socket.off('lot.closed', onClosed);
      socket.off('lot.result', onResult);
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
      readyRef.current = false;
    };
  }, [app.session?.token, app.session?.userId, updateFromSnapshot, addEventBid, updateLeadership, closeLot]);

  const has = useCallback((lotId: string) => !!statesRef.current[lotId], []);
  const get = useCallback((lot: Lot) => statesRef.current[lot.id] ?? stateFor(lot), []);
  const leave = useCallback((lotId: string) => {
    if (!rooms.current.delete(lotId)) return;
    if (readyRef.current) socketRef.current?.emit('lot.leave', { lotId });
  }, []);
  const join = useCallback((lot: Lot) => {
    rooms.current.add(lot.id);
    setStates((current) => {
      if (current[lot.id]) return current;
      const next = { ...current, [lot.id]: stateFor(lot) };
      statesRef.current = next;
      return next;
    });
    if (readyRef.current) socketRef.current?.emit('lot.join', { lotId: lot.id });
    void appRef.current.loadLot(lot.id).then(({ lot: latest, bids }) => {
      if (!rooms.current.has(lot.id)) return;
      appRef.current.updateLot(lot.id, latest);
      setStates((current) => {
        const existing = current[lot.id] ?? stateFor(latest, bids);
        const next = { ...current, [lot.id]: {
          ...existing,
          bids: bids.length ? bids : existing.bids,
          endsAt: Date.parse(latest.endsAt),
          closed: ['SOLD', 'UNSOLD', 'CANCELLED'].includes(latest.status),
        } };
        statesRef.current = next;
        return next;
      });
    }).catch(() => undefined);
  }, []);

  const minBid = useCallback((state: LiveState, lot: Lot) => {
    const latest = state.bids[state.bids.length - 1]?.amount ?? lot.currentBid;
    return latest == null ? lot.startingBid : latest + lot.minimumIncrement;
  }, []);

  const placeBid = useCallback(async (lotId: string, amount: number): Promise<string | null> => {
    const state = statesRef.current[lotId];
    const lot = appRef.current.lots.find((item) => item.id === lotId);
    if (!state || !lot || state.closed) return 'Este lote não está mais disponível.';
    if (state.leading) return 'Você já lidera este lote. Aguarde ser superado para ofertar de novo.';
    if (!Number.isFinite(amount) || amount <= 0) return 'Informe um valor válido.';
    if (!hasTwoDecimalsMax(amount)) return 'Use no máximo duas casas decimais.';
    if (amount < minBid(state, lot)) return `O lance mínimo agora é ${BRL(minBid(state, lot))}.`;
    if (amount > appRef.current.wallets.BIDDER.availableBalance) return `Saldo insuficiente. Disponível: ${BRL(appRef.current.wallets.BIDDER.availableBalance)}.`;

    try {
      const bid = await appRef.current.placeBid(lotId, amount);
      const snapshot = await appRef.current.loadLot(lotId).catch(() => null);
      patchState(lotId, (current) => {
        const freshBids = snapshot?.bids ?? current.bids;
        const duplicate = freshBids.some((item) => bid.hash ? item.hash === bid.hash : item.seq === bid.seq && item.amount === bid.amount);
        return {
          ...current,
          bids: duplicate ? freshBids : [...freshBids, bid].sort((a, b) => a.seq - b.seq),
          leading: true,
          outbid: false,
          myBid: amount,
          ...(snapshot ? { endsAt: Date.parse(snapshot.lot.endsAt) } : {}),
        };
      });
      appRef.current.notify(`Lance de ${BRL(amount)} enviado.`);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Não foi possível registrar o lance.';
    }
  }, [minBid, patchState]);

  const bidsFor = useCallback((lot: Lot) => statesRef.current[lot.id]?.bids ?? [], []);

  return <Ctx.Provider value={{ now, has, get, join, leave, placeBid, bidsFor, minBid }}>{children}</Ctx.Provider>;
}

export function useLive() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLive precisa estar dentro de <LiveProvider>');
  return ctx;
}
