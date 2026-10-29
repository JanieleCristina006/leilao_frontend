import type { AuctionStatus, LotStatus, Role, TxType } from '../types';

export const STATUS: Record<AuctionStatus | LotStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Ao vivo', cls: 'bg-live-bg text-live' },
  SCHEDULED: { label: 'Agendado', cls: 'bg-warn-bg text-warn' },
  FINISHED: { label: 'Encerrado', cls: 'bg-neutral-bg text-body' },
  DRAFT: { label: 'Rascunho', cls: 'bg-soft text-body' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-soft text-body' },
  OPEN: { label: 'Em disputa', cls: 'bg-live-bg text-live' },
  SOLD: { label: 'Vendido', cls: 'bg-ok-bg text-ok' },
  UNSOLD: { label: 'Não vendido', cls: 'bg-neutral-bg text-body' },
  WAITING: { label: 'Aguardando', cls: 'bg-warn-bg text-warn' },
};

export const ROLE_LABEL: Record<Role, string> = {
  BIDDER: 'Licitante',
  AUCTIONEER: 'Leiloeiro',
  ADMIN: 'Admin',
};
export const ROLE_CLS: Record<Role, string> = {
  BIDDER: 'bg-soft text-body',
  AUCTIONEER: 'bg-warn-bg text-warn',
  ADMIN: 'bg-ink text-page',
};

export const TX: Record<TxType, { label: string; sign: string; cls: string; effect: string }> = {
  DEPOSIT: { label: 'Depósito simulado', sign: '+ ', cls: 'text-ok', effect: 'Entra no disponível' },
  BID_RESERVATION: { label: 'Reserva de lance', sign: '', cls: 'text-ink', effect: 'Disponível → comprometido' },
  BID_RELEASE: { label: 'Liberação de reserva', sign: '', cls: 'text-ink', effect: 'Comprometido → disponível' },
  AUCTION_PAYMENT: { label: 'Pagamento de arrematação', sign: '− ', cls: 'text-live', effect: 'Sai do comprometido' },
  AUCTION_EARNING: { label: 'Recebimento de arrematação', sign: '+ ', cls: 'text-ok', effect: 'Entra no disponível' },
};

export const homeFor = (role: Role) =>
  role === 'AUCTIONEER' ? '/leiloeiro/leiloes' : role === 'ADMIN' ? '/admin/usuarios' : '/leiloes';

/** Regras da API */
export const ANTI_SNIPE_MS = 2 * 60 * 1000;
