# Plano de Engenharia, Segurança, Qualidade e Negócios — Zelo (MVP)

> Documento consolidado da pesquisa dos 3 subagentes especializados (Infraestrutura & Limites Free Tier, Segurança & QA/Testes, Mentoria de Desenvolvimento & Estratégia de Negócio).

---

## 1. Stack Oficial Confirmada (Opção A: Next.js + Supabase)

- **Front-end:** Next.js (App Router + TypeScript) + React 19 + Tailwind CSS + `shadcn/ui` + Lucide Icons (`lucide-react`, zero emojis em telas reais) + **Schedule-X (Core MIT grátis)** para a agenda visual do `/painel` + CSS Custom Properties (`zelo-theme-tokens`) + GSAP 3 (apenas na Landing Page; tela pública da loja usa pílulas leves e CSS Transitions para máxima velocidade no 4G).
- **Back-end:** Next.js Route Handlers / Server Actions (protegidas com `server-only`) + Supabase PostgreSQL (com Supavisor Pooler na porta `6543`) + Supabase Auth (Google OAuth) + Supabase Storage (imagens convertidas para WebP `<= 100 KB`).
- **Hospedagem (Alerta Comercial Importante):**
  - **Vercel Hobby (Free):** Excelente para desenvolvimento e testes, mas os Termos de Serviço da Vercel **proíbem uso comercial/SaaS no plano Hobby**.
  - **Cloudflare Pages / Workers (via `@opennextjs/cloudflare`):** **Permite uso comercial no plano gratuito**, tem banda (Egress) ilimitada e até 100.000 requisições dinâmicas/dia grátis (e o plano pago, se um dia precisar de mais de 10ms de CPU por request, custa US$ 5/mês vs. US$ 20/mês da Vercel Pro).

---

## 2. Limites Reais do Plano R$ 0,00 e Capacidade Matemática

| Serviço (Free Tier) | Limite Atual (2025/2026) | Consumo por Loja / Cliente | Capacidade Real no R$ 0,00 |
| :--- | :--- | :--- | :--- |
| **Supabase Postgres** | **500 MB** (~460 MB úteis) | ~15 KB/loja + ~2 KB/cliente + ~1 KB/agendamento | **100 a 500+ lojas ativas**, 50.000 clientes e **+300.000 agendamentos** |
| **Supabase Storage** | **1 GB** + 5 GB Cached / 5 GB Uncached Egress | ~800 KB/loja (Logo + Capa + Avatares em WebP) | **~1.000 lojas completas** (usando cache CDN `max-age=31536000`) |
| **Supabase Auth** | **50.000 MAUs** (usuários ativos/mês) | 1 MAU por usuário único logado no mês | **50.000 clientes/lojistas ativos por mês** |
| **Supabase Inatividade** | Pausa após **7 dias sem uso** | Qualquer query real mantém ativo | Sem custo (ou 1 cron semanal simples enquanto não houver tráfego) |
| **Resend (E-mail)** | **3.000/mês** e **100 e-mails/dia** | 1 a 2 e-mails por operação | **GARGALO #1:** Estoura com ~50–100 agendamentos/dia na plataforma |

### Como contornamos o Gargalo #1 (Resend 100 e-mails/dia) a Custo R$ 0,00:
1. **Notificação principal via Web Push PWA (100% grátis e ilimitado):** O barbeiro e o cliente recebem alerta push direto no navegador/celular sem gastar cota de e-mail.
2. **Comprovante instantâneo na tela + botão 1-clique para WhatsApp:** O cliente vê o card confirmado na hora e pode enviar no WhatsApp da loja com 1 toque.
3. **E-mail do Resend focado no essencial:** Boas-vindas do lojista, alertas de assinatura Asaas e fallback quando o usuário não tiver Web Push ativo (especialmente iOS Safari sem PWA instalado).

---

## 3. Desempenho do Next.js sob Pressão (Como Abrir em < 50ms no 4G)

O Next.js só fica lento quando o desenvolvedor força SSR dinâmico em todas as visitas (`cookies()` no layout público) ou faz queries em cascata. No Zelo aplicaremos **4 travas de performance**:

1. **ISR / Cache On-Demand na Loja Pública (`/[slug]` e `/explorar`):**
   - A casca da loja (tema, cores, nome, endereço, serviços, profissionais) fica em cache na borda (`unstable_cache` / `use cache` + `revalidateTag('store-' + slug)`).
   - Abre em **20–50ms** e gasta **ZERO queries no Supabase** quando centenas de clientes abrem o link da bio no Instagram.
   - Só revalida quando o próprio dono salva uma alteração no painel (`/painel`).
2. **Busca Dinâmica Apenas para os Slots do Dia (< 1 KB de JSON):**
   - Apenas os horários livres do dia selecionado são consultados via RPC enxuta.
3. **Índice Composto Parcial (Index-Only Scan em < 2ms no Postgres):**
   ```sql
   CREATE INDEX idx_agendamentos_disponibilidade
   ON agendamentos (loja_id, profissional_id, inicio, fim)
   WHERE status IN ('pendente', 'confirmado');
   ```
4. **Mesma Região Geográfica:** Servidor Serverless e banco Supabase configurados na mesma região (ex.: `sa-east-1` São Paulo ou `us-east-1`), eliminando 150ms de latência por roundtrip.

---

## 4. Segurança Real (Anti-Bots de IA, Isolamento Multi-Tenant e LGPD)

1. **Supabase RLS (Row Level Security) em 100% das Tabelas:**
   - Todas as tabelas possuem `loja_id UUID NOT NULL` e `ENABLE ROW LEVEL SECURITY`.
   - **Proibido `SELECT` público direto na tabela `agendamentos`:** Evita que um script use a `ANON_KEY` para raspar o nome e o telefone de todos os clientes das barbearias. A vitrine consulta horários ocupados apenas via função RPC (`SECURITY DEFINER`) que retorna somente `(profissional_id, inicio, fim)` sem dados pessoais.
   - `SUPABASE_SERVICE_ROLE_KEY` isolada em arquivo com `import 'server-only'`, usada apenas no Webhook do Asaas.
2. **Proteção contra Bots e Ataques Automatizados com IA:**
   - **Cloudflare Turnstile (Invisível e Gratuito):** Validação criptográfica server-side antes de confirmar agendamento ou criar loja, impedindo que bots lotem a agenda de um barbeiro com reservas falsas.
   - **Rate Limiting (`@upstash/ratelimit` Redis Free):** Limite por IP (máx. 5 agendamentos / 15 min) e limite de agendamentos futuros simultâneos por conta/telefone na mesma loja.
3. **Trava Matemática Anti-Double-Booking no PostgreSQL (`btree_gist`):**
   - Impede fisicamente no banco que 2 clientes reservem o mesmo barbeiro no mesmo milissegundo:
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;

   ALTER TABLE agendamentos
   ADD CONSTRAINT agendamentos_sem_sobreposicao_profissional
   EXCLUDE USING gist (
     profissional_id WITH =,
     tstzrange(inicio, fim, '[)') WITH &&
   )
   WHERE (status IN ('pendente', 'confirmado'));
   ```
   - Se 50 pessoas clicarem juntas às 14:00, a 1ª grava e as outras 49 recebem o código SQL `23P01` convertido em aviso amigável na tela.
4. **Webhooks Asaas Blindados + Zod + LGPD:**
   - Verificação do header `asaas-access-token` com `crypto.timingSafeEqual` + tabela `webhook_events` para idempotência (`ON CONFLICT DO NOTHING`).
   - Validação estrita com `zod` (`.strict()`) em todas as entradas.
   - **LGPD:** Coleta mínima (apenas Nome, E-mail OAuth e WhatsApp, sem CPF do cliente final da barbearia), zero dados pessoais em URLs/logs e opção de exclusão/anonimização.

---

## 5. Stack de Testes (Código, Segurança e Carga)

| Camada | Ferramenta | O que valida |
| :--- | :--- | :--- |
| **1. Unitário & API** | **Vitest** | Cálculo de horários disponíveis (`gerarSlotsDisponiveis`), fuso horário, schemas `Zod` e idempotência do Webhook Asaas |
| **2. Segurança Multi-tenant** | **Vitest + Supabase** | Prova automatizada de que o Lojista A recebe `0 linhas / erro 42501` ao tentar ler/editar a Loja B, que anônimos não leem telefones e que 2 reservas simultâneas disparam `23P01` |
| **3. Ponta a Ponta (E2E)** | **Playwright** | Simulação real Mobile (`390x844` / `360px`) e Desktop: cliente agenda → dono bloqueia horário → vitrine reflete na hora |
| **4. Carga & Estresse** | **Grafana k6** | Simula **100 a 1.000 usuários simultâneos** abrindo vitrines (`p95 < 400ms`) e **100 pessoas disputando o mesmo horário** (1 sucesso, 99 conflitos limpos `409`, zero erro `500`) |

---

## 6. Metodologia de Desenvolvimento (Mentoria: Por que NÃO usar Scrum)

- **Por que NÃO Scrum:** Scrum foi criado para times de 5–9 pessoas com reuniões diárias, *Sprint Planning* e *Story Points*. Para **1 dev + IA**, isso é burocracia sem ganho.
- **Nosso Modelo: Kanban em Fatias Verticais (*Vertical Slices*) + *Definition of Done (Prova de Conclusão)*:**
  - Construímos **uma funcionalidade completa de ponta a ponta por vez** (Banco + Regra + Tela + Teste).
  - Nenhuma etapa passa para a próxima sem cumprir a **Prova Prática** (clicar no navegador em 360px e PC) e a **Prova Automatizada** (testes passando no verde).

### As 7 Etapas do MVP e a Prova de Conclusão de Cada Uma

1. **Etapa 1 — Fundação, Banco Multi-Tenant (RLS) e Login Google OAuth:**
   - *Entrega:* Projeto Next.js + Tailwind + `shadcn/ui`, schema Supabase com RLS ativo, login Google e `/onboarding` criando loja.
   - *Prova de Conclusão:* Criar "Loja A" e "Loja B" no navegador + teste automatizado RLS provando que a Loja A não lê nem altera nada da Loja B.
2. **Etapa 2 — Painel do Dono: Serviços, Expediente e Customizador White-Label:**
   - *Entrega:* CRUD de serviços/profissionais, horários da semana e customizador (`zelo-theme-tokens`: 4 estilos, cor, borda, chave PIX).
   - *Prova de Conclusão:* Cadastrar serviços e alternar entre *Urban Noir*, *Clean Glam*, *Neo-Brutal* e *Slate* vendo o preview mudar + testes `Zod` de validação.
3. **Etapa 3 — Motor Matemático de Disponibilidade:**
   - *Entrega:* Função determinística que cruza expediente, duração de múltiplos serviços (`+ Adicionar outro serviço`), bloqueios e reservas existentes.
   - *Prova de Conclusão:* Suíte **Vitest** 100% verde cobrindo almoço, serviços somados (ex.: 35 + 25 = 60 min), borda de expediente e fuso `America/Sao_Paulo`.
4. **Etapa 4 — Loja Pública (`/[slug]`), Vitrine (`/explorar`) e Reserva Anti-Double-Booking:**
   - *Entrega:* Página pública com cache ISR, busca por cidade/bairro na Vitrine, fluxo de reserva com Google OAuth + PIX + trava `EXCLUDE USING gist` no banco.
   - *Prova de Conclusão:* Agendar em tela de 360px + teste disparando `Promise.all` com 2 reservas idênticas no mesmo milissegundo (1 grava, 1 retorna conflito amigável).
5. **Etapa 5 — Gestão de Agenda do Dono, Autonomia do Cliente e Notificações:**
   - *Entrega:* Agenda visual em **Schedule-X MIT** (filtro/cores por profissional), dono com opção configurável **"Também atendo clientes"** + cadastro/convite de funcionários (cada funcionário vê apenas seus horários e clientes do dia), bloqueio de folgas, aba `Clientes`, aba `Meus Horários`, Web Push PWA (guia iOS) + Resend + 1-clique WhatsApp.
   - *Prova de Conclusão:* Teste E2E no **Playwright**: cliente agenda (salvando WhatsApp no 1º acesso) → funcionário vê só os seus clientes → cliente cancela → vaga volta na hora para a vitrine.
6. **Etapa 6 — Assinatura SaaS (14 Dias Grátis + Asaas PIX/Cartão/Boleto):**
   - *Entrega:* Controle de trial de 14 dias, integração com API do Asaas e Webhook autenticado/idempotente liberando ou pausando a loja.
   - *Prova de Conclusão:* Simular pagamento no Sandbox do Asaas destravando a loja + teste Vitest de idempotência e rejeição `401` sem token.
7. **Etapa 7 — Landing Page Final, Teste de Carga (k6) e Deploy em Produção:**
   - *Entrega:* Integração da Landing Page v5 aprovada (frase do Hero: *"Sua agenda online, com a cara do seu negócio."*), páginas `/entrar`, `/termos` e `/privacidade`, bateria de carga no **Grafana k6** e deploy em produção.
   - *Prova de Conclusão:* `npm run build` limpo, Playwright + Vitest 100% verdes, auditoria `chrome-devtools` / `a11y-debugging` / `debug-optimize-lcp` aprovada e agendamento real em produção.

---

## 7. Estratégia de Negócio, Diferenciação e Matemática do 1º Lucro

### O que nos diferencia de verdade na rua (vs. Booksy, Trinks, AppBarber)
1. **Link 100% exclusivo da loja (Zero concorrentes):** O barbeiro não manda o cliente dele para um shopping cheio de barbearias vizinhas.
2. **Sem baixar aplicativo na App Store/Play Store:** Abre em < 1s no navegador do celular e usa 1 clique com Google.
3. **Identidade visual de verdade:** Os 4 temas + cor + borda deixam a página com a cara do estúdio (barbearia dark, studio de unhas rosé, estúdio jovem brutalista).
4. **Preço de 1 corte por mês:** R$ 29,90 a R$ 34,90/mês no plano Solo (sem mensalidade de R$ 100+ nem taxa escondida por cliente).

### Como conseguir os primeiros 5 a 10 clientes pagantes ("Técnica da Loja Pronta na Mão")
1. Mapear no Instagram/Google Maps 15 barbearias e estúdios de manicure do seu bairro que já postam bem, mas ainda agendam no braço via link do WhatsApp na bio.
2. **Criar a loja deles no Zelo antes de abordar (leva 2 min):** colocar o nome, a logo do Instagram deles, o tema certo e 3 serviços reais.
3. Mostrar ao vivo no celular (presencialmente em horário calmo, terça/quarta, ou em vídeo curto de 30s no Direct mostrando a tela com a loja deles pronta) e liberar os **14 dias grátis**.
4. **Indicação cruzada:** *"Cada amigo barbeiro ou manicure que você indicar e assinar te dá 1 mês grátis"*.

### Matemática Realista do Primeiro Lucro
- **Infraestrutura inicial:** **R$ 0,00/mês** (Cloudflare + Supabase Free + Resend Free + Web Push).
- **Domínio próprio (`.com.br` ou `.app`):** ~R$ 40,00/ano (~R$ 3,33/mês).
- **Taxa do Asaas:** R$ 0,00 de mensalidade fixa; desconta apenas ~R$ 1,99 por assinatura paga via PIX.
- **Resultado por assinante Solo (R$ 29,90/mês):** sobram **R$ 27,91 líquidos/mês**.
  - **1º cliente pagante:** já cobre praticamente o ano inteiro do domínio.
  - **2º cliente pagante em diante:** **100% lucro líquido (> 93% de margem)**.
  - **10 clientes pagantes (Solo R$ 34,90):** ~**R$ 325/mês de lucro líquido** ainda rodando no plano gratuito de infraestrutura.


---

## 8. Auditoria de QA do Banco de Dados & Fotos de Perfil (Google Auth + Upload Livre)

### 8.1. Fotos de Perfil: Google OAuth Automático + Liberdade de Troca (Dono, Barbeiro e Cliente)
1. **Puxada Automática no 1º Login:** Quando qualquer pessoa (Dono, Barbeiro/Funcionário ou Cliente) entra com Google, a trigger `on_auth_user_created` copia `raw_user_meta_data->>'avatar_url'` (ou `'picture'`) para `public.perfis.avatar_url` com `avatar_customizado = false`.
2. **Liberdade Total para Trocar a Foto Depois (Sem o Google Sobrescrever!):**
   - O Supabase Auth reescreve `raw_user_meta_data` em todo novo login Google. Para que o Google **nunca apague** a foto própria que o usuário escolheu no Zelo, a coluna `perfis.avatar_customizado BOOLEAN DEFAULT false` funciona como trava:
   - Assim que o Cliente, Barbeiro ou Dono sobe uma foto própria (convertida no próprio navegador via `<canvas>` para **WebP 256×256px `<= 40 KB`**), salvamos no Storage e marcamos `avatar_customizado = true`.
   - Na vitrine da loja (`/[slug]`), a foto exibida do profissional usa `COALESCE(profissionais.avatar_url, perfis.avatar_url)`.
3. **Isolamento no Supabase Storage (Zero Lixo no 1 GB Grátis):**
   - **Bucket `avatars` (`file_size_limit = 46080` / ~45 KB, `image/webp`):** Caminho fixo `avatars/{auth.uid()}/avatar.webp` com `upsert: true` (substitui o arquivo antigo em vez de acumular fotos órfãs). RLS garante matematicamente que cada usuário só altera sua própria pasta `(storage.foldername(name))[1] = auth.uid()::text`.
   - **Bucket `lojas-media` (`file_size_limit = 102400` / 100 KB, `image/webp`):** Caminho `lojas-media/{loja_id}/logo.webp` e `capa.webp` restrito via RLS apenas ao `owner_id` daquela loja.

### 8.2. 7 Ajustes Críticos Validados pelo QA no Schema (`Bloco 6`)
1. **Encaixe Manual no Balcão (Cliente sem Conta Google):** `agendamentos.cliente_id` é **`NULLABLE`** com `origem ('online' | 'manual')` e `CHECK (cliente_id IS NOT NULL OR (cliente_nome IS NOT NULL AND cliente_whatsapp IS NOT NULL))`, permitindo que o barbeiro lance clientes de balcão/telefone direto no Schedule-X.
2. **Dono que Trabalha ("Também atendo clientes" ON/OFF):** Índice único parcial `UNIQUE (loja_id, user_id) WHERE user_id IS NOT NULL` em `profissionais`. Desativar a chave apenas marca `ativo = false` (sem `DELETE`), preservando todo o histórico financeiro.
3. **Auto-Vínculo de Funcionário (Antes ou Depois de Ter Conta):** Dupla trigger (`AFTER INSERT ON auth.users` + `BEFORE INSERT/UPDATE ON profissionais`) vincula `profissionais.user_id` pelo `email_convite` mesmo que o barbeiro já tivesse entrado no Zelo antes como cliente.
4. **Horários da Loja vs. Profissional + Feriados:** `lojas` guarda `horarios_loja (JSONB)`, `whatsapp_loja`, `endereco_texto` e `maps_url`; `bloqueios_agenda` aceita `profissional_id NULL` para fechar a loja inteira em feriados.
5. **Trava de Antecedência no Cancelamento pelo Cliente:** Cliente não tem `UPDATE` livre via RLS em `agendamentos`; usa a RPC `cancelar_ou_remarcar_agendamento` (`SECURITY DEFINER`) que valida no Postgres se ainda está dentro do prazo `antecedencia_cancel_min` configurado pelo dono.
6. **Programa de Indicação ("1 Mês Grátis"):** Colunas `codigo_indicacao`, `indicado_por_loja_id` e `bonus_indicacao_pago` em `lojas` para dar +30 dias automáticos no 1º pagamento confirmado no Asaas.
7. **Métricas do Super Admin:** `ultimo_acesso_painel_em`, `primeiro_agendamento_em`, `taxa_asaas_centavos` em `lojas` + `metricas_diarias_sistema` para monitorar cota de e-mails Resend e uso do banco/Storage.


---

## 9. Operação Real de Balcão (Encaixe 3s + Adiantar) & Dashboard de Ganhos/Comissão

### 9.1. Encaixe Informal Ultra-Rápido ("Seu Zé") & Serviço Definido no Fim
- **Problema real:** Nem todo cliente usa app, e quando alguém senta na cadeira o barbeiro não sabe ainda se ele vai fazer só cabelo ou cabelo + barba + sobrancelha.
- **Solução no Painel e no Banco:**
  - Quando `origem = 'manual'`, a `CHECK` constraint exige **apenas `cliente_nome` (mín. 2 letras) e `inicio`/`fim`**. `cliente_id`, `cliente_whatsapp` e `agendamento_servicos` ficam `NULL`/vazios na criação (`total_centavos = 0`).
  - Ao clicar em **"Concluir Corte"**, abre um seletor rápido de 1 toque com os serviços da loja (ou valor livre), gravando o serviço e o valor real antes de mudar `status = 'concluido'`.

### 9.2. Botão "Adiantar / Passar na Frente" + Aviso ao Cliente Adiado
- **Problema real:** O cliente das 14:00 atrasou 10 min e o das 14:30 (ou um encaixe manual) já está esperando.
- **Solução no Banco (`DEFERRABLE INITIALLY IMMEDIATE`):**
  - A trava `EXCLUDE USING gist` é declarada como `DEFERRABLE INITIALLY IMMEDIATE`. Nas reservas online ela bloqueia colisões no mesmo milissegundo; já na `RPC reordenar_ou_adiantar_agendamento` (usada pelo barbeiro), executamos `SET CONSTRAINTS ... DEFERRED` para inverter os horários de `A` e `B` (ou empurrar `+15/+30 min`) dentro da mesma transação sem dar falso erro `23P01`.
  - **Aviso automático:** Dispara **Web Push PWA gratuito** na hora para o cliente que teve o horário adiado (*"Seu horário hoje passou das 14:00 para 14:30"*) + exibe botão de 1 toque para avisar no WhatsApp (caso tenha telefone).

### 9.3. Dashboard Financeiro do `/painel` (Visão do Dono vs. Visão do Barbeiro)
- **Snapshot Financeiro Imutável:** Em `profissionais`, existe `comissao_percentual NUMERIC(5,2)` (ex.: `50.00` p/ barbeiro e `100.00` p/ dono). Ao marcar um agendamento como `'concluido'`, uma trigger congela em `agendamentos`: `comissao_percentual_aplicada`, `comissao_barbeiro_centavos` e `lucro_loja_centavos`. Assim, se a `%` mudar no mês seguinte, o histórico antigo nunca é distorcido!
- **Para o Barbeiro ("Meu Bolso"):**
  - Vê quanto já ganhou líquido **Hoje | Semana | Mês** (`SUM(comissao_barbeiro_centavos)`) + **Previsão até o fim do dia** (soma dos horários ainda confirmados hoje) + total de cortes feitos. Isso motiva o próprio barbeiro a lançar 100% dos cortes e encaixes no sistema!
- **Para o Dono ("Caixa da Casa + Fechamento de Sábado"):**
  - **3 Números Limpos:** Faturamento Bruto Total, Total de Comissões da Equipe e Lucro Líquido da Casa.
  - **Fechamento de Comissão da Equipe:** Lista cada profissional com nº de cortes concluídos no período, `%` de comissão e valor exato a pagar + botão de 1 toque para mandar o extrato do fechamento no WhatsApp do barbeiro.


---

## 10. Testes Teóricos de Estresse (Rodada 1 — 3 Cenários Reais)

1. **Teste 1 — Durações diferentes ao adiantar / cliente pediu "+ Barba" no meio do corte:**
   - *Gap encontrado:* A trava GiST barrava se um cliente de 1h entrasse no lugar de 30m ou esticasse o corte colidindo com o próximo.
   - *Blindagem adicionada:* `RPC reordenar_ou_esticar_agendamento` com `SET CONSTRAINTS ... DEFERRED` faz **Reencaixe Sequencial / Efeito Dominó** (calcula e empurra os próximos clientes do turno que colidirem, mostrando na tela para confirmar + disparar Web Push / botão 1-clique WhatsApp) + opção exclusiva do balcão `encaixe_forcado_balcao` (nunca liberada para cliente online).
2. **Teste 2 — Barbeiro sai da loja (demissão/saída) tendo agendamentos futuros:**
   - *Gap encontrado:* Apenas setar `ativo = false` não revogava o acesso RLS imediato nem tratava os clientes marcados com ele na semana seguinte.
   - *Blindagem adicionada:* RLS de funcionário exige `ativo = true`; `RPC desligar_profissional` move `user_id` para `ex_user_id_historico`, limpa `user_id = NULL` + apaga `push_subscriptions` (corte imediato mantendo histórico de comissões) e abre assistente obrigatório de 1 clique (**Transferir agenda livre para outro barbeiro/Dono** ou **Cancelar futuros + avisar clientes via Push/Zap**).
3. **Teste 3 — Cliente troll travando horários da sexta + Dono no Plano Solo tentando cadastrar 2º barbeiro:**
   - *Gap encontrado:* Faltava trava dura no banco para ambos.
   - *Blindagem adicionada:* (A) `lojas.max_reservas_ativas_por_cliente` (padrão `2` futuros por conta/WhatsApp na loja) + flag `clientes_loja.bloqueado_online` para barrar faltosos reincidentes; (B) Trigger `trg_enforce_limite_plano_profissionais` no Postgres bloqueando `> 1` profissional ativo no Plano Solo (`<= 5` no Equipe), transformando na UI em gatilho natural de upgrade.
4. **Teste 4 (Extra) — Dono gerenciando toda a equipe + Reagendamento com horários vagos e Auto-Expiração:**
   - **Dono Soberano (`owner_id`):** RLS garante que o Dono lê, cria, move (inclusive entre profissionais da mesma `loja_id`, blindado por FK composta `(profissional_id, loja_id)`) e conclui a agenda de qualquer funcionário; funcionário ativo (`ativo = true`) acessa apenas sua própria coluna.
   - **Se não couber hoje / Reagendamento dentro do App + Auto-Expiração:** Quando um cliente precisa ir para outro dia/horário, o próprio painel já abre os **horários realmente vagos** (sem ficar chutando na mão) ou permite cancelar na hora. O aviso (Web Push/E-mail) envia um link direto (`/[slug]?remarcar=...`) onde o cliente vê os **horários vagos no app** (aceitar, escolher outro vago ou cancelar). Cada proposta recebe `confirmacao_expira_em = LEAST(now() + 20m, inicio - 15m)`: se passar o prazo sem resposta, `Lazy Expire` na leitura/reserva + `pg_cron` a cada 5 min mudam o status para `'expirado'` e devolvem a vaga para a vitrine automaticamente.


---

## 11. Testes Teóricos de Estresse (Rodada 2 — 10 Cenários Reais)

| # | Cenário Real Testado | Status Antes | Blindagem Aplicada (Banco / Infra / UX) |
| :- | :--- | :--- | :--- |
| **1** | **Dono altera preço/duração ou apaga serviço já agendado** | Parcial | `agendamento_servicos` ganha `servico_id ON DELETE SET NULL` + `nome_servico_no_momento`, preservando 100% reservas futuras e histórico mesmo se o serviço mudar ou for excluído. |
| **2** | **Bloquear folga/feriado em cima de clientes já marcados** | **Não/Parcial** | `RPC criar_bloqueio_agenda` detecta conflitos antes de salvar e exibe **1 clique**: *Solicitar reagendamento aos N clientes* (Web Push + link com vagas) ou *Transferir p/ outro barbeiro*. |
| **3** | **Fuso horário (Manaus/Acre e virada das 21h–00h BRT/UTC)** | **Não passava** | `lojas.timezone` (padrão `America/Sao_Paulo`, 9 fusos BR) soberano em toda RPC (`AT TIME ZONE lojas.timezone`) e no `Intl.DateTimeFormat` do navegador. |
| **4A** | **Sinal PIX da loja vs. confirmação imediata** | Parcial | 2 modos na loja: *Padrão (confirma na hora, PIX opcional)* ou *Exigir sinal PIX (nasce `pendente` com timer 15m de Lazy Expire + botão "Já paguei")*. |
| **4B** | **Assinatura Asaas vence sábado e dono paga PIX domingo** | Parcial | Webhook `/api/webhooks/asaas` chama `revalidateTag` (`loja-slug` + `vitrine-explorar`) na hora e RPC valida `status_assinatura` em tempo real (`<1s` p/ pausar e `<1s` p/ voltar). |
| **5** | **Dono com 2 lojas ou barbeiro em 2 lojas com mesmo Google** | Parcial | **Loja Switcher** no `/painel` (`loja_id` explícito em toda query) + trava anti-conflito **cross-store** na RPC checando todos os `profissional_id` ligados ao mesmo `user_id`. |
| **6** | **Estouro da cota Resend (100/dia) num sábado lotado (`429`)** | Parcial | Envio de e-mail 100% isolado em `try/catch` pós-commit (`429` **jamais** derruba reserva); se usuário tem Web Push, **não gasta e-mail**; aos 80/100 e-mails entra em Modo Economia Crítica + fallback visual pro WhatsApp. |
| **7** | **Pai agendando pro filho/amigo ou trocando WhatsApp** | Parcial | No resumo final, botão discreto *"Alterar / É para outra pessoa"* grava o nome atendido em `agendamentos.cliente_nome` (mantendo `cliente_id` do pai) e permite atualizar o WhatsApp padrão. |
| **8** | **Desconto/cortesia na maquininha ou desistiu da barba na cadeira** | Parcial | Bottom Sheet "Concluir" traz chips desmarcáveis dos serviços + pílulas `-R$ 5 / -R$ 10 / Cortesia` salvando `valor_final_centavos` e `desconto_centavos`, calculando comissão sobre o valor realmente cobrado. |
| **9** | **Brecha de remarcar pro mês que vem e cancelar em seguida** | **Não passava** | `RPC cancelar_ou_remarcar_agendamento` exige `antecedencia_cancel_min` tanto para cancelar **quanto para remarcar**, com teto máximo de **2 remarcações** (`remarcacoes_count <= 2`). |
| **10** | **Slugs reservados (`/painel`, `/api`) & mudança de slug no Insta** | **Não passava** | `CHECK` constraint bloqueia rotas do sistema; tabela `lojas_slugs_historico` impede roubo de slug antigo e retorna HTTP `308 Permanent Redirect` cacheado via ISR (`0` queries extras). |

---

## 12. Simplificação PIX (Só Balcão) & Tabela `agenda_excecoes` (Dias da Semana + Dia Especial Temporário)
- **Zero Sinal/Pagamento Online no MVP:** Removida toda complexidade de sinal PIX obrigatório / status `'pendente'`. Todo agendamento online já nasce `'confirmado'`. Se a loja cadastrou `chave_pix`, o cliente vê o **QR Code PIX estático + botão Copia e Cola** (gerados localmente no navegador a R$ 0) para facilitar o pagamento presencial na loja. *(Asaas segue exclusivo para a assinatura mensal do lojista com o Zelo).*
- **Expediente Semanal + Abertura Especial Temporária (`agenda_excecoes`):**
  - **Rotina Semanal (`horarios_loja` e `horarios_semana`):** Pílulas rápidas (`D S T Q Q S S`) + atalho "Aplicar aos dias ativos" + personalização por dia específico (ex.: Sábado mais cedo) + pausa/almoço.
  - **Tabela `agenda_excecoes`:** Suporta `'fechado_dia_todo'` (feriado/folga), `'bloqueio_horas'` (consulta/pausa pontual) e **`'aberto_especial'`** (abre uma data fechada na semana — como um **Domingo específico** das 09h às 14h — ou estende o expediente de Natal só naquela data, voltando ao normal automaticamente na semana seguinte).
  - **Ordem de Precedência:** Exceção do Profissional → Exceção da Loja (`profissional_id NULL`) → Rotina Semanal (interseção Profissional × Loja) → Subtração de bloqueios de horas e agendamentos.
- **Esquecimento de Baixa (`fim < now()` e `status = 'confirmado'`):**
  - Nunca auto-concluímos cegamente (para evitar comissão falsa em faltas ou valor errado).
  - Não trava o cliente (`max_reservas_ativas` filtra `inicio > now()`) nem colide na agenda GiST.
  - No `/painel`, horários já passados ficam destacados numa barra **"Pendentes de Baixa"** com botões diretos `[Feito]` / `[Faltou]` e **`[Confirmar todos em 1 toque]`** (`RPC concluir_agendamentos_em_lote`, que conclui os que já têm valor e separa apenas encaixes `R$ 0` pendentes de escolha de serviço). O Dono também pode dar baixa pelos funcionários no fechamento da semana.

---

## 13. Tela Dedicada de Configurações & Meu Perfil (Todos os Papéis)
- **Cliente Final (`/conta` ou aba Perfil):** Trocar foto de perfil (`WebP <= 40 KB` ou restaurar foto do Google), editar WhatsApp com DDD, toggles de **Web Push** e **E-mail**, links Termos/Privacidade, **Sair (Logout)** e **Excluir conta (LGPD)**.
- **Profissional / Funcionário (`/painel/configuracoes`):** Foto própria, apelido/especialidade exibidos na vitrine, WhatsApp, Push, tema **Claro/Escuro** do painel, visualização da `% de comissão` (read-only), Sair da loja / Logout.
- **Dono da Loja (`/painel/configuracoes` organizado em seções):** Perfil pessoal + Dados da loja (Nome, Nicho, Slug com histórico 308, Endereço/Maps, Fuso BR) + Regras (Antecedência cancel/remarcar, Máx. reservas ativas, Chave PIX) + **Modo Férias / Pausar Loja** temporariamente + Sair / LGPD.
