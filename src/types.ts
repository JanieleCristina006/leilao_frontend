export type Role = 'BIDDER' | 'AUCTIONEER' | 'ADMIN';
export type AuctionStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
// WAITING é um estado de interface: lote de um leilão que ainda não abriu.
export type LotStatus = 'OPEN' | 'SOLD' | 'UNSOLD' | 'CANCELLED' | 'WAITING';
export type TxType = 'DEPOSIT' | 'BID_RESERVATION' | 'BID_RELEASE' | 'AUCTION_PAYMENT' | 'AUCTION_EARNING';
export type Integrity = 'INTACT' | 'TAMPERED' | 'INCOMPLETE';

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  date: string;
  technique?: string;
  img: string;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  status: AuctionStatus;
  startsAt: string;
  endsAt: string;
  auctioneerId: string;
  auctioneerName: string;
}

export interface Lot {
  id: string;
  auctionId: string;
  number: number;
  title: string;
  artist: string;
  date: string;
  description: string;
  imageUrl: string;
  externalId: string;
  startingBid: number;
  minimumIncrement: number;
  currentBid: number | null;
  bidCount: number;
  status: LotStatus;
  endsAt: string;
}

export interface Bid {
  seq: number;
  amount: number;
  bidder: string;
  mine: boolean;
  at: number;
  prevHash: string | null;
  hash: string | null;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  createdAt: string;
  lotId?: string;
  lotTitle?: string;
  lotImageUrl?: string;
  lotArtist?: string;
  auctionTitle?: string;
}

export interface Wallet {
  availableBalance: number;
  committedBalance: number;
  totalBalance?: number;
  transactions: Transaction[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  hasRelatedData: boolean;
}
