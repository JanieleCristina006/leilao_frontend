# Verzel Leilões — Frontend

Interface React 19 + Vite + TypeScript para a [API Verzel Leilões](https://github.com/JanieleCristina006/leilao). O frontend consome a API HTTP e a sala ao vivo via Socket.IO.

## Configuração

O endereço padrão é `https://leilao.vps10920.panel.icontainer.online`. Para usar outra instância, crie `.env.local` a partir de `.env.example` e informe `VITE_API_URL`.

```bash
npm install
npm run dev
```

O cadastro público cria somente usuários `BIDDER`. As contas `AUCTIONEER` e `ADMIN` precisam ser provisionadas no backend. Depois do cadastro, entre com seu e-mail e senha; o login consulta `GET /auth/me` para descobrir o perfil e as permissões.

## Integração

- O token JWT é enviado como `Authorization: Bearer <token>` nas rotas protegidas e validado em `GET /auth/me` ao restaurar uma sessão.
- Leilões e lotes são carregados de `GET /auctions` e `GET /lots`; as telas do leiloeiro e administrador usam também as rotas `/mine` e `/users` documentadas pela API.
- Depósitos e lances são enviados como decimal textual com duas casas, por exemplo `"100.00"`; no cadastro de lotes, `startingBid` e `minimumIncrement` seguem o DTO da API como números.
- Lances usam `POST /bids`; o saldo é reservado e atualizado pelo servidor.
- A sala usa Socket.IO com o JWT em `auth.token`, aguarda `live.ready`, entra em cada lote com `lot.join` e trata `lot.snapshot`, `bid.updated`, `leadership.updated`, `lot.closed` e `lot.result`.
- Comprovantes e auditorias são carregados das rotas públicas `/lots/:id/receipt` e `/lots/:id/audit`.
- A busca de obras usa `/lots/artworks/search?q=...`; se o serviço externo estiver indisponível, o lote ainda pode ser preenchido manualmente.

## Rotas da interface

| Tela | Rota | Perfil | API |
|---|---|---|---|
| Entrar | `/entrar` | Público | `POST /auth/login`, `GET /auth/me` |
| Criar conta | `/cadastro` | Público | `POST /users` |
| Leilões | `/leiloes` | Público | `GET /auctions`, `GET /lots` |
| Leilão | `/leiloes/:id` | Público | `GET /auctions/:id`, `GET /lots` |
| Sala ao vivo | `/lotes/:id/sala` | `BIDDER` | Socket.IO, `POST /bids`, `GET /lots/:id` |
| Carteira | `/carteira` | `BIDDER`, `AUCTIONEER` | `/wallet/me`, `/wallet/me/transactions`, `/wallet/deposits` |
| Comprovante | `/lotes/:id/comprovante` | Público | `GET /lots/:id/receipt` |
| Auditoria | `/lotes/:id/auditoria` | Público | `GET /lots/:id/audit` |
| Meus leilões | `/leiloeiro/leiloes` | `AUCTIONEER` | `/auctions/mine`, `/lots/mine`, exclusão e cancelamento |
| Novo/editar leilão | `/leiloeiro/leiloes/novo`, `/leiloeiro/leiloes/:id/editar` | `AUCTIONEER` | `POST /auctions`, `PATCH /auctions/:id` |
| Novo lote | `/leiloeiro/lotes/novo` | `AUCTIONEER` | Busca de obras, `POST /lots` |
| Usuários | `/admin/usuarios` | `ADMIN` | `GET`, `PATCH` e `DELETE /users` |

Erros HTTP da API são apresentados nas telas; `401` encerra a sessão local, enquanto `403`, conflitos e erros de validação preservam a mensagem retornada pelo servidor.
