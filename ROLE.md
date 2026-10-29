# Papéis e permissões

Este documento descreve os perfis de acesso usados pelo frontend Verzel Leilões. A API é a autoridade final para autenticação e autorização; as regras de rota do frontend servem para orientar a navegação e não substituem a validação no servidor.

## Visitante

Pessoa sem sessão autenticada.

Pode:

- Consultar o catálogo público, filtrar leilões e visualizar seus detalhes e lotes.
- Consultar comprovantes e auditorias públicas de lotes encerrados.
- Criar uma conta de licitante e entrar em uma conta existente.

Não pode acessar a sala de disputa, a carteira ou as áreas de gestão.

## Licitante (`BIDDER`)

É o perfil criado pelo cadastro público.

Pode:

- Fazer lances em lotes abertos de leilões ativos.
- Acompanhar a disputa em tempo real e consultar se está liderando ou foi superado.
- Consultar saldo disponível, saldo comprometido e extrato da carteira.
- Adicionar depósitos simulados ao saldo disponível.
- Consultar seus arremates e abrir os comprovantes correspondentes.

O frontend não movimenta dinheiro real. O saldo e as reservas de lance são processados pela API.

## Leiloeiro (`AUCTIONEER`)

Perfil provisionado pela equipe; não é oferecido no cadastro público.

Pode:

- Consultar e administrar os leilões e lotes associados à sua conta.
- Criar e editar leilões e adicionar lotes.
- Buscar dados de obras do Art Institute of Chicago ou preencher os dados do lote manualmente.
- Excluir leilões sem lotes associados.
- Cancelar lotes elegíveis que ainda não receberam lances.
- Consultar a carteira e os recebimentos de arrematações.

## Administrador (`ADMIN`)

Perfil provisionado pela equipe; não é oferecido no cadastro público.

Pode:

- Consultar usuários cadastrados.
- Atualizar nome, e-mail e perfil (`BIDDER`, `AUCTIONEER` ou `ADMIN`) de um usuário.
- Excluir usuários quando permitido pela API.

Alterações de nome e e-mail usam `PATCH /users/:id`. Alterações de perfil usam `PATCH /users/:id/role` com o papel no corpo da requisição. A API valida e aplica a autorização.

## Regras de autorização

- A sessão é validada pela API e usa o perfil retornado por ela; o papel salvo no navegador é apenas um dado de restauração.
- Chamadas autenticadas enviam o token no cabeçalho `Authorization: Bearer <token>`.
- Visitantes que tentam abrir uma rota privada são encaminhados para entrar. Usuários autenticados sem o perfil necessário são encaminhados para a área inicial do próprio perfil.
- A API deve validar token, papel e permissões em toda operação protegida, independentemente dos controles do frontend.
