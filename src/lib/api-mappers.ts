import type { Auction, AuctionStatus, Bid, Lot, LotStatus, Role, Transaction, TxType, User, Wallet } from '../types';
import { responseList, responseObject } from './api';

type RecordValue = Record<string, unknown>;

const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const numeric = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return fallback;
};
const optionalNumeric = (value: unknown): number | null => value == null || value === '' ? null : numeric(value, NaN);
const iso = (value: unknown, fallback = new Date().toISOString()) => {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  if (value instanceof Date) return value.toISOString();
  return fallback;
};
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};

export function mapAuction(value: unknown): Auction {
  const outer = responseObject(value);
  const raw = record(outer.auction ?? outer.item ?? outer);
  const auctioneer = record(raw.auctioneer);
  const rawStatus = text(raw.status, 'SCHEDULED');
  const validStatus: AuctionStatus[] = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'FINISHED', 'CANCELLED'];
  const status = validStatus.includes(rawStatus as AuctionStatus) ? rawStatus as AuctionStatus : 'SCHEDULED';
  return {
    id: text(raw.id),
    title: text(raw.title, 'Leilão'),
    description: text(raw.description),
    status,
    startsAt: iso(raw.startsAt),
    endsAt: iso(raw.endsAt),
    auctioneerId: text(raw.auctioneerId ?? auctioneer.id),
    auctioneerName: text(raw.auctioneerName ?? auctioneer.name, 'Leiloeiro Verzel'),
  };
}

export function mapLot(value: unknown, index = 0, auctions: Auction[] = []): Lot {
  const outer = responseObject(value);
  const raw = record(outer.lot ?? outer.item ?? outer);
  const auction = record(raw.auction);
  const auctionId = text(raw.auctionId ?? auction.id);
  const parentAuction = auctions.find((item) => item.id === auctionId);
  const now = Date.now();
  const rawStatus = text(raw.status);
  const validStatus: LotStatus[] = ['OPEN', 'SOLD', 'UNSOLD', 'CANCELLED', 'WAITING'];
  let status: LotStatus;
  if (rawStatus === 'SOLD' || rawStatus === 'UNSOLD' || rawStatus === 'CANCELLED') status = rawStatus;
  else if (parentAuction && (parentAuction.status === 'SCHEDULED' || Date.parse(parentAuction.startsAt) > now)) status = 'WAITING';
  else if (validStatus.includes(rawStatus as LotStatus)) status = rawStatus as LotStatus;
  else status = 'OPEN';

  const bids = responseList(raw.bids);
  const currentBid = optionalNumeric(raw.currentBid ?? raw.currentAmount);
  return {
    id: text(raw.id),
    auctionId,
    number: numeric(raw.number ?? raw.lotNumber, index + 1),
    title: text(raw.title, 'Lote'),
    artist: text(raw.artist ?? record(raw.artwork).artist),
    date: text(raw.date ?? record(raw.artwork).date),
    description: text(raw.description),
    imageUrl: text(raw.imageUrl ?? record(raw.artwork).imageUrl ?? record(raw.artwork).image),
    externalId: text(raw.externalId ?? record(raw.artwork).externalId ?? record(raw.artwork).id),
    startingBid: numeric(raw.startingBid),
    minimumIncrement: numeric(raw.minimumIncrement, 1),
    currentBid,
    bidCount: numeric(raw.bidCount ?? record(raw._count).bids, bids.length),
    status,
    endsAt: iso(raw.endsAt ?? parentAuction?.endsAt ?? auction.endsAt),
  };
}

export function mapAuctions(value: unknown): Auction[] {
  return responseList(value).map(mapAuction).filter((item) => item.id);
}

export function mapLots(value: unknown, auctions: Auction[] = []): Lot[] {
  const counts = new Map<string, number>();
  return responseList(value).map((raw, index) => {
    const auctionId = text(raw.auctionId ?? record(raw.auction).id);
    const number = counts.get(auctionId) ?? 0;
    counts.set(auctionId, number + 1);
    return mapLot({ ...raw, number: raw.number ?? number + 1 }, index, auctions);
  }).filter((item) => item.id);
}

export function mapBid(value: unknown, index = 0, userId?: string): Bid {
  const raw = responseObject(value);
  const profileId = text(raw.profileId ?? raw.bidderId ?? record(raw.bidder).id);
  const mine = Boolean(raw.mine) || (!!userId && profileId === userId);
  const createdAt = raw.createdAt ?? raw.at ?? raw.timestamp;
  const at = typeof createdAt === 'number' ? createdAt : Date.parse(String(createdAt ?? ''));
  return {
    seq: numeric(raw.sequence ?? raw.seq, index + 1),
    amount: numeric(raw.amount),
    bidder: mine ? 'Você' : text(raw.bidderLabel ?? raw.bidderAlias ?? raw.displayName, 'Outro licitante'),
    mine,
    at: Number.isFinite(at) ? at : Date.now(),
    prevHash: typeof (raw.previousHash ?? raw.prevHash) === 'string' ? String(raw.previousHash ?? raw.prevHash) : null,
    hash: typeof raw.hash === 'string' ? raw.hash : null,
  };
}

export function mapBids(value: unknown, userId?: string): Bid[] {
  return responseList(value).map((item, index) => mapBid(item, index, userId)).sort((a, b) => a.seq - b.seq);
}

export function mapWallet(value: unknown, transactionsValue?: unknown): Wallet {
  const outer = responseObject(value);
  const raw = record(outer.wallet ?? outer);
  const transactions = responseList(transactionsValue ?? raw.transactions).map(mapTransaction);
  return {
    availableBalance: numeric(raw.availableBalance),
    committedBalance: numeric(raw.committedBalance),
    totalBalance: numeric(raw.totalBalance, numeric(raw.availableBalance) + numeric(raw.committedBalance)),
    transactions,
  };
}

export function mapTransaction(value: unknown): Transaction {
  const outer = responseObject(value);
  const raw = record(outer.transaction ?? outer);
  const lot = record(raw.lot ?? raw.relatedLot);
  const metadata = record(raw.metadata ?? raw.details);
  const auction = record(raw.auction ?? lot.auction);
  const artwork = record(lot.artwork);
  const validTypes: TxType[] = ['DEPOSIT', 'BID_RESERVATION', 'BID_RELEASE', 'AUCTION_PAYMENT', 'AUCTION_EARNING'];
  const rawType = text(raw.type, 'DEPOSIT');
  return {
    id: text(raw.id, `${Date.now()}-${Math.random()}`),
    type: validTypes.includes(rawType as TxType) ? rawType as TxType : 'DEPOSIT',
    amount: numeric(raw.amount),
    description: text(raw.description ?? raw.lotTitle ?? lot.title ?? raw.reference, 'Carteira'),
    createdAt: iso(raw.createdAt),
    lotId: text(raw.lotId ?? raw.relatedLotId ?? lot.id ?? metadata.lotId) || undefined,
    lotTitle: text(raw.lotTitle ?? lot.title ?? metadata.lotTitle) || undefined,
    lotImageUrl: text(raw.lotImageUrl ?? lot.imageUrl ?? artwork.imageUrl ?? artwork.image ?? metadata.imageUrl) || undefined,
    lotArtist: text(raw.lotArtist ?? lot.artist ?? artwork.artist ?? metadata.artist) || undefined,
    auctionTitle: text(raw.auctionTitle ?? auction.title ?? metadata.auctionTitle) || undefined,
  };
}

export function mapUser(value: unknown): User {
  const outer = responseObject(value);
  const raw = record(outer.user ?? outer);
  const roleValue = text(raw.role, 'BIDDER');
  const role: Role = roleValue === 'ADMIN' || roleValue === 'AUCTIONEER' ? roleValue : 'BIDDER';
  return {
    id: text(raw.id),
    name: text(raw.name, 'Usuário'),
    email: text(raw.email),
    role,
    createdAt: iso(raw.createdAt),
    hasRelatedData: Boolean(raw.hasRelatedData),
  };
}

export function mapArtworks(value: unknown) {
  return responseList(value).map((raw) => ({
    id: raw.id == null && raw.externalId == null ? '' : String(raw.id ?? raw.externalId),
    title: text(raw.title, 'Obra sem título'),
    artist: text(raw.artist),
    date: text(raw.date),
    img: text(raw.imageUrl ?? raw.img),
  })).filter((item) => item.id && item.img);
}

export function unwrap(value: unknown): RecordValue {
  return responseObject(value);
}
