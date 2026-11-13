# Contexto Rápido — Zelo (Micro SaaS Barbearias & Manicures)

> Arquivo enxuto de memória entre sessões. Atualizar apenas decisões fechadas.

## Decisões Fechadas (MVP Dia 1)
- **Nome Oficial:** **Zelo**
- **Gateway de Assinatura Oficial:** **Asaas** (R$ 0 mensalidade fixa, aceita CPF/CNPJ, PIX/Boleto/Cartão recorrente automático + Webhook).
- **Estrutura de Páginas:**
  - **Landing Page (`/`):** Apresenta o Zelo e converte lojistas (botão para ir à Vitrine; trocar H1 na implementação para *"Sua agenda online, com a cara do seu negócio."*).
  - **Vitrine Regional (`/explorar`):** Filtro por Cidade/Bairro + Categoria (Barbearia / Manicure / Salão).
  - **Link Direto da Loja (`/nome-da-loja`):** Exclusivo da loja, 0 concorrentes, PWA no navegador (inclui estados *Loja Pausada* e *404*).
  - **Entrada & Legais:** `/entrar` (Google OAuth), `/termos` e `/privacidade` (obrigatórias p/ Google OAuth e LGPD).
- **Login Obrigatório Facilitado & Fotos de Perfil Livres:** OAuth Google via Supabase Auth desde o início:
  - **Fotos de Perfil (Cliente, Funcionário/Barbeiro e Dono):** No 1º login com Google, a trigger do banco puxa automaticamente a foto do Google (`raw_user_meta_data` → `perfis.avatar_url` com `avatar_customizado = false`). **Todos os 3 papéis têm liberdade para trocar a própria foto quando quiserem** (upload comprimido no navegador para WebP `<= 40 KB` no bucket `avatars/{user_id}/avatar.webp` com `upsert: true` + `avatar_customizado = true`, impedindo que futuros logins Google sobrescrevam a foto escolhida!). Na loja, o profissional usa `COALESCE(profissionais.avatar_url, perfis.avatar_url)`.
  - **Cliente final:** pede **WhatsApp com DDD no 1º agendamento online** (salvo em `perfis.telefone_whatsapp`), limitado por padrão a **2 reservas futuras ativas por loja** (anti-troll) + botão do dono para bloquear faltosos reincidentes (`bloqueado_online`).
  - **Operação Real de Balcão na Agenda (`Schedule-X`):**
    1. **Encaixe Informal em 3s (`origem = 'manual'`):** Quando chega alguém sem usar o app, o barbeiro toca no horário livre e digita **SÓ o nome e o horário** (sem obrigar WhatsApp e sem obrigar escolher o serviço na hora; quando o cliente levanta da cadeira e o barbeiro clica em **"Concluir Corte"**, escolhe com 1 toque qual serviço foi feito / valor cobrado).
    2. **Adiantar / Esticar Corte ("+ Barba na cadeira") + Reagendamento com Expiração (`RPC reordenar_ou_esticar`):** Se um cliente pedir barba na cadeira (+30m) ou o barbeiro passar alguém de 1h na frente de quem tinha 30m, a RPC usa `EXCLUDE USING gist DEFERRABLE` para reencaixar em sequência/efeito dominó (ou `encaixe_forcado_balcao` no painel). Se não couber hoje, o painel já mostra os **próximos horários vagos** para remarcar com 1 clique ou cancelar. O Web Push/E-mail leva o cliente a um link interno (`/[slug]?remarcar=...`) com horários vagos reais e prazo `confirmacao_expira_em`: se o cliente não responder a tempo, a vaga **auto-expira** (`Lazy Expire` + `pg_cron`) para não ficar travada à toa!
  - **Painel (`/painel`) & Dashboard de Ganhos (Dono vs. Barbeiro):**
    - **Dono:** gerencia a agenda de **todos** os profissionais da loja (cria, move, transfere de barbeiro, conclui, bloqueia folgas — garantido no RLS + FK composta `(profissional_id, loja_id)`), respeita o limite do plano no banco via trigger (`Solo = 1` ativo, `Equipe = até 5`), pode ativar **"Também atendo clientes"** (`eh_dono = true`, `comissao_percentual = 100%`), desliga funcionários sem vazar carteira (limpa `user_id` + assistente para transferir/avisar agendamentos futuros) e tem o **Dashboard do Negócio**: Faturamento Bruto da Loja, Lucro Líquido da Casa, **Fechamento de Comissão da Equipe** (quanto pagar para cada barbeiro no sábado/fim do mês com 1 clique pro Zap!), Serviços Campeões e Taxa de Faltas.
    - **Profissional/Funcionário:** loga com Google e vê apenas **sua própria agenda, seus clientes do dia e o seu Dashboard Pessoal ("Meu Bolso")**: quanto já lucrou Hoje/Semana/Mês (já calculado na sua `%` de comissão congelada em `comissao_barbeiro_centavos`) + previsão de ganhos dos cortes restantes do dia.
  - **Configurações & Meu Perfil (`/conta` e `/painel/configuracoes`):** Tela dedicada para todos os papéis — **Cliente** (trocar foto WebP ou restaurar foto Google, editar WhatsApp, toggles Web Push/E-mail, Logout e Exclusão LGPD), **Funcionário** (foto própria, especialidade na vitrine, Push, Claro/Escuro do painel, ver `% comissão`, Logout) e **Dono** (perfil + dados da loja, regras de antecedência/limite, Chave PIX, Claro/Escuro, **Pausar Loja/Férias** e LGPD).
  - **Super Admin (`/super-admin`):** exclusivo do fundador, blindado em 4 camadas (Allowlist UID, MFA AAL2, `server-only`, Cloudflare Access) com métricas de decisão, semáforo e exportação `.CSV`/IA.
- **Autonomia do Cliente & Regras Anti-Brecha:** Pode **desmarcar** e **remarcar** sozinho pelo app, mas **ambos** respeitam `antecedencia_cancel_min` e têm limite de **2 remarcações** por reserva (evita burlar cancelamento em cima da hora). Permite também agendar para **filho/amigo** (`Alterar nome atendido`). Todo agendamento confirma na hora (`status = 'confirmado'`).
- **Pagamento no Balcão + Chave PIX Facilitada (Zero Pagamento Online no MVP):** O cliente paga lá na hora na loja. Se o negócio cadastrou `chave_pix`, o app exibe um cartão limpo com **QR Code estático + botão Copiar Chave PIX** (gerados no navegador a custo R$ 0) para facilitar na hora. *(Asaas fica exclusivo da assinatura mensal do lojista).*
- **Horários da Semana & Dias Especiais Temporários (Multi-Nicho):** Válido para Barbearia, Manicure, Salão, Estética, etc. O painel configura os dias da semana (`Dom` a `Sáb`), turnos e pausa/almoço (`horarios_loja` e `horarios_semana`), bloqueia folgas/feriados (`fechado_dia_todo` / `bloqueio_horas`) **e permite ativar "Dia Especial Aberto"** (`agenda_excecoes.tipo = 'aberto_especial'`), como abrir excepcionalmente só neste domingo das 09h às 14h sem alterar a rotina semanal fixa.
- **Notificações (Risco Zero de Ban & Resiliente a 100/dia):** Sem robô não-oficial de WhatsApp.
  - **Web Push no PWA (prioridade #1, R$ 0)** + **E-mail transacional gratuito** (Resend: 3.000/mês, 100/dia) sempre isolado pós-commit (erro `429` **nunca** quebra uma reserva; aos 80/100 e-mails preserva cota só para lojistas) + botão opcional de WhatsApp.
- **Integridade Operacional & Multi-Unidade:**
  - `lojas.timezone` soberana para todos os fusos do Brasil; `lojas_slugs_historico` garante redirect `308` em cache para links antigos do Instagram + blocklist de slugs do sistema (`/painel`, `/api`, `/explorar`).
  - Bloqueio de folga/feriado alerta se já existem clientes marcados (oferecendo transferir ou pedir reagendamento em 1 clique).
  - Ao concluir corte, permite desmarcar serviço desistido ou dar desconto/cortesia (`valor_final_centavos`, `desconto_centavos`, `eh_cortesia`), batendo a comissão centavo por centavo. Horários já passados sem baixa (`fim < now()`) vão para **"Pendentes de Baixa"** com botão 1-toque (`[Feito]` / `[Faltou]` / `[Confirmar todos]`) — e nunca bloqueiam novas reservas futuras do cliente.
  - Suporta dono com 2+ lojas e barbeiro trabalhando em 2 lojas no mesmo Google (Loja Switcher + trava cross-store).
  - Webhook Asaas chama `revalidateTag` na hora (desbloqueia loja no domingo em `<1s` após PIX).
- **Features UX (Base Booksy no MVP):** Escolher profissional, `+ Adicionar outro serviço` (soma tempo/R$), barra colorida de disponibilidade, turnos Manhã/Tarde/Noite, botão `"Próxima disponibilidade"`, modal `"Descartar reserva?"`, Abas Serviços/Detalhes/Mapa.
- **4 Estilos Visuais + Customização Livre (CSS Tokens):** Urban Noir, Clean Glam, Neo-Brutalist Pop, Minimalist Slate + lojista ajusta **Cor Principal** e **Arredondamento das Bordas**.
- **Padrões de UI Obrigatórios (`AGENTS.md`):** **Zero emojis em telas reais** (usar **100% Lucide Icons** `lucide-react`; emojis só no chat) e **contenção visual de bordas** (não colocar bordas em todos os cards; priorizar contraste suave de fundo e espaçamento, deixando bordas marcadas para inputs, botões ou tema Neo-Brutalist).
- **Landing Page Aprovada (v5 — Fusão Notion + Cal.com):** Dark/Light mode automático com toggle Meia-Lua, **GSAP** (Odometer vertical por dígito no Hero + Demo viva com cursor no desktop e retorno após 8s de ociosidade + layout 100% responsivo no celular), Footer profissional (Cloudflare Email Routing grátis pro Gmail no deploy). App do cliente em **CSS Transitions leves** (máxima velocidade no 4G).
- **Stack Custo R$ 0,00 (Opção A Confirmada):**
  - **Front:** Next.js (App Router + TypeScript) + React + Tailwind CSS + `shadcn/ui` + Lucide Icons (`lucide-react`) + CSS Variables (`zelo-theme-tokens`).
  - **Agenda Visual (`/painel`):** **Schedule-X (Core MIT 100% gratuito e comercializável em código fechado)** + MCP oficial (`@schedule-x/mcp`) para o painel do dono/funcionários; tela do cliente (`/[slug]`) mantém pílulas leves para abertura `<50ms` no 4G.
  - **Back & Seg:** Next.js API Routes/Actions (`server-only`) + Supabase Postgres 500MB (RLS por `loja_id` + trava anti-double-booking `EXCLUDE USING gist`) + Cloudflare Turnstile (anti-bot/IA) + Upstash Rate Limit + `Zod`.
  - **Hospedagem Comercial Free:** Cloudflare Pages/Workers via OpenNext (permite uso comercial no Free; Vercel Hobby apenas em dev/testes).
  - **QA & Testes:** `Vitest` (unit/API/RLS) + `Playwright` (E2E mobile 360px/PC) + `Grafana k6` (teste de carga até 1.000 VUs).
  - **Metodologia:** Kanban em Fatias Verticais (7 Etapas com Prova de Conclusão / DoD), documentado em `PLANO_ENGENHARIA_E_NEGOCIO.md`.

## Notas Técnicas Críticas (NÃO ESQUECER!)
- **iPhone / iOS Safari Web Push:** A Apple SÓ libera notificações push se o usuário clicar em *"Compartilhar → Adicionar à Tela de Início"*. Incluir banner visual guiando usuários de iOS + fallback garantido por E-mail.
- **Limites de E-mail Grátis:** Resend (3.000/mês, 100/dia, limpo); Mailtrap (4.000/mês, 150/dia); Brevo (300/dia, mas coloca rodapé "Sent with Brevo").
- **E-mail Profissional Grátis no Deploy:** Usar **Cloudflare Email Routing** para redirecionar `contato@zelo...` pro Gmail pessoal a R$ 0,00.

## Fase V2 (Pós-Primeiras Vendas — Separado do MVP)
- Portfólio de fotos embaixo de cada serviço.
- Avaliações verificadas com estrelas + fotos enviadas por clientes.
- Pacotes / Combos pré-pagos (ex: 4 cortes/mês).
- API Oficial do WhatsApp Cloud (Meta) quando já tiver faturamento recorrente.
- Multi-idioma (Inglês/Espanhol) + Stripe em Dólar (MVP 100% focado em Português-BR + Asaas).

## Próximos Passos do Planejamento
- [x] Estilo visual da **Landing Page** do Zelo aprovado (v5 responsiva + Dark/Light + GSAP).
- [x] **Fluxo de telas completo** + **Super Admin** + **Esquema do Banco Multi-tenant (Supabase)** desenhados no Excalidraw (`planejamento.excalidraw`).
- [ ] **Etapa 1 do MVP:** Setup Next.js + Tailwind + shadcn + Supabase local (`supabase start`) + migrations + RLS.
