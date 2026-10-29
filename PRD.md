# PRD — Verzel Leilões

## 1. Visão do produto

Verzel Leilões é uma aplicação web para descobrir leilões de arte, acompanhar lotes, participar de disputas ao vivo e consultar os registros públicos de um arremate. A aplicação também oferece ferramentas de operação para leiloeiros e administração de usuários.

Este PRD registra o escopo observado no frontend atual e no README do projeto. As permissões detalhadas por perfil estão em [ROLE.md](./ROLE.md).

## 2. Problema e objetivo

O produto reúne em uma única interface o catálogo de leilões, a disputa de lances, o controle de saldo e a consulta posterior de comprovantes e auditorias. O objetivo é permitir que cada pessoa acompanhe o processo de ponta a ponta, enquanto leiloeiros administram leilões e lotes e a equipe gerencia as contas.

## 3. Usuários

- **Visitante:** explora o catálogo e os registros públicos e pode criar uma conta.
- **Licitante (`BIDDER`):** participa dos leilões, consulta sua carteira e acompanha seus arremates.
- **Leiloeiro (`AUCTIONEER`):** cria leilões, cadastra lotes e acompanha os recebimentos.
- **Administrador (`ADMIN`):** gerencia dados de usuários.

O cadastro público cria somente licitantes. Contas de leiloeiro e administrador são provisionadas pela equipe.

## 4. Escopo funcional

### 4.1 Catálogo público

- Listar leilões publicados e filtrar por todos, ao vivo, agendados ou encerrados.
- Destacar um leilão ativo e oferecer acesso à sala do lote aberto mais próximo do encerramento.
- Exibir detalhes do leilão, período, leiloeiro e lotes disponíveis.
- Adaptar navegação e conteúdo a dispositivos móveis e telas maiores.

### 4.2 Conta e sessão

- Permitir cadastro de licitante com nome, e-mail e senha de pelo menos oito caracteres.
- Permitir entrada com e-mail e senha.
- Restaurar e validar a sessão junto à API ao abrir a aplicação.
- Encerrar a sessão quando a API indicar que o token é inválido ou expirou.

### 4.3 Disputa ao vivo

- Permitir que licitantes entrem na sala de lotes abertos de leilões ativos.
- Atualizar lances, liderança e resultado por eventos Socket.IO.
- Validar o lance mínimo e o incremento conforme os dados do lote e as regras da API.
- Reservar saldo enquanto um licitante lidera e liberar a reserva se outro lance o superar.
- Prorrogar o encerramento do lote em dois minutos quando houver lance nos dois minutos finais.

### 4.4 Carteira e arremates

- Exibir saldo disponível, comprometido e total, além do extrato de movimentações.
- Permitir depósitos simulados para licitantes; não há movimentação de dinheiro real no frontend.
- Exibir os arremates do licitante e permitir abrir seus comprovantes.
- Exibir recebimentos de arrematação na carteira do leiloeiro.

### 4.5 Operação de leilões e lotes

- Permitir ao leiloeiro criar e editar leilões, definindo título, descrição, período e situação.
- Permitir cadastrar lotes vinculados a leilões elegíveis.
- Buscar obras no Art Institute of Chicago e permitir cadastro manual quando a busca falhar.
- Permitir cancelar lotes sem lances que ainda possam ser cancelados.
- Restringir a exclusão de leilões com lotes associados.

### 4.6 Administração de usuários

- Permitir que administradores consultem, filtrem, editem nome, e-mail e papel (`BIDDER`, `AUCTIONEER` ou `ADMIN`) e excluam usuários.
- Atualizar nome e e-mail via `PATCH /users/:id` e papel via `PATCH /users/:id/role`; a API valida e aplica a permissão.
- Respeitar as restrições de exclusão retornadas pela API.

### 4.7 Comprovantes e auditoria

- Disponibilizar comprovantes públicos com dados do lote, leilão, resultado e hash de referência.
- Permitir salvar o comprovante como PDF pelo diálogo de impressão do navegador.
- Exibir auditoria pública dos lances, incluindo a integridade informada pela API.
- Não exibir nome, e-mail ou identificação do vencedor nos registros públicos.

## 5. Regras de negócio

- Os estados do leilão são `DRAFT`, `SCHEDULED`, `ACTIVE`, `FINISHED` e `CANCELLED`.
- Os estados de lote usados pela interface são `OPEN`, `WAITING`, `SOLD`, `UNSOLD` e `CANCELLED`.
- Um lance só pode ser feito quando o leilão está ativo e o lote está aberto.
- Depósitos são simulados; lances e reservas são processados pela API.
- Cadastro público não permite escolher perfil de leiloeiro ou administrador.
- Dados de sessão, saldo, lances e permissões dependem da API. O frontend não deve tratá-los como fonte de autoridade.

## 6. Requisitos não funcionais

- Interface responsiva para celulares, tablets e desktops.
- Navegação compatível com teclado e controles identificados para tecnologias assistivas.
- Suporte a tema claro e escuro, com preferência salva no navegador.
- Valores monetários e datas apresentados em formatos locais do Brasil.
- Tratamento de erros HTTP, falhas de conexão e indisponibilidade de serviços externos.
- Comprovantes imprimíveis em papel A4 usando recursos do navegador.

## 7. Integrações e restrições técnicas

- **API Verzel Leilões:** autenticação, usuários, leilões, lotes, lances, carteira, comprovantes e auditorias.
- **Socket.IO:** eventos de preparação da sala, lances, liderança, encerramento e resultado.
- **Art Institute of Chicago:** busca opcional de obras para auxiliar no cadastro de lotes.
- **PDF:** gerado pelo navegador via impressão; não existe endpoint de geração de PDF no frontend.
- A URL da API é configurada por `VITE_API_URL`. Variáveis `VITE_*` não devem conter segredos.

## 8. Critérios de aceite do produto atual

- Um visitante consegue abrir o catálogo, filtrar leilões, ver detalhes, comprovantes e auditorias públicas.
- Um visitante consegue criar uma conta de licitante e entrar; perfis sem permissão não acessam rotas privadas.
- Um licitante consegue participar de uma sala elegível, acompanhar mudanças em tempo real e consultar carteira e arremates.
- Um leiloeiro consegue criar e administrar leilões e lotes dentro das regras de elegibilidade.
- Um administrador consegue atualizar nome, e-mail e papel dos usuários.
- O comprovante pode ser impresso ou salvo em PDF e a auditoria apresenta o resultado calculado pela API.
- Layout e navegação permanecem utilizáveis em telas estreitas e largas.

## 9. Fora do escopo confirmado

- Processamento de pagamentos ou depósitos reais.
- Cadastro público de leiloeiros ou administradores.
- Geração de PDF por serviço próprio do frontend.
- Alteração de permissões sem validação da API.

## 10. Métricas sugeridas

O código atual não registra métricas de produto. Para avaliar evolução futura, podem ser acompanhadas a conversão de visita em cadastro, participação em salas ao vivo, taxa de conclusão de lances e uso de comprovantes e auditorias. Essas métricas exigem instrumentação e definição de metas antes de serem tratadas como requisitos.
