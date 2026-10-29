# Verzel Leilões — Frontend

Frontend da plataforma Verzel Leilões, integrado à [API Verzel Leilões](https://github.com/JanieleCristina006/leilao). A aplicação usa React 19, TypeScript, Vite, Tailwind CSS, React Router e Socket.IO.

## Recursos

- Consulta de leilões e lotes, com sala de disputa ao vivo.
- Áreas para licitantes, leiloeiros e administradores.
- Carteira, extrato, lances e histórico de arremates.
- Tema claro e escuro, com preferência salva no navegador.
- Comprovante público com opção de salvar em PDF pelo diálogo de impressão do navegador.
- Consulta de auditoria e busca de obras para cadastro de lotes.

## Requisitos e execução

Instale Node.js e npm. Na pasta do frontend, instale as dependências e inicie o servidor de desenvolvimento:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

O Vite informa o endereço local no terminal, normalmente `http://localhost:5173`.

Por padrão, o frontend usa `https://leilao.vps10920.panel.icontainer.online`. Para usar outra instância, altere `VITE_API_URL` em `.env.local`:

```env
VITE_API_URL=https://endereco-da-api
```

Variáveis `VITE_*` são incluídas no código entregue ao navegador; não coloque segredos nelas. O cadastro público cria usuários `BIDDER`. Contas `AUCTIONEER` e `ADMIN` precisam ser provisionadas pela API.

## Comandos

```bash
npm run dev      # servidor local
npm run build    # verificação TypeScript e build de produção
npm run preview  # pré-visualizar o build
```

## Rotas da interface

| Tela | Rota | Acesso | Integração principal |
|---|---|---|---|
| Entrar | `/entrar` | Público | `POST /auth/login`, `GET /auth/me` |
| Criar conta | `/cadastro` | Público | `POST /users` |
| Leilões | `/leiloes` | Público | `GET /auctions`, `GET /lots` |
| Detalhes do leilão | `/leiloes/:id` | Público | `GET /auctions/:id`, `GET /lots` |
| Sala ao vivo | `/lotes/:id/sala` | `BIDDER` | `GET /lots/:id`, Socket.IO, `POST /bids` |
| Meus arremates | `/meus-arremates` | `BIDDER` | `GET /bids/me/wins`, comprovantes |
| Carteira | `/carteira` | `BIDDER`, `AUCTIONEER` | `/wallet/me`, `/wallet/me/transactions`, `/wallet/deposits` |
| Comprovante | `/lotes/:id/comprovante` | Público | `GET /lots/:id/receipt` |
| Auditoria | `/lotes/:id/auditoria` | Público | `GET /lots/:id/audit` |
| Meus leilões | `/leiloeiro/leiloes` | `AUCTIONEER` | `/auctions/mine`, `/lots/mine` |
| Criar/editar leilão | `/leiloeiro/leiloes/novo`, `/leiloeiro/leiloes/:id/editar` | `AUCTIONEER` | `POST /auctions`, `PATCH /auctions/:id` |
| Novo lote | `/leiloeiro/lotes/novo` | `AUCTIONEER` | Busca de obras, `POST /lots` |
| Usuários | `/admin/usuarios` | `ADMIN` | `GET /users`, `PATCH /users/:id`, `PATCH /users/:id/role`, `DELETE /users/:id` |

## Autenticação e permissões

- O token é enviado em `Authorization: Bearer <token>` nas chamadas autenticadas.
- Ao restaurar uma sessão, o frontend consulta `GET /auth/me` e usa o perfil confirmado pela API. Se a sessão não puder ser validada, ela é removida.
- As rotas privadas verificam o perfil: sem sessão, encaminham para entrar; com perfil sem permissão, encaminham para a página inicial daquele perfil.
- A barra de endereço continua editável. A proteção de rota controla a navegação no frontend; a API também precisa validar sessão e permissões em cada operação protegida.

## Integração com a API

- Leilões e lotes usam `GET /auctions` e `GET /lots`; as telas de leiloeiro e administrador consultam os endpoints específicos de cada perfil.
- Depósitos e lances enviam valores decimais textuais com duas casas, por exemplo `"100.00"`. No cadastro de lotes, `startingBid` e `minimumIncrement` seguem o DTO da API como números.
- A sala ao vivo autentica o Socket.IO com `auth.token`, aguarda `live.ready` e acompanha eventos de lote, lance, liderança e resultado.
- Administradores alteram o papel de uma conta via `PATCH /users/:id/role`, enviando `{ "role": "BIDDER" }`, `{ "role": "AUCTIONEER" }` ou `{ "role": "ADMIN" }`.
- A busca de obras usa `/lots/artworks/search?q=...`. Se o serviço estiver indisponível, os dados do lote podem ser preenchidos manualmente.
- Erros HTTP são apresentados na interface; respostas `401` encerram a sessão e respostas `403`, conflitos e erros de validação mostram a mensagem da API.

## Comprovante em PDF

O botão **Baixar PDF** abre a impressão do navegador, formatada para imprimir somente o comprovante em papel A4. No diálogo, selecione **Salvar como PDF**. O arquivo é montado pelo navegador com os dados exibidos; não há endpoint de geração de PDF.
