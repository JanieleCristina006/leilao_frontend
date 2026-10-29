export const API_URL = (import.meta.env.VITE_API_URL || 'https://leilao.vps10920.panel.icontainer.online').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  token?: string | null;
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, body, headers: inputHeaders, ...init } = options;
  const headers = new Headers(inputHeaders);
  headers.set('Accept', 'application/json');
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Não foi possível conectar à API. Verifique a conexão e tente novamente.', 0);
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const detail = typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>).message
      : undefined;
    const message = Array.isArray(detail) ? detail.join(' ') : typeof detail === 'string' ? detail : '';
    throw new ApiError(message || messageForStatus(response.status), response.status);
  }

  return payload as T;
}

export function messageForStatus(status: number): string {
  if (status === 400) return 'Confira os dados informados e tente novamente.';
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 403) return 'Seu perfil não tem permissão para esta ação.';
  if (status === 404) return 'O registro solicitado não foi encontrado.';
  if (status === 409) return 'Esta ação não pode ser concluída por causa de um conflito nos dados.';
  if (status === 422) return 'Não foi possível processar esta ação para sua conta.';
  if (status === 503) return 'Este serviço está indisponível no momento. Tente novamente mais tarde.';
  if (status === 0) return 'Não foi possível conectar à API. Verifique a conexão e tente novamente.';
  return 'Ocorreu um erro ao comunicar com a API. Tente novamente.';
}

export function responseObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const nested = record.data ?? record.result;
  return nested && typeof nested === 'object' && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : record;
}

export function responseList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  for (const key of ['data', 'items', 'results', 'auctions', 'lots', 'users', 'transactions', 'artworks', 'bids', 'history']) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    if (candidate && typeof candidate === 'object' && candidate !== value) {
      const nested = responseList(candidate);
      if (nested.length) return nested;
    }
  }
  return [];
}
